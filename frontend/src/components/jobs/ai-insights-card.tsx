"use client";

import React, { useState } from 'react';
import { Sparkles, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AIInsightsCardProps {
  insights: string;
  status: 'idle' | 'streaming' | 'ready' | 'error';
  streamMessage?: string;
  error?: string | null;
  onGenerate?: () => void;
  isGenerating?: boolean;
}

export function AIInsightsCard({
  insights,
  status,
  streamMessage,
  error,
  onGenerate,
  isGenerating = false,
}: AIInsightsCardProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(insights);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-background to-background shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/20 p-2">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">AI UX Analyst</h2>
            <p className="text-sm text-muted-foreground">
              {status === 'streaming' ? 'Analyzing...' : status === 'ready' ? 'Analysis complete' : 'Ready to analyze'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {status === 'ready' && insights && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </>
          )}
          {onGenerate && status !== 'streaming' && (
            <Button
              onClick={onGenerate}
              disabled={isGenerating}
              className="gap-2"
              size="sm"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? 'Analyzing...' : 'Generate Insights'}
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-6">
          {status === 'idle' && (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Click "Generate Insights" to get AI-powered UX analysis</p>
            </div>
          )}

          {status === 'streaming' && (
            <div className="space-y-4">
              {streamMessage && (
                <p className="text-sm text-muted-foreground italic">{streamMessage}</p>
              )}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {insights && (
                  <div className="whitespace-pre-wrap">{insights}</div>
                )}
                <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
              </div>
            </div>
          )}

          {status === 'ready' && insights && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap leading-relaxed">{insights}</div>
            </div>
          )}

          {status === 'error' && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <p className="text-sm text-destructive font-medium">
                {error || 'Failed to generate insights. Please try again.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
