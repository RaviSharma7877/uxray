"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GaugeCircle, Activity, Radio, ScanEye, Sparkles, ListOrdered } from "lucide-react";

const features = [
  {
    icon: GaugeCircle,
    title: "Lighthouse Analysis",
    description: "Comprehensive performance, accessibility, SEO, and best practices scoring powered by Google Lighthouse.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Activity,
    title: "GA4 Integration",
    description: "Deep dive into user behavior with Google Analytics 4 metrics, traffic sources, and conversion tracking.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Radio,
    title: "Clarity Insights",
    description: "Microsoft Clarity heatmaps, session recordings, and user interaction analysis for better UX understanding.",
    gradient: "from-orange-500 to-red-500",
  },
  {
    icon: ScanEye,
    title: "Design Analysis",
    description: "Upload designs or screenshots for AI-powered analysis of visual hierarchy, accessibility, and user flow.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: ListOrdered,
    title: "Interactive Heatmaps",
    description: "Visual attention prediction and click heatmaps to identify high-engagement areas and friction points.",
    gradient: "from-indigo-500 to-blue-500",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Insights",
    description: "Get actionable recommendations and strategic insights powered by advanced AI analysis of all your data.",
    gradient: "from-pink-500 to-rose-500",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-slide-up">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-primary to-chart-1 bg-clip-text text-transparent">
              Optimize UX
            </span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Powerful analytics tools integrated into one seamless platform for comprehensive user experience insights.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.gradient} mb-4 w-fit`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
