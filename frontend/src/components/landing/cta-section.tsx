"use client";

import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-chart-1 to-chart-2 opacity-90" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-slide-up">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white">
            Ready to Transform Your UX?
          </h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Join thousands of teams using UXRay to deliver exceptional user experiences 
            with data-driven insights and AI-powered recommendations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              asChild
              className="bg-white text-primary hover:bg-white/90 transition-all hover:scale-105 text-lg h-14 px-8"
            >
              <Link href="/dashboard">
                Get Started Free
                <ArrowUpRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white/30 text-white hover:bg-white/10 text-lg h-14 px-8"
            >
              <Link href="#features">View Features</Link>
            </Button>
          </div>
          <p className="text-sm text-white/70 pt-4">
            No credit card required • Free 14-day trial • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
