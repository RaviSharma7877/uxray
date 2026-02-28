"use client";

import { useState, useEffect, useCallback, useRef, FormEvent } from "react";
import axios from "axios";

// --- Constants ---
const API_URL = "http://localhost:8080/api/jobs";
const SCREENSHOT_BASE_URL = "http://localhost:8081";
const POLLING_INTERVAL_MS = 3000;
const API_BASE_URL = "http://localhost:8080/api";

// --- TypeScript Interfaces ---
interface Screenshot {
  id: string;
  pageUrl: string;
  imageStoragePath: string;
}

interface GA4Property {
  property: string; // e.g., "properties/12345"
  displayName: string;
}

interface TopPage {
  path: string;
  views: string;
}

interface Job {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  startUrl: string;
  screenshots: Screenshot[];
  mainPerformanceScore?: number;
  mainAccessibilityScore?: number;
  mainBestPracticesScore?: number;
  mainSeoScore?: number;
  totalUsers?: number;
  topPages?: TopPage[];
}

// --- Reusable UI Components ---
const ScoreGauge = ({ score, label }: { score?: number; label: string }) => {
  if (typeof score !== 'number') {
    // Render a loading skeleton
    return (
      <div className="text-center animate-pulse">
        <div className="h-6 bg-slate-700 rounded-md w-10 mx-auto mb-1"></div>
        <div className="h-3 bg-slate-700 rounded-md w-20 mx-auto"></div>
      </div>
    );
  }

  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-green-400';
    if (s >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</p>
      <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
    </div>
  );
};

const MainScoresPanel = ({ job }: { job: Job }) => (
  <div className="bg-slate-900/50 p-4 rounded-lg">
    <h4 className="text-lg font-semibold mb-4 text-slate-200 text-center">
      Lighthouse Audit: <span className="font-light">{job.startUrl}</span>
    </h4>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <ScoreGauge score={job.mainPerformanceScore} label="Performance" />
      <ScoreGauge score={job.mainAccessibilityScore} label="Accessibility" />
      <ScoreGauge score={job.mainBestPracticesScore} label="Best Practices" />
      <ScoreGauge score={job.mainSeoScore} label="SEO" />
    </div>
  </div>
);

// --- New Analytics Panel Component ---
const AnalyticsPanel = ({ job }: { job: Job }) => {
  if (typeof job.totalUsers !== 'number') {
    return (
      <div className="bg-slate-900/50 p-4 rounded-lg mt-6 text-center">
        <p className="text-slate-400">Google Analytics data is being fetched...</p>
      </div>
    );
  }
  return (
    <div className="bg-slate-900/50 p-4 rounded-lg mt-6">
      <h4 className="text-lg font-semibold mb-4 text-slate-200">Google Analytics (Last 28 Days)</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-4xl font-bold text-cyan-400">{job.totalUsers.toLocaleString()}</p>
          <p className="text-sm text-slate-400">Total Users</p>
        </div>
        <div className="md:col-span-2">
          <h5 className="font-semibold mb-2">Top 5 Pages by Views</h5>
          <ul className="text-sm text-slate-300 space-y-1">
            {job.topPages?.map(page => (
              <li key={page.path} className="flex justify-between">
                <span className="truncate pr-4">{page.path}</span>
                <span>{page.views} views</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default function HomePage() {
  // --- State Management ---
  const [url, setUrl] = useState("https://www.perplexity.ai");
  const [pages, setPages] = useState(3);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPollingActive = useRef(false);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [ga4Properties, setGa4Properties] = useState<GA4Property[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>("");

  // Check user auth status and fetch properties on load
  useEffect(() => {
    const checkAuthAndFetchProperties = async () => {
      try {
        // This endpoint returns user info if authenticated, or 401 if not.
        const authResponse = await axios.get(`${API_BASE_URL}/auth/status`);
        if (authResponse.status === 200) {
          setIsAuthenticated(true);
          // If authenticated, fetch their GA4 properties
          const propsResponse = await axios.get(`${API_BASE_URL}/ga4/properties`);
          setGa4Properties(propsResponse.data);
          if (propsResponse.data.length > 0) {
            setSelectedProperty(propsResponse.data[0].property);
          }
        }
      } catch (e) {
        setIsAuthenticated(false);
      }
    };
    checkAuthAndFetchProperties();
  }, []);

  // --- Polling Logic ---
  const pollJobStatus = useCallback(async () => {
    if (!activeJobId || !isPollingActive.current) {
      return;
    }

    try {
      const { data: updatedJob } = await axios.get<Job>(`${API_URL}/${activeJobId}`);
      setJobDetails(updatedJob);

      if (updatedJob.status === "PENDING" || updatedJob.status === "IN_PROGRESS") {
        pollingTimeoutRef.current = setTimeout(pollJobStatus, POLLING_INTERVAL_MS);
      } else {
        setIsLoading(false);
        isPollingActive.current = false;
      }
    } catch (err) {
      setError("Failed to fetch job status.");
      setIsLoading(false);
      isPollingActive.current = false;
    }
  }, [activeJobId]);

  // --- Effect to Start and Stop Polling ---
  useEffect(() => {
    if (activeJobId && !isPollingActive.current) {
      isPollingActive.current = true;
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
      pollJobStatus();
    }
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
      isPollingActive.current = false; 
    };
  }, [activeJobId, pollJobStatus]);

  // --- Form Submission Logic ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    isPollingActive.current = false;
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
    }
    
    setIsLoading(true);
    setError(null);
    setJobDetails(null);
    setActiveJobId(null);

    try {
      const { data: newJob } = await axios.post<Job>(API_URL, { url, pages });
      setJobDetails(newJob);
      setActiveJobId(newJob.id);
    } catch (err: any) {
      const errorMessage = err.response?.data?.errors?.[0]?.defaultMessage ||
                           err.response?.data?.message ||
                           "An error occurred while creating the job.";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  // --- UI Helper ---
  const getStatusPill = (status: Job['status']) => {
    const baseClasses = "px-3 py-1 text-sm font-semibold rounded-full";
    switch (status) {
      case "PENDING": return `${baseClasses} bg-yellow-500 text-yellow-900`;
      case "IN_PROGRESS": return `${baseClasses} bg-blue-500 text-blue-900 animate-pulse`;
      case "COMPLETED": return `${baseClasses} bg-green-500 text-green-900`;
      case "FAILED": return `${baseClasses} bg-red-500 text-red-900`;
    }
  };
  console.log("Job Details:", jobDetails); // Debugging line to check job details

  // --- Render Logic ---
  return (
    <main className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-6 text-center text-cyan-400">Screenshot Service</h1>
      {/* --- NEW CONNECTION BUTTON --- */}
      <div className="text-center mb-8">
        <a href="http://localhost:8080/oauth2/authorization/google" 
           className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          Connect Google Analytics
        </a>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto bg-slate-800 p-6 rounded-lg shadow-lg">
        {/* --- NEW GA4 Property Selector --- */}
        {isAuthenticated && ga4Properties.length > 0 && (
          <div className="mb-6">
            <label htmlFor="ga4Property" className="block text-sm font-medium text-slate-300 mb-2">
              Google Analytics Property
            </label>
            <select
              id="ga4Property"
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100"
            >
              {ga4Properties.map(prop => (
                <option key={prop.property} value={prop.property}>
                  {prop.displayName} ({prop.property})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="url" className="block text-sm font-medium text-slate-300 mb-2">Website URL</label>
          <input type="url" id="url" value={url} onChange={(e) => setUrl(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-100" required />
        </div>
        <div className="mb-6">
          <label htmlFor="pages" className="block text-sm font-medium text-slate-300 mb-2">Number of Pages to Crawl (Max 10)</label>
          <input type="number" id="pages" value={pages} onChange={(e) => setPages(parseInt(e.target.value, 10))} min="1" max="10" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-100" required />
        </div>
        <button type="submit" disabled={isLoading} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed">
          {isLoading ? "Crawling..." : "Start Crawling"}
        </button>
        {error && <p className="text-red-400 mt-4 text-center bg-red-900/50 p-2 rounded-md">{error}</p>}
      </form>

      {jobDetails && (
        <div className="mt-8 max-w-6xl mx-auto bg-slate-800 p-6 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold">Job Status</h2>
              <p className="font-mono text-sm text-slate-400 break-all">Job ID: {jobDetails.id}</p>
            </div>
            <span className={getStatusPill(jobDetails.status)}>{jobDetails.status}</span>
          </div>

          <MainScoresPanel job={jobDetails} />
          <AnalyticsPanel job={jobDetails} />

          {jobDetails.screenshots?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xl font-bold mb-4">
                Captured Screenshots ({jobDetails.screenshots.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobDetails.screenshots.map((ss, index) => (
                  <div key={index} className="border border-slate-700 rounded-lg overflow-hidden shadow-lg animate-fade-in">
                    <div className="w-full h-48 bg-slate-700 flex items-center justify-center">
                      <img 
                        src={`${SCREENSHOT_BASE_URL}/${ss.imageStoragePath}`} 
                        alt={`Screenshot of ${ss.pageUrl}`} 
                        className="w-full h-full object-cover object-top" 
                        onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Image+not+found'; }} 
                      />
                    </div>
                    <div className="p-2 bg-slate-700/50">
                      <a href={ss.pageUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:underline truncate block">{ss.pageUrl}</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

// Optional: Add a simple fade-in animation to globals.css for a nicer UX
// Add this to your `frontend/app/globals.css`
/*
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  .animate-fade-in {
    animation: fadeIn 0.5s ease-in-out;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
*/
