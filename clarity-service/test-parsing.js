// Mock test to verify the parsing logic works correctly
const mockApiResponse = [
  {
    dimension1: "https://example.com/page1",
    dimension2: "Desktop",
    dimension3: "United States",
    sessions: 150,
    activeUsers: 120,
    avgEngagementTime: 45.5,
    avgScrollDepth: 75,
    rageClicks: 5,
    deadClicks: 3,
    quickBacks: 2
  },
  {
    dimension1: "https://example.com/page2",
    dimension2: "Mobile",
    dimension3: "Canada",
    sessions: 80,
    activeUsers: 65,
    avgEngagementTime: 30.2,
    avgScrollDepth: 60,
    rageClicks: 2,
    deadClicks: 1,
    quickBacks: 1
  },
  {
    dimension1: "https://example.com/page1",
    dimension2: "Mobile",
    dimension3: "United Kingdom",
    sessions: 100,
    activeUsers: 85,
    avgEngagementTime: 50.0,
    avgScrollDepth: 80,
    rageClicks: 3,
    deadClicks: 2,
    quickBacks: 0
  }
];

const config = {
  clarity: {
    topEntries: 10
  }
};

// Simulate the parsing logic
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

const data = mockApiResponse;

if (Array.isArray(data)) {
  console.log(`Processing array response with ${data.length} items`);
  
  data.forEach(item => {
    // Extract dimensional values
    if (item.dimension1) { // URL
      const existingUrl = insights.heatmaps.find(h => h.pageUrl === item.dimension1);
      if (!existingUrl && insights.heatmaps.length < config.clarity.topEntries) {
        insights.heatmaps.push({
          pageUrl: item.dimension1,
          views: parseInt(item.sessions, 10) || 0,
          clickRate: null,
          scrollDepth: null,
          engagementTime: parseFloat(item.avgEngagementTime) || null,
        });
      } else if (existingUrl) {
        existingUrl.views += parseInt(item.sessions, 10) || 0;
      }
    }
    
    if (item.dimension2) { // Device
      const existingDevice = insights.devices.find(d => d.type === item.dimension2);
      if (!existingDevice) {
        insights.devices.push({
          type: item.dimension2,
          sessionsCount: parseInt(item.sessions, 10) || 0,
          percentage: 0,
        });
      } else {
        existingDevice.sessionsCount += parseInt(item.sessions, 10) || 0;
      }
    }
    
    if (item.dimension3) { // Country
      const existingCountry = insights.countries.find(c => c.name === item.dimension3);
      if (!existingCountry) {
        insights.countries.push({
          name: item.dimension3,
          sessionsCount: parseInt(item.sessions, 10) || 0,
          percentage: 0,
        });
      } else {
        existingCountry.sessionsCount += parseInt(item.sessions, 10) || 0;
      }
    }
    
    // Aggregate metrics
    if (item.sessions) {
      insights.totalSessions = (insights.totalSessions || 0) + (parseInt(item.sessions, 10) || 0);
    }
    if (item.activeUsers) {
      insights.activeUsers = (insights.activeUsers || 0) + (parseInt(item.activeUsers, 10) || 0);
    }
    if (item.avgEngagementTime) {
      const engTime = parseFloat(item.avgEngagementTime) || 0;
      if (!insights.averageEngagementSeconds) {
        insights.averageEngagementSeconds = engTime;
      } else {
        insights.averageEngagementSeconds = (insights.averageEngagementSeconds + engTime) / 2;
      }
    }
    if (item.avgScrollDepth !== undefined) {
      const scrollDepth = parseFloat(item.avgScrollDepth) || 0;
      if (!insights.averageScrollDepth) {
        insights.averageScrollDepth = scrollDepth / 100;
      } else {
        insights.averageScrollDepth = ((insights.averageScrollDepth * 100 + scrollDepth) / 2) / 100;
      }
    }
    if (item.rageClicks) {
      insights.rageClicks = (insights.rageClicks || 0) + (parseInt(item.rageClicks, 10) || 0);
    }
    if (item.deadClicks) {
      insights.deadClicks = (insights.deadClicks || 0) + (parseInt(item.deadClicks, 10) || 0);
    }
    if (item.quickBacks) {
      insights.quickBacks = (insights.quickBacks || 0) + (parseInt(item.quickBacks, 10) || 0);
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
}

console.log('\n=== Extracted Insights ===');
console.log(JSON.stringify({
  totalSessions: insights.totalSessions,
  activeUsers: insights.activeUsers,
  averageEngagementSeconds: insights.averageEngagementSeconds,
  averageScrollDepth: insights.averageScrollDepth,
  rageClicks: insights.rageClicks,
  deadClicks: insights.deadClicks,
  quickBacks: insights.quickBacks,
  heatmaps: insights.heatmaps,
  devices: insights.devices,
  countries: insights.countries,
}, null, 2));
