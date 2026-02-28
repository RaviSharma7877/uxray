const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { OAuth2Client } = require('google-auth-library');
const fetch = require('node-fetch'); // npm i node-fetch if not already
const api = require('./api');
const config = require('./config');

/**
 * Utility: run a GA4 report safely and return rows (or [])
 */
async function runSafeReport(analyticsClient, request) {
  const [res] = await analyticsClient.runReport(request);
  return res?.rows ?? [];
}

/**
 * Utility: convert GA rows to [{ dim: {...}, met: {...} }]
 * Uses header names to map metric/dimension values.
 */
function normalizeRows(rows, dimensionHeaders, metricHeaders) {
  return rows.map((r) => {
    const dim = {};
    const met = {};
    dimensionHeaders.forEach((d, i) => (dim[d.name] = r.dimensionValues[i]?.value ?? ''));
    metricHeaders.forEach((m, i) => (met[m.name] = r.metricValues[i]?.value ?? '0'));
    return { dim, met };
  });
}

/**
 * Fetch Core Web Vitals via PageSpeed Insights (CrUX field data).
 * Returns { url, lcp_ms, cls, inp_ms } for each URL.
 */
async function getCoreWebVitalsFromPSI(urls, strategy = 'DESKTOP') {
  const out = [];
  for (const url of urls) {
    try {
      const qs = new URLSearchParams({
        url,
        key: config.pagespeed.apiKey,
        strategy,
        category: 'PERFORMANCE',
      });
      const resp = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${qs.toString()}`);
      const data = await resp.json();

      const loadingExp = data?.loadingExperience?.metrics || data?.originLoadingExperience?.metrics || {};
      // Use percentiles if present
      const lcp = loadingExp.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null;
      const inp = loadingExp.INTERACTION_TO_NEXT_PAINT?.percentile ?? null;
      const cls = loadingExp.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile ?? null;

      out.push({
        url,
        lcpMs: lcp,
        inpMs: inp,
        cls, // note: CLS is unitless; PSI sometimes returns *100 for percentiles
        error: null,
      });
    } catch (e) {
      out.push({ url, lcpMs: null, inpMs: null, cls: null, error: String(e) });
    }
  }
  return out;
}

/**
 * Processes a GA4 analytics job by querying Google Analytics Data API and updating backend.
 *
 * @param {Object} jobDetails - The job details received from RabbitMQ
 * @param {string} jobDetails.jobId - The unique job ID
 * @param {string} jobDetails.propertyId - The GA4 property ID (e.g., "123456789")
 * @param {string} jobDetails.refreshToken - The user's Google OAuth2 refresh token
 */
async function processAnalyticsJob(jobDetails) {
  const { jobId, propertyId, refreshToken } = jobDetails;

  if (!jobId || !propertyId || !refreshToken) {
    console.error('[GA4] Missing required job details:', jobDetails);
    return;
  }

  console.log(`[GA4] Processing job ${jobId} for property ${propertyId}`);

  let analyticsClient;
  try {
    // 1) OAuth client
    const oAuth2Client = new OAuth2Client(
      config.google.clientId,
      config.google.clientSecret
    );
    oAuth2Client.setCredentials({ refresh_token: refreshToken });

    // 2) GA4 Data API client
    analyticsClient = new BetaAnalyticsDataClient({ auth: oAuth2Client });

    // ---------- A) Total Users and Basic Metrics ----------
    const [totalsRes] = await analyticsClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'averageSessionDuration' },
        { name: 'engagementRate' }
      ],
    });

    const totalsRows = totalsRes.rows ?? [];
    const mH_Totals = totalsRes.metricHeaders ?? [];
    let totalUsers = 0;
    let newUsers = 0;
    let sessions = 0;
    let engagedSessions = 0;
    let averageSessionDuration = null;
    let engagementRate = null;

    if (totalsRows.length > 0) {
      const metrics = totalsRows[0].metricValues ?? [];
      totalUsers = parseInt(metrics[mH_Totals.findIndex(m => m.name === 'totalUsers')]?.value ?? '0', 10);
      newUsers = parseInt(metrics[mH_Totals.findIndex(m => m.name === 'newUsers')]?.value ?? '0', 10);
      sessions = parseInt(metrics[mH_Totals.findIndex(m => m.name === 'sessions')]?.value ?? '0', 10);
      engagedSessions = parseInt(metrics[mH_Totals.findIndex(m => m.name === 'engagedSessions')]?.value ?? '0', 10);
      const avgDurStr = metrics[mH_Totals.findIndex(m => m.name === 'averageSessionDuration')]?.value;
      averageSessionDuration = avgDurStr ? parseFloat(avgDurStr) : null;
      const engRateStr = metrics[mH_Totals.findIndex(m => m.name === 'engagementRate')]?.value;
      engagementRate = engRateStr ? parseFloat(engRateStr) : null;
    }

    // ---------- B) Top Pages ----------
    const [topPagesRes] = await analyticsClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }, { name: 'averageSessionDuration' }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 5,
    });

    const topPagesRows = topPagesRes.rows ?? [];
    const mH_TP = topPagesRes.metricHeaders ?? [];

    const topPages = topPagesRows.map((row) => ({
      pagePath: row.dimensionValues[0]?.value ?? '',
      pageTitle: row.dimensionValues[1]?.value ?? null,
      views: parseInt(row.metricValues[mH_TP.findIndex(m => m.name === 'screenPageViews')]?.value ?? '0', 10),
      users: parseInt(row.metricValues[mH_TP.findIndex(m => m.name === 'totalUsers')]?.value ?? '0', 10),
      avgEngagementTime: (() => {
        const val = row.metricValues[mH_TP.findIndex(m => m.name === 'averageSessionDuration')]?.value;
        return val ? parseFloat(val) : null;
      })(),
    }));

    // ---------- C) Top Events ----------
    // eventName with eventCount (exclude the flood of page_view if you wish)
    const [eventsRes] = await analyticsClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 10,
      // Optional: exclude 'page_view' & 'user_engagement'
      // dimensionFilter: {
      //   notExpression: {
      //     filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'page_view' } }
      //   }
      // }
    });
    const topEvents = (eventsRes.rows ?? []).map(r => ({
      eventName: r.dimensionValues[0]?.value ?? '',
      eventCount: parseInt(r.metricValues[0]?.value ?? '0', 10),
    }));

    // ---------- D) Acquisition Channels ----------
    // sessionDefaultChannelGroup with sessions
    const [acqRes] = await analyticsClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    });
    const acquisitionChannels = (acqRes.rows ?? []).map(r => ({
      channel: r.dimensionValues[0]?.value ?? '',
      sessions: parseInt(r.metricValues[0]?.value ?? '0', 10),
      activeUsers: parseInt(r.metricValues[1]?.value ?? '0', 10),
    }));

    // ---------- E) Device Technology ----------
    // deviceCategory, operatingSystem, browser with sessions
    const [deviceRes] = await analyticsClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'deviceCategory' }, { name: 'operatingSystem' }, { name: 'browser' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 25,
    });
    const deviceTechnology = (deviceRes.rows ?? []).map(r => ({
      deviceCategory: r.dimensionValues[0]?.value ?? '',
      operatingSystem: r.dimensionValues[1]?.value ?? '',
      browser: r.dimensionValues[2]?.value ?? '',
      sessions: parseInt(r.metricValues[0]?.value ?? '0', 10),
      activeUsers: parseInt(r.metricValues[1]?.value ?? '0', 10),
    }));

    // ---------- F) Demographics ----------
    // country, city, language with activeUsers
    const [demoRes] = await analyticsClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'country' }, { name: 'city' }, { name: 'language' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 25,
    });
    const demographics = (demoRes.rows ?? []).map(r => ({
      country: r.dimensionValues[0]?.value ?? '',
      city: r.dimensionValues[1]?.value ?? '',
      language: r.dimensionValues[2]?.value ?? '',
      activeUsers: parseInt(r.metricValues[0]?.value ?? '0', 10),
    }));

    // ---------- G) Core Web Vitals (PageSpeed/CrUX) ----------
    // Choose the key URLs you care about (home + top pages)
    const urlsForCwv = [
      ...(config.pagespeed.urls || []),
      // auto-add top 3 pagePaths if you want to test exact URLs:
      ...topPages.slice(0, 3).map(tp => (tp.pagePath?.startsWith('http') ? tp.pagePath : `${config.siteBaseUrl}${tp.pagePath}`)),
    ].filter(Boolean);

    const coreWebVitals = await getCoreWebVitalsFromPSI(urlsForCwv, 'DESKTOP');

    // ---------- Build final payload ----------
    const analyticsData = {
      totalUsers,
      newUsers,
      sessions,
      engagedSessions,
      averageSessionDuration,
      engagementRate,
      topPages,
      topEvents,
      acquisitionChannels,
      deviceTechnology,
      demographics,
      coreWebVitals,
    };

    console.log(`[GA4] Analytics fetched for job ${jobId}:`, {
      ...analyticsData,
      coreWebVitals: `[${coreWebVitals.length} entries]`,
    });

    // ---------- Send to backend ----------
    await api.updateJobWithAnalytics(jobId, analyticsData);
  } catch (error) {
    console.error(`[GA4] Error processing job ${jobId}:`, error);
  } finally {
    // Close GA4 client
    try { if (analyticsClient?.close) await analyticsClient.close(); } catch {}
  }
}

module.exports = { processAnalyticsJob };
