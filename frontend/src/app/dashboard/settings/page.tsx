"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Settings"
        description="Manage your account and integration settings"
      />
      
      <main className="p-6 space-y-6 max-w-4xl">
        <Tabs defaultValue="integrations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="integrations" className="space-y-6">
            {/* GA4 Integration */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle>Google Analytics 4</CardTitle>
                <CardDescription>
                  Connect your GA4 property to analyze user behavior and traffic
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ga4-property">Property ID</Label>
                  <Input
                    id="ga4-property"
                    placeholder="properties/123456789"
                    className="max-w-md"
                  />
                </div>
                <Button>Connect GA4</Button>
              </CardContent>
            </Card>

            {/* Clarity Integration */}
            <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
              <CardHeader>
                <CardTitle>Microsoft Clarity</CardTitle>
                <CardDescription>
                  Integrate Clarity for heatmaps and session recordings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clarity-project">Project ID</Label>
                  <Input
                    id="clarity-project"
                    placeholder="abc123def456"
                    className="max-w-md"
                  />
                  <p className="text-sm text-muted-foreground">
                    Your Microsoft Clarity project ID (found in project settings)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clarity-token">API Token</Label>
                  <Input
                    id="clarity-token"
                    type="password"
                    placeholder="Enter your Clarity API token"
                    className="max-w-md"
                  />
                  <p className="text-sm text-muted-foreground">
                    Generate in Clarity: Settings → Data Export → Create API Token
                  </p>
                </div>
                <Button>Connect Clarity</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize how UXRay looks and feels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Use system theme preference
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Manage how you receive updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email updates for completed jobs
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get browser notifications for important events
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Update your account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    className="max-w-md"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className="max-w-md"
                  />
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
