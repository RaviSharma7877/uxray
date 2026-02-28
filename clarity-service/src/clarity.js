const axios = require('axios');
const https = require('https');
const api = require('./api');
const config = require('./config');

// Create axios instance with SSL certificate handling
const axiosInstance = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false,
    }),
    timeout: 30000,
});

/**
 * Validates and normalizes project ID
 */
function normalizeProjectId(projectId) {
    if (!projectId) {
        return null;
    }
    return projectId.trim();
}

/**
 * Fetches data from Microsoft Clarity Data Export API
 * Documentation: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-api
 */
async function fetchClarityData(apiKey, projectId, siteUrl, lookbackDays = 1) {
    const insights = {
        topIssues: [],
        heatmaps: [],
        standoutSessions: [],
        trafficSources: [],
        browsers: [],
        devices: [],
        operatingSystems: [],
        countries: [],
        pageTitles: [],
        performanceMetrics: {},
        diagnosticEvents: [],
        pageEvents: {},
        customEvents: [],
    };

    const normalizedProjectId = normalizeProjectId(projectId);
    if (!normalizedProjectId) {
        throw new Error('Invalid project ID: project ID is required');
    }

    try {
        // Microsoft Clarity Data Export API endpoint
        const baseUrl = config.clarity.apiBaseUrl;
        const apiUrl = `${baseUrl}/project-live-insights`;
        
        // Ensure lookbackDays is 1, 2, or 3 (API limitation)
        const numOfDays = Math.min(Math.max(1, lookbackDays), 3);
        
        // Build query parameters
        const params = new URLSearchParams({
            numOfDays: numOfDays.toString(),
        });
        
        // Add dimensions for detailed breakdown
        params.append('dimension1', 'URL');
        params.append('dimension2', 'Device');
        params.append('dimension3', 'Country');
        
        const fullUrl = `${apiUrl}?${params.toString()}`;
        
        console.log(`[Clarity] Fetching data from: ${fullUrl}`);
        console.log(`[Clarity] Using numOfDays: ${numOfDays}`);
        
        const response = await axiosInstance.get(fullUrl, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
            },
        });

        const data = response.data;

        console.log(`[Clarity] API Response Status: ${response.status}`);
        console.log(`[Clarity] API Response Type:`, Array.isArray(data) ? 'Array' : typeof data);
        console.log(`[Clarity] API Response Length:`, Array.isArray(data) ? data.length : 'N/A');
        
        // The Clarity API returns an array of metric objects
        // Each object has: { metricName: "SessionsCount", information: [...] }
        if (Array.isArray(data)) {
            console.log(`[Clarity] Processing ${data.length} metric objects from Clarity API`);
            
            // Process each metric type
            data.forEach(metricObj => {
                const metricName = metricObj.metricName;
                const information = metricObj.information || [];
                
                console.log(`[Clarity] Processing metric: ${metricName} with ${information.length} items`);
                
                // Process based on metric type
                if (metricName === 'SessionsCount') {
                    // Aggregate total sessions and extract dimensional data
                    information.forEach(item => {
                        const sessions = parseInt(item.sessionsCount, 10) || 0;
                        insights.totalSessions = (insights.totalSessions || 0) + sessions;
                        
                        // Extract URL data for heatmaps
                        if (item.Url && insights.heatmaps.length < config.clarity.topEntries) {
                            const existingUrl = insights.heatmaps.find(h => h.pageUrl === item.Url);
                            if (!existingUrl) {
                                insights.heatmaps.push({
                                    pageUrl: item.Url,
                                    views: sessions,
                                    clickRate: null,
                                    scrollDepth: null,
                                    engagementTime: null,
                                });
                            } else {
                                existingUrl.views += sessions;
                            }
                        }
                        
                        // Extract Device data
                        if (item.Device) {
                            const existingDevice = insights.devices.find(d => d.type === item.Device);
                            if (!existingDevice) {
                                insights.devices.push({
                                    type: item.Device,
                                    sessionsCount: sessions,
                                    percentage: 0,
                                });
                            } else {
                                existingDevice.sessionsCount += sessions;
                            }
                        }
                        
                        // Extract Country data
                        if (item.Country) {
                            const existingCountry = insights.countries.find(c => c.name === item.Country);
                            if (!existingCountry) {
                                insights.countries.push({
                                    name: item.Country,
                                    sessionsCount: sessions,
                                    percentage: 0,
                                });
                            } else {
                                existingCountry.sessionsCount += sessions;
                            }
                        }
                    });
                } else if (metricName === 'DeadClickCount') {
                    // Aggregate dead clicks
                    information.forEach(item => {
                        const count = parseInt(item.subTotal, 10) || 0;
                        insights.deadClicks = (insights.deadClicks || 0) + count;
                    });
                } else if (metricName === 'RageClickCount') {
                    // Aggregate rage clicks
                    information.forEach(item => {
                        const count = parseInt(item.subTotal, 10) || 0;
                        insights.rageClicks = (insights.rageClicks || 0) + count;
                    });
                } else if (metricName === 'QuickBackCount') {
                    // Aggregate quick backs
                    information.forEach(item => {
                        const count = parseInt(item.subTotal, 10) || 0;
                        insights.quickBacks = (insights.quickBacks || 0) + count;
                    });
                }
            });
            
            // Calculate percentages for devices and countries
            if (insights.totalSessions > 0) {
                insights.devices.forEach(device => {
                    device.percentage = (device.sessionsCount / insights.totalSessions) * 100;
                });
                insights.countries.forEach(country => {
                    country.percentage = (country.sessionsCount / insights.totalSessions) * 100;
                });
            }
            
            // Sort heatmaps by views (descending)
            insights.heatmaps.sort((a, b) => b.views - a.views);
            
            // Limit to top entries
            insights.heatmaps = insights.heatmaps.slice(0, config.clarity.topEntries);
            
        } else if (data && typeof data === 'object') {
            // Fallback for other response formats
            console.log(`[Clarity] Processing object response (fallback)`);
            
            // Check for error responses
            if (data.error || (data.message && !data.metrics)) {
                console.error(`[Clarity] API returned an error:`, data.error || data.message);
                throw new Error(`Clarity API error: ${data.error || data.message}`);
            }

            // Try to extract metrics if available
            if (data.metrics && Array.isArray(data.metrics)) {
                data.metrics.forEach(metric => {
                    const metricName = metric.metricName;
                    const metricValue = metric.metricValue;
                    
                    switch (metricName) {
                        case 'TotalSessions':
                            insights.totalSessions = parseInt(metricValue, 10) || null;
                            break;
                        case 'ActiveUsers':
                        case 'UniqueUsers':
                            insights.activeUsers = parseInt(metricValue, 10) || null;
                            break;
                        case 'AverageEngagementTime':
                            insights.averageEngagementSeconds = parseFloat(metricValue) || null;
                            break;
                        case 'AverageScrollDepth':
                            insights.averageScrollDepth = (parseFloat(metricValue) / 100) || null;
                            break;
                        case 'RageClicks':
                            insights.rageClicks = parseInt(metricValue, 10) || null;
                            break;
                        case 'DeadClicks':
                            insights.deadClicks = parseInt(metricValue, 10) || null;
                            break;
                        case 'QuickBacks':
                            insights.quickBacks = parseInt(metricValue, 10) || null;
                            break;
                    }
                });
            }
        }

        insights.totalRecordings = null;
        insights.standoutSessions = [];

    } catch (error) {
        console.error('[Clarity] Error fetching data:', error.message);
        if (error.response) {
            console.error('[Clarity] Response status:', error.response.status);
            console.error('[Clarity] Response data:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }

    console.log(`[Clarity] Extracted insights:`, {
        totalSessions: insights.totalSessions,
        activeUsers: insights.activeUsers,
        averageEngagementSeconds: insights.averageEngagementSeconds,
        averageScrollDepth: insights.averageScrollDepth,
        rageClicks: insights.rageClicks,
        deadClicks: insights.deadClicks,
        quickBacks: insights.quickBacks,
        heatmapsCount: insights.heatmaps?.length || 0,
        devicesCount: insights.devices?.length || 0,
        countriesCount: insights.countries?.length || 0,
    });

    return insights;
}

/**
 * Processes a Clarity analytics job
 */
async function processClarityJob(jobDetails) {
    const { jobId, apiKey, projectId, siteUrl, lookbackDays } = jobDetails;

    if (!jobId || !apiKey || !projectId) {
        console.error('[Clarity] Missing required job details:', { 
            hasJobId: !!jobId, 
            hasApiKey: !!apiKey, 
            hasProjectId: !!projectId
        });
        return;
    }

    const normalizedProjectId = normalizeProjectId(projectId);
    console.log(`[Clarity] Processing job ${jobId} for project ${normalizedProjectId}`);

    try {
        const clarityData = await fetchClarityData(
            apiKey,
            normalizedProjectId,
            siteUrl,
            lookbackDays || 1
        );

        console.log(`[Clarity] Data fetched for job ${jobId}`);

        await api.updateJobWithClarity(jobId, clarityData);
        console.log(`[Clarity] Successfully updated job ${jobId} with Clarity data`);
    } catch (error) {
        console.error(`[Clarity] Error processing job ${jobId}:`, error.message);
    }
}

module.exports = { processClarityJob };
