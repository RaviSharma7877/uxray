"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Activity, CheckCircle2, Clock, XCircle } from "lucide-react";

const stats = [
  {
    title: "Total Jobs",
    value: "24",
    change: "+12%",
    icon: Activity,
    color: "text-blue-500",
  },
  {
    title: "Completed",
    value: "18",
    change: "+8%",
    icon: CheckCircle2,
    color: "text-green-500",
  },
  {
    title: "In Progress",
    value: "4",
    change: "+2",
    icon: Clock,
    color: "text-yellow-500",
  },
  {
    title: "Failed",
    value: "2",
    change: "-1",
    icon: XCircle,
    color: "text-red-500",
  },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Overview"
        description="Monitor your UX analytics at a glance"
      />
      
      <main className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className={stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}>
                      {stat.change}
                    </span>
                    {' '}from last month
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
            <CardDescription>Your latest UX analysis jobs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">URL Analysis #{i}</p>
                      <p className="text-sm text-muted-foreground">example.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">Completed</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Start a new analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <button className="p-6 rounded-lg border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all text-left group">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">URL Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Analyze website performance and UX
                </p>
              </button>
              <button className="p-6 rounded-lg border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all text-left group">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Design Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Upload designs for AI-powered insights
                </p>
              </button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
