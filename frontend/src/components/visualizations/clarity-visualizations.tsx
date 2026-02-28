"use client";

import React from 'react';
import { BarChart, type BarChartData } from './bar-chart';
import { LineChart, type LineChartSeries } from './line-chart';
import { PieChart, type PieChartData } from './pie-chart';
import { D3Heatmap, type HeatmapDataPoint } from './d3-heatmap';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Clock, Eye, MousePointer, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Clarity data interfaces (matching the existing types from jobs page)
interface ClarityIssue {
  title?: string;
  metric?: string;
  severity?: string;
  url?: string;
  value?: number;
  description?: string;
}

interface ClarityHeatmap {
  pageUrl?: string;
  views?: number;
  clickRate?: number;
  scrollDepth?: number;
  engagementTime?: number;
}

interface ClaritySession {
  sessionId?: string;
  entryPage?: string;
  exitPage?: string;
  durationSeconds?: number;
  interactions?: number;
  device?: string;
  notes?: string;
}

interface ClarityInsights {
  totalSessions?: number;
  totalRecordings?: number;
  activeUsers?: number;
  averageEngagementSeconds?: number;
  averageScrollDepth?: number;
  rageClicks?: number;
  deadClicks?: number;
  quickBacks?: number;
  topIssues?: ClarityIssue[];
  heatmaps?: ClarityHeatmap[];
  standoutSessions?: ClaritySession[];
}

interface ClarityVisualizationsProps {
  data: ClarityInsights;
  screenshotUrl?: string; // For heatmap overlay
}

export function ClarityVisualizations({ data, screenshotUrl }: ClarityVisualizationsProps) {
  // Prepare data for issues by severity
  const issuesBySeverity: PieChartData[] = Array.from(
    (data.topIssues || []).reduce((acc, issue) => {
      const severity = issue.severity || 'Unknown';
      const existing = acc.get(severity) || 0;
      acc.set(severity, existing + 1);
      return acc;
    }, new Map<string, number>())
  ).map(([severity, count]) => ({
    label: severity,
    value: count,
    color: severity === 'High' ? '#ef4444' : severity === 'Medium' ? '#f59e0b' : '#22c55e',
  }));

  // Prepare data for top issues
  const topIssuesData: BarChartData[] = (data.topIssues || [])
    .slice(0, 10)
    .map(issue => ({
      label: issue.title || issue.metric || 'Unknown Issue',
      value: issue.value || 1,
      color: issue.severity === 'High' ? '#ef4444' : issue.severity === 'Medium' ? '#f59e0b' : '#22c55e',
    }));

  // Prepare heatmap data for top pages
  const heatmapPagesData: BarChartData[] = (data.heatmaps || [])
    .slice(0, 10)
    .map(heatmap => ({
      label: heatmap.pageUrl || 'Unknown Page',
      value: heatmap.views || 0,
    }));

  // Generate sample heatmap data (in real implementation, this would come from Clarity API)
  const generateSampleHeatmapData = (): HeatmapDataPoint[] => {
    // This is sample data - in production, you'd get actual click coordinates from Clarity
    const points: HeatmapDataPoint[] = [];
    const clickAreas = [
      { x: 0.5, y: 0.2, intensity: 10 }, // Header area
      { x: 0.3, y: 0.5, intensity: 8 },  // Left sidebar
      { x: 0.7, y: 0.5, intensity: 6 },  // Right content
      { x: 0.5, y: 0.8, intensity: 4 },  // Footer
    ];

    clickAreas.forEach(area => {
      for (let i = 0; i < area.intensity * 5; i++) {
        points.push({
          x: area.x + (Math.random() - 0.5) * 0.1,
          y: area.y + (Math.random() - 0.5) * 0.1,
          value: area.intensity + Math.random() * 2,
          label: 'Click',
        });
      }
    });

    return points;
  };

  const heatmapData = generateSampleHeatmapData();

  // Rage clicks heatmap data
  const rageClicksData: HeatmapDataPoint[] = Array.from({ length: data.rageClicks || 0 }, () => ({
    x: Math.random(),
    y: Math.random(),
    value: 5 + Math.random() * 5,
    label: 'Rage Click',
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalSessions?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data.totalRecordings?.toLocaleString() || 0} recordings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.averageEngagementSeconds ? `${Math.round(data.averageEngagementSeconds)}s` : '0s'}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.averageScrollDepth ? `${Math.round(data.averageScrollDepth)}%` : '0%'} scroll depth
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rage Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{data.rageClicks?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data.deadClicks?.toLocaleString() || 0} dead clicks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Backs</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{data.quickBacks?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              Users who left quickly
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Visualizations */}
      <Tabs defaultValue="heatmaps" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="heatmaps">Heatmaps</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
        </TabsList>

        <TabsContent value="heatmaps" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Click Heatmap</CardTitle>
                <CardDescription>User click patterns and hotspots</CardDescription>
              </CardHeader>
              <CardContent>
                {heatmapData.length > 0 ? (
                  <D3Heatmap
                    data={heatmapData}
                    backgroundImage={screenshotUrl}
                    height={600}
                    heatmapType="click"
                    colorScheme="hot"
                  />
                ) : (
                  <div className="flex items-center justify-center h-[600px] text-muted-foreground border border-border rounded-lg">
                    No click data available
                  </div>
                )}
              </CardContent>
            </Card>

            {rageClicksData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Rage Clicks</CardTitle>
                  <CardDescription>Areas where users clicked repeatedly in frustration</CardDescription>
                </CardHeader>
                <CardContent>
                  <D3Heatmap
                    data={rageClicksData}
                    backgroundImage={screenshotUrl}
                    height={600}
                    heatmapType="rage"
                    colorScheme="hot"
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Issues by Severity</CardTitle>
                <CardDescription>Distribution of detected issues</CardDescription>
              </CardHeader>
              <CardContent>
                {issuesBySeverity.length > 0 ? (
                  <PieChart
                    data={issuesBySeverity}
                    height={300}
                    showLegend={true}
                    innerRadius={60}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No issues detected
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Issues</CardTitle>
                <CardDescription>Most critical problems detected</CardDescription>
              </CardHeader>
              <CardContent>
                {topIssuesData.length > 0 ? (
                  <BarChart
                    data={topIssuesData}
                    height={300}
                    sortBy="value"
                    maxBars={8}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No issues detected
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Issues List */}
          {(data.topIssues || []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Issue Details</CardTitle>
                <CardDescription>Detailed breakdown of detected issues</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(data.topIssues || []).slice(0, 10).map((issue, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border border-border rounded-lg">
                      <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                        issue.severity === 'High' ? 'text-red-500' :
                        issue.severity === 'Medium' ? 'text-yellow-500' :
                        'text-green-500'
                      }`} />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{issue.title || issue.metric}</h4>
                          <Badge variant={
                            issue.severity === 'High' ? 'destructive' :
                            issue.severity === 'Medium' ? 'default' :
                            'secondary'
                          }>
                            {issue.severity}
                          </Badge>
                        </div>
                        {issue.description && (
                          <p className="text-sm text-muted-foreground">{issue.description}</p>
                        )}
                        {issue.url && (
                          <p className="text-xs text-muted-foreground font-mono">{issue.url}</p>
                        )}
                        {issue.value && (
                          <p className="text-sm">Occurrences: {issue.value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Standout Sessions</CardTitle>
              <CardDescription>Notable user sessions requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              {(data.standoutSessions || []).length > 0 ? (
                <div className="space-y-3">
                  {(data.standoutSessions || []).map((session, index) => (
                    <div key={index} className="p-4 border border-border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm">{session.sessionId}</span>
                        <Badge variant="outline">{session.device}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Entry:</span> {session.entryPage}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Exit:</span> {session.exitPage}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duration:</span> {session.durationSeconds}s
                        </div>
                        <div>
                          <span className="text-muted-foreground">Interactions:</span> {session.interactions}
                        </div>
                      </div>
                      {session.notes && (
                        <p className="text-sm text-muted-foreground italic">{session.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  No standout sessions found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Page Performance</CardTitle>
              <CardDescription>Pages with heatmap data by views</CardDescription>
            </CardHeader>
            <CardContent>
              {heatmapPagesData.length > 0 ? (
                <BarChart
                  data={heatmapPagesData}
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
      </Tabs>
    </div>
  );
}
