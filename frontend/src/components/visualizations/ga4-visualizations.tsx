"use client";

import React from 'react';
import { BarChart, type BarChartData } from './bar-chart';
import { LineChart, type LineChartSeries } from './line-chart';
import { PieChart, type PieChartData } from './pie-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Globe, Monitor, TrendingUp, Users } from 'lucide-react';

// GA4 data interfaces (matching the existing types from jobs page)
interface GA4Page {
  pagePath: string;
  pageTitle?: string;
  views: number;
  users?: number;
  avgEngagementTime?: number;
}

interface GA4TrafficSource {
  source: string;
  medium: string;
  sessions: number;
}

interface GA4Country {
  country: string;
  users: number;
}

interface GA4Event {
  eventName: string;
  eventCount: number;
}

interface GA4DeviceTechnology {
  deviceCategory: string;
  operatingSystem: string;
  browser: string;
  sessions: number;
  activeUsers: number;
}

interface GA4CoreWebVital {
  url: string;
  lcpMs?: number;
  inpMs?: number;
  cls?: number;
  error?: string | null;
}

interface GA4Results {
  totalUsers?: number;
  newUsers?: number;
  sessions?: number;
  engagedSessions?: number;
  averageSessionDuration?: number;
  engagementRate?: number;
  topPages?: GA4Page[];
  trafficSources?: GA4TrafficSource[];
  topCountries?: GA4Country[];
  topEvents?: GA4Event[];
  deviceTechnology?: GA4DeviceTechnology[];
  coreWebVitals?: GA4CoreWebVital[];
}

interface GA4VisualizationsProps {
  data: GA4Results;
}

export function GA4Visualizations({ data }: GA4VisualizationsProps) {
  // Prepare data for traffic sources chart
  const trafficSourceData: BarChartData[] = (data.trafficSources || [])
    .slice(0, 10)
    .map(source => ({
      label: `${source.source} / ${source.medium}`,
      value: source.sessions,
    }));

  // Prepare data for top pages chart
  const topPagesData: BarChartData[] = (data.topPages || [])
    .slice(0, 10)
    .map(page => ({
      label: page.pageTitle || page.pagePath,
      value: page.views,
    }));

  // Prepare data for countries pie chart
  const countriesData: PieChartData[] = (data.topCountries || [])
    .slice(0, 8)
    .map(country => ({
      label: country.country,
      value: country.users,
    }));

  // Prepare data for device distribution
  const deviceData: PieChartData[] = Array.from(
    (data.deviceTechnology || []).reduce((acc, tech) => {
      const existing = acc.get(tech.deviceCategory) || 0;
      acc.set(tech.deviceCategory, existing + tech.sessions);
      return acc;
    }, new Map<string, number>())
  ).map(([device, sessions]) => ({
    label: device,
    value: sessions,
  }));

  // Prepare data for browser distribution
  const browserData: BarChartData[] = Array.from(
    (data.deviceTechnology || []).reduce((acc, tech) => {
      const existing = acc.get(tech.browser) || 0;
      acc.set(tech.browser, existing + tech.sessions);
      return acc;
    }, new Map<string, number>())
  )
    .map(([browser, sessions]) => ({
      label: browser,
      value: sessions,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Prepare data for top events
  const eventsData: BarChartData[] = (data.topEvents || [])
    .slice(0, 10)
    .map(event => ({
      label: event.eventName,
      value: event.eventCount,
    }));

  // Core Web Vitals - prepare scatter plot data (simplified as bar chart for now)
  const cwvData: BarChartData[] = (data.coreWebVitals || [])
    .filter(cwv => cwv.lcpMs)
    .slice(0, 10)
    .map(cwv => ({
      label: cwv.url.split('/').pop() || cwv.url,
      value: cwv.lcpMs || 0,
    }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalUsers?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data.newUsers?.toLocaleString() || 0} new users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.sessions?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data.engagedSessions?.toLocaleString() || 0} engaged
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session Duration</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.averageSessionDuration ? `${Math.round(data.averageSessionDuration)}s` : '0s'}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.engagementRate ? `${(data.engagementRate * 100).toFixed(1)}%` : '0%'} engagement rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Country</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.topCountries?.[0]?.country || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.topCountries?.[0]?.users.toLocaleString() || 0} users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="traffic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="cwv">Core Web Vitals</TabsTrigger>
        </TabsList>

        <TabsContent value="traffic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
              <CardDescription>Top acquisition channels by sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {trafficSourceData.length > 0 ? (
                <BarChart
                  data={trafficSourceData}
                  height={400}
                  orientation="horizontal"
                  sortBy="value"
                  maxBars={10}
                />
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No traffic source data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Pages</CardTitle>
              <CardDescription>Most viewed pages by pageviews</CardDescription>
            </CardHeader>
            <CardContent>
              {topPagesData.length > 0 ? (
                <BarChart
                  data={topPagesData}
                  height={400}
                  orientation="horizontal"
                  sortBy="value"
                  maxBars={10}
                />
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No page data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Distribution</CardTitle>
              <CardDescription>Users by country</CardDescription>
            </CardHeader>
            <CardContent>
              {countriesData.length > 0 ? (
                <PieChart
                  data={countriesData}
                  height={400}
                  showLegend={true}
                />
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No geographic data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Device Categories</CardTitle>
                <CardDescription>Sessions by device type</CardDescription>
              </CardHeader>
              <CardContent>
                {deviceData.length > 0 ? (
                  <PieChart
                    data={deviceData}
                    height={300}
                    showLegend={true}
                    innerRadius={60}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No device data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Browser Distribution</CardTitle>
                <CardDescription>Sessions by browser</CardDescription>
              </CardHeader>
              <CardContent>
                {browserData.length > 0 ? (
                  <BarChart
                    data={browserData}
                    height={300}
                    sortBy="value"
                    maxBars={8}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No browser data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Events</CardTitle>
              <CardDescription>Most triggered events</CardDescription>
            </CardHeader>
            <CardContent>
              {eventsData.length > 0 ? (
                <BarChart
                  data={eventsData}
                  height={400}
                  orientation="horizontal"
                  sortBy="value"
                  maxBars={10}
                />
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No event data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cwv" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Core Web Vitals - LCP</CardTitle>
              <CardDescription>Largest Contentful Paint by page (ms)</CardDescription>
            </CardHeader>
            <CardContent>
              {cwvData.length > 0 ? (
                <BarChart
                  data={cwvData}
                  height={400}
                  orientation="horizontal"
                  sortBy="value"
                  maxBars={10}
                />
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No Core Web Vitals data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
