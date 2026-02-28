"use client";

import { useState, useEffect, useCallback, useRef, FormEvent, ChangeEvent } from "react";
import axios from "axios";

// --- Constants ---
const API_URL = "http://localhost:8080/api/jobs";
const API_BASE_URL = "http://localhost:8080";
const SCREENSHOT_BASE_URL = "http://localhost:8081";
const POLLING_INTERVAL_MS = 3000;

// --- TypeScript Interfaces ---
interface Screenshot {
  id: string;
  pageUrl: string;
  imageStoragePath: string;
}

interface DesignAnalysisResult {
  summary: string;
  keyPoints: string[];
}

interface Job {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  type: 'URL_ANALYSIS' | 'DESIGN_ANALYSIS';
  startUrl?: string;
  screenshots?: Screenshot[];
  mainPerformanceScore?: number;
  mainAccessibilityScore?: number;
  mainBestPracticesScore?: number;
  mainSeoScore?: number;
  detectedAbPlatforms?: string[];
  designInput?: string;
  designAnalysisResults?: DesignAnalysisResult;
}

interface GA4Property {
  property: string; // e.g. "properties/123456789"
  displayName: string;
}

interface Job {
  // ...your fields...
  ga4Results?: {
    totalUsers?: number;
    topPages?: { path: string; views: string }[];
  };
}

const AnalyticsPanel = ({ ga4Results }: { ga4Results?: Job['ga4Results'] }) => {
  if (!ga4Results?.totalUsers) return null;
  return (
    <div className="bg-slate-900/50 p-4 rounded-lg mt-6">
      <h4 className="text-lg font-semibold mb-4 text-slate-200">Google Analytics (Last 28 Days)</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-4xl font-bold text-cyan-400">{ga4Results.totalUsers.toLocaleString()}</p>
          <p className="text-sm text-slate-400">Total Users</p>
        </div>
        <div className="md:col-span-2">
          <h5 className="font-semibold mb-2">Top 5 Pages by Views</h5>
          <ul className="text-sm text-slate-300 space-y-1">
            {ga4Results.topPages?.map(page => (
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

// --- Reusable UI Components ---
const ScoreGauge = ({ score, label }: { score?: number; label: string }) => {
    if (typeof score !== 'number') {
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

const DesignAnalysisPanel = ({ job }: { job: Job }) => {
    if (!job.designAnalysisResults) {
        return (
            <div className="bg-slate-900/50 p-4 rounded-lg mt-6 text-center animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-3/4 mx-auto mb-2"></div>
                <div className="h-3 bg-slate-700 rounded w-1/2 mx-auto"></div>
                <p className="mt-2 text-slate-400 text-sm">Analyzing design file...</p>
            </div>
        );
    }
    const { summary, keyPoints } = job.designAnalysisResults;
    return (
        <div className="bg-slate-900/50 p-6 rounded-lg mt-6">
            <h3 className="text-xl font-bold mb-4 text-cyan-400">Design Analysis Results</h3>
            <p className="text-slate-300 mb-3">{summary}</p>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
                {keyPoints?.map((point, i) => <li key={i}>{point}</li>)}
            </ul>
        </div>
    );
};




// --- Main Page Component ---
export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'url' | 'design'>('url');
  
  // State for URL Analysis
  const [url, setUrl] = useState("https://www.perplexity.ai");
  const [pages, setPages] = useState(3);
  
  // State for Design Analysis
  const [designInput, setDesignInput] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // General Job State
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ga4Properties, setGa4Properties] = useState<GA4Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("");

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const { data: updatedJob } = await axios.get<Job>(`${API_URL}/me/${jobId}`);
      setJobDetails(updatedJob);
      if (updatedJob.status === "PENDING" || updatedJob.status === "IN_PROGRESS") {
        pollingTimeoutRef.current = setTimeout(() => pollJobStatus(jobId), POLLING_INTERVAL_MS);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      setError("Failed to fetch job status.");
      setIsLoading(false);
    }
  }, []);

   // Check login and get GA4 properties
  useEffect(() => {
    const fetchAuthAndProperties = async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/auth/status`, {
  withCredentials: true     // <-- same idea
});
        setIsAuthenticated(true);
        const { data: properties } = await axios.get(`${API_BASE_URL}/api/ga4/properties`, {
  withCredentials: true     // <-- same idea
});
        setGa4Properties(properties);
        if (properties.length > 0) setSelectedProperty(properties[0].property);
      } catch { setIsAuthenticated(false); }
    };
    fetchAuthAndProperties();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setJobDetails(null);
    if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);

    let requestData;

    if (activeTab === 'url') {
      if (!url) {
        setError("Please enter a valid URL.");
        setIsLoading(false);
        return;
      }
      requestData = { type: 'URL_ANALYSIS', url, pages };
    } else {
      if (!designInput && !file) {
        setError("Please provide a Figma/Webflow URL or upload a file.");
        setIsLoading(false);
        return;
      }
      // Note: Real file upload would involve a multi-part form request.
      // This example prioritizes the URL input for simplicity.
      requestData = { type: 'DESIGN_ANALYSIS', designInput: designInput || (file ? file.name : "") };
    }

    try {
      const { data: newJob } = await axios.post<Job>(API_URL, requestData, {
  withCredentials: true     // <-- same idea
});
      setJobDetails(newJob);
      setActiveJobId(newJob.id);
      pollJobStatus(newJob.id);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "An error occurred while creating the job.";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const getStatusPill = (status: Job['status']) => {
    const baseClasses = "px-3 py-1 text-sm font-semibold rounded-full";
    const statusClasses = {
      PENDING: "bg-yellow-500 text-yellow-900",
      IN_PROGRESS: "bg-blue-500 text-blue-900 animate-pulse",
      COMPLETED: "bg-green-500 text-green-900",
      FAILED: "bg-red-500 text-red-900",
    };
    return `${baseClasses} ${statusClasses[status]}`;
  };
  console.log("Rendering HomePage with activeTab:", activeTab, "jobDetails:", jobDetails);

  return (
    <main className="container mx-auto p-4 md:p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-4xl font-bold mb-6 text-center text-cyan-400">UX Analysis Platform</h1>

      <div className="text-center mb-8">
        {!isAuthenticated ? (
          <a href="http://localhost:8080/oauth2/authorization/google"
             className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Connect Google Analytics
          </a>
        ) : (
          <p className="text-green-400">✓ Google Analytics Connected</p>
        )}
      </div>

      <div className="flex justify-center mb-4 border-b border-slate-700">
        <button onClick={() => setActiveTab('url')} className={`px-4 py-2 text-lg font-medium transition-colors ${activeTab === 'url' ? 'border-b-2 border-cyan-400 text-white' : 'text-slate-400 hover:text-white'}`}>
          Analyze Live URL
        </button>
        <button onClick={() => setActiveTab('design')} className={`px-4 py-2 text-lg font-medium transition-colors ${activeTab === 'design' ? 'border-b-2 border-cyan-400 text-white' : 'text-slate-400 hover:text-white'}`}>
          Analyze Design
        </button>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto bg-slate-800 p-6 rounded-lg shadow-2xl shadow-cyan-500/10">
        {activeTab === 'url' && isAuthenticated && ga4Properties.length > 0 ? (
          
          <div className="space-y-4">
            <div className="mb-6">
            <label htmlFor="ga4Property" className="block text-sm font-medium text-slate-300 mb-2">
              Google Analytics Property
            </label>
            <select
              id="ga4Property"
              value={selectedProperty}
              onChange={e => setSelectedProperty(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100"
            >
              {ga4Properties.map(prop => (
                <option key={prop.property} value={prop.property}>
                  {prop.displayName} ({prop.property})
                </option>
              ))}
            </select>
          </div>
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-slate-300 mb-2">Website URL</label>
              <input type="url" id="url" value={url} onChange={(e) => setUrl(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-100" required />
            </div>
            <div>
              <label htmlFor="pages" className="block text-sm font-medium text-slate-300 mb-2">Pages to Crawl (Max 10)</label>
              <input type="number" id="pages" value={pages} onChange={(e) => setPages(parseInt(e.target.value))} min="1" max="10" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2" required />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="designUrl" className="block text-sm font-medium text-slate-300 mb-2">Figma or Webflow URL</label>
              <input type="url" id="designUrl" value={designInput} onChange={(e) => setDesignInput(e.target.value)} placeholder="e.g., https://figma.com/file/..." className="w-full bg-slate-700 border border-slate-600 rounded-md p-2"/>
            </div>
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-600"></div><span className="flex-shrink mx-4 text-slate-400">OR</span><div className="flex-grow border-t border-slate-600"></div>
            </div>
            <div>
              <label htmlFor="designFile" className="block text-sm font-medium text-slate-300 mb-2">Upload File (PNG, PDF, etc.)</label>
              <input type="file" id="designFile" onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files ? e.target.files[0] : null)} className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700 cursor-pointer"/>
            </div>
          </div>
        )}
        <button type="submit" disabled={isLoading} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed mt-6">
          {isLoading ? "Analyzing..." : `Start ${activeTab === 'url' ? 'URL' : 'Design'} Analysis`}
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

          {jobDetails.type === 'URL_ANALYSIS' && (
            <>
              <MainScoresPanel job={jobDetails} />
              <AnalyticsPanel ga4Results={jobDetails.ga4Results} />
              {jobDetails.screenshots && jobDetails.screenshots.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xl font-bold mb-4">Captured Screenshots ({jobDetails.screenshots.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {jobDetails.screenshots.map((ss) => (
                      <div key={ss.id} className="border border-slate-700 rounded-lg overflow-hidden shadow-lg animate-fade-in">
                        <div className="w-full h-48 bg-slate-700 flex items-center justify-center">
                          <img 
                            src={`${SCREENSHOT_BASE_URL}/${ss.imageStoragePath}`} 
                            alt={`Screenshot of ${ss.pageUrl}`} 
                            className="w-full h-full object-cover object-top" 
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+not+found'; }} 
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
            </>
          )}

          {jobDetails.type === 'DESIGN_ANALYSIS' && (
            <DesignAnalysisPanel job={jobDetails} />
          )}
        </div>
      )}
    </main>
  );
}
