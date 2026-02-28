"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import axios from "axios";
import HeatmapOverlay from "@/app/HeatmapOverlay";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { GA4Visualizations } from "@/components/visualizations/ga4-visualizations";
import { ClarityVisualizations } from "@/components/visualizations/clarity-visualizations";
import { D3Heatmap, type HeatmapDataPoint } from "@/components/visualizations/d3-heatmap";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  ArrowUpRight,
  GaugeCircle,
  ListOrdered,
  Radio,
  ScanEye,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    clarity?: (...args: any[]) => void;
  }
}

const API_URL = "http://localhost:8080/api/jobs";
const API_BASE_URL = "http://localhost:8080";
const ASSET_BASE_URL = (
  process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? "http://localhost:8081"
).replace(/\/+$/, "");
const POLLING_INTERVAL_MS = 3000;
const POST_COMPLETION_POLL_LIMIT = 20;
const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

const useMicrosoftClarity = (userId?: string | null) => {
  useEffect(() => {
    if (!CLARITY_PROJECT_ID || typeof window === "undefined" || window.clarity) {
      return;
    }
    (function (c: Window & typeof globalThis, l: Document, a: string, r: string, i: string) {
      const clarityKey = a as keyof Window;
      (c as any)[clarityKey] =
        (c as any)[clarityKey] ||
        function (...args: unknown[]) {
          const q = ((c as any)[clarityKey].q = ((c as any)[clarityKey].q || []));
          q.push(args);
        };
      const t = l.createElement(r) as HTMLScriptElement;
      t.async = true;
      t.src = `https://www.clarity.ms/tag/${i}`;
      const y = l.getElementsByTagName(r)[0];
      y?.parentNode?.insertBefore(t, y);
    })(window, document, "clarity", "script", CLARITY_PROJECT_ID);
  }, []);

  useEffect(() => {
    if (!CLARITY_PROJECT_ID || typeof window === "undefined" || !userId) {
      return;
    }
    if (typeof window.clarity === "function") {
      window.clarity("identify", userId);
    }
  }, [userId]);
};

const buildAssetUrl = (raw?: string | null) => {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${ASSET_BASE_URL}/${raw.replace(/^\/+/, "")}`;
};

const proxied = (raw?: string | null) =>
  raw ? `/api/proxy-image?u=${encodeURIComponent(raw)}` : "";
const aiStreamUrl = (jobId: string) =>
  `${API_BASE_URL}/api/jobs/${jobId}/insights/stream`;

interface Screenshot {
  id: string;
  pageUrl: string;
  imageStoragePath?: string;
  imagePublicUrl?: string | null;
  heatmapStoragePath?: string | null;
  heatmapPublicUrl?: string | null;
}

interface DesignAnalysisResult {
  summary?: string;
  keyPoints?: string[];
}

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

interface GA4AcquisitionChannel {
  channel: string;
  sessions: number;
  activeUsers?: number;
}

interface GA4DeviceTechnology {
  deviceCategory: string;
  operatingSystem: string;
  browser: string;
  sessions: number;
  activeUsers: number;
}

interface GA4Demographic {
  country: string;
  city: string;
  language: string;
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
  acquisitionChannels?: GA4AcquisitionChannel[];
  deviceTechnology?: GA4DeviceTechnology[];
  demographics?: GA4Demographic[];
  coreWebVitals?: GA4CoreWebVital[];
}

interface AiPulse {
  headline?: string;
  supporting?: string;
  impact?: string;
}

interface AiScorecardEntry {
  label: string;
  score?: number | null;
  narrative?: string;
}

interface AiHeatmapBrief {
  rank: number;
  page: string;
  attentionSignal?: string;
  frictionSource?: string;
  conversionHook?: string;
}

interface AiDataSignals {
  ga4?: string;
  clarity?: string;
  abStack?: string;
  designRef?: string;
  coreWebVitals?: { metric: string; value: string }[];
}

interface AiActionItem {
  title: string;
  description: string;
  successMetric: string;
}

interface AiInsightsPayload {
  pulse?: AiPulse;
  scorecard?: AiScorecardEntry[];
  heatmaps?: AiHeatmapBrief[];
  dataSignals?: AiDataSignals;
  actions?: AiActionItem[];
}

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

interface TrafficSource {
  source?: string;
  medium?: string;
  sessionsCount?: number;
  percentage?: number;
}

interface BrowserInfo {
  name?: string;
  sessionsCount?: number;
  percentage?: number;
}

interface DeviceInfo {
  type?: string;
  sessionsCount?: number;
  percentage?: number;
}

interface OperatingSystemInfo {
  name?: string;
  sessionsCount?: number;
  percentage?: number;
}

interface CountryInfo {
  name?: string;
  sessionsCount?: number;
  percentage?: number;
}

interface PageTitleInfo {
  title?: string;
  sessionsCount?: number;
  percentage?: number;
}

interface PerformanceMetrics {
  botSessions?: number;
  pagesPerSession?: number;
  totalTime?: number;
  activeTime?: number;
}

interface DiagnosticEvent {
  eventType?: string;
  count?: number;
  sessionsAffected?: number;
  percentage?: number;
  details?: any;
}

interface PageEvents {
  documentSizes?: any;
  pageVisibility?: any;
  pageUnload?: any;
}

interface CustomEvent {
  eventName?: string;
  count?: number;
  variables?: any;
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
  trafficSources?: TrafficSource[];
  browsers?: BrowserInfo[];
  devices?: DeviceInfo[];
  operatingSystems?: OperatingSystemInfo[];
  countries?: CountryInfo[];
  pageTitles?: PageTitleInfo[];
  performanceMetrics?: PerformanceMetrics;
  diagnosticEvents?: DiagnosticEvent[];
  pageEvents?: PageEvents;
  customEvents?: CustomEvent[];
}

interface ClarityProject {
  projectId: string;
  name?: string;
  domain?: string;
  status?: string;
  createdDate?: string;
}

interface Job {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  type: "URL_ANALYSIS" | "DESIGN_ANALYSIS";
  startUrl?: string;
  updatedAt?: string;
  screenshots?: Screenshot[];
  mainPerformanceScore?: number;
  mainAccessibilityScore?: number;
  mainBestPracticesScore?: number;
  mainSeoScore?: number;
  detectedAbPlatforms?: string[];
  designInput?: string;
  designAnalysisResults?: DesignAnalysisResult;
  ga4Results?: GA4Results;
  clarityInsights?: ClarityInsights;
  propertyId?: string;
  clarityProjectId?: string;
  clarityEndpointUrl?: string;
  createdAt?: string;
}

interface GA4Property {
  property: string;
  displayName: string;
}

const statusTheme: Record<
  Job["status"],
  { label: string; badge: string; dot: string }
> = {
  PENDING: {
    label: "Queued",
    badge: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  IN_PROGRESS: {
    label: "Running",
    badge: "border-primary text-primary-foreground bg-primary animate-pulse",
    dot: "bg-primary",
  },
  COMPLETED: {
    label: "Complete",
    badge: "border-border bg-muted/50 text-foreground",
    dot: "bg-foreground",
  },
  FAILED: {
    label: "Failed",
    badge: "border-red-500 bg-red-500/10 text-red-200",
    dot: "bg-red-500",
  },
};

const metricMeta = [
  { key: "mainPerformanceScore", label: "Performance" },
  { key: "mainAccessibilityScore", label: "Accessibility" },
  { key: "mainBestPracticesScore", label: "Best Practices" },
  { key: "mainSeoScore", label: "SEO" },
] as const;

const SCORECARD_LABELS = [
  "Performance",
  "Accessibility",
  "Best Practices",
  "SEO",
] as const;

const CLARITY_SOURCE_TAGS = [
  "Microsoft Clarity +3",
  "Microsoft Learn +3",
  "Microsoft Learn +3",
] as const;

const formatPercent = (value?: number | null) => {
  if (typeof value !== "number") return "--";
  return Math.round(value);
};

const jobHasMeaningfulData = (job?: Job | null): boolean => {
  if (!job) return false;
  const hasScores = metricMeta.some(
    ({ key }) => typeof job[key as keyof Job] === "number",
  );
  const hasHeatmaps = job.screenshots?.some(
    (shot) => shot.heatmapPublicUrl || shot.heatmapStoragePath,
  );
  const hasDesign = Boolean(job.designAnalysisResults?.summary);
  const hasGa =
    !!job.ga4Results &&
    (job.ga4Results.totalUsers ||
      job.ga4Results.sessions ||
      (job.ga4Results.topPages?.length ?? 0) > 0);
  const hasClarity =
    !!job.clarityInsights &&
    (job.clarityInsights.totalSessions ||
      job.clarityInsights.totalRecordings ||
      job.clarityInsights.activeUsers ||
      (job.clarityInsights.topIssues?.length ?? 0) > 0 ||
      (job.clarityInsights.heatmaps?.length ?? 0) > 0);
  return Boolean(hasScores || hasHeatmaps || hasDesign || hasGa || hasClarity);
};

export default function HomePage() {
  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState<"url" | "design">("url");
  const [url, setUrl] = useState("https://samskritsamhita.org/");
  const [pages, setPages] = useState(3);
  const [designInput, setDesignInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{fileName: string; publicUrl: string; storagePath: string}>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasGoogleAuth, setHasGoogleAuth] = useState(false);
  const [ga4Properties, setGa4Properties] = useState<GA4Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [ga4Analytics, setGa4Analytics] = useState<GA4Results | null>(null);
  const [clarityProjects, setClarityProjects] = useState<ClarityProject[]>([]);
  const [selectedClarityProject, setSelectedClarityProject] = useState<string>("");
  const [hasMicrosoftAuth, setHasMicrosoftAuth] = useState(false);
  // Note: clarityTokenInput stores the token temporarily, not saved to database
  const [aiStatus, setAiStatus] = useState<
    "idle" | "streaming" | "ready" | "error"
  >("idle");
  const [aiInsights, setAiInsights] = useState<AiInsightsPayload | null>(null);
  const [aiStreamMessage, setAiStreamMessage] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiRequested, setAiRequested] = useState(false);
  const [isClarityDialogOpen, setIsClarityDialogOpen] = useState(false);
  const [clarityTokenInput, setClarityTokenInput] = useState("");
  const [clarityTokenStatus, setClarityTokenStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [clarityTokenMessage, setClarityTokenMessage] = useState<string | null>(null);
  const [isLoadingClarity, setIsLoadingClarity] = useState(false);
  const [isLoadingGA4, setIsLoadingGA4] = useState(false);
  const [isLoadingLighthouse, setIsLoadingLighthouse] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const aiSourceRef = useRef<EventSource | null>(null);
  const aiLastJobRef = useRef<string | null>(null);
  const completionPollsRef = useRef<Record<string, number>>({});
  const aiInsightsRef = useRef<AiInsightsPayload | null>(null);

  // Removed loadClarityAccess - we no longer fetch projects or check API key status
  // Token is passed directly in job creation request
  // Removed useEffect that called loadClarityAccess - no longer needed

  const handleClarityDialogChange = useCallback((open: boolean) => {
    setIsClarityDialogOpen(open);
    if (open) {
      setClarityTokenStatus("idle");
      setClarityTokenMessage(null);
    } else {
      setClarityTokenInput("");
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
    const cleanup = () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
      aiSourceRef.current?.close();
    };
    return cleanup;
  }, []);


  const pollJobStatus = useCallback(
    async (jobId: string) => {
      try {
        const { data } = await axios.get<Job>(`${API_URL}/me/${jobId}`, {
          withCredentials: true,
        });
        setJobDetails(data);
        
        // Update loading states based on data availability
        const expectsScores = data.type === "URL_ANALYSIS";
        const hasScores = !expectsScores || typeof data.mainPerformanceScore === "number";
        const expectsGa4 = Boolean(data.propertyId);
        const hasGa4 = Boolean(data.ga4Results);
        const expectsClarity = Boolean(data.clarityProjectId);
        const hasClarity = Boolean(data.clarityInsights && (
          data.clarityInsights.totalSessions ||
          data.clarityInsights.totalRecordings ||
          data.clarityInsights.activeUsers ||
          (data.clarityInsights.topIssues?.length ?? 0) > 0 ||
          (data.clarityInsights.heatmaps?.length ?? 0) > 0 ||
          (data.clarityInsights.standoutSessions?.length ?? 0) > 0
        ));
        
        // Update individual loading states
        if (expectsScores && !hasScores) {
          setIsLoadingLighthouse(true);
        } else if (hasScores) {
          setIsLoadingLighthouse(false);
        }
        
        if (expectsGa4 && !hasGa4) {
          setIsLoadingGA4(true);
        } else if (hasGa4) {
          setIsLoadingGA4(false);
        }
        
        if (expectsClarity && !hasClarity) {
          setIsLoadingClarity(true);
        } else if (hasClarity) {
          setIsLoadingClarity(false);
        }
        
        if (data.status === "FAILED") {
          setIsLoading(false);
          setIsLoadingLighthouse(false);
          setIsLoadingGA4(false);
          setIsLoadingClarity(false);
          return;
        }

        const expectsDesign = Boolean(data.designInput);
        const hasDesign = Boolean(data.designAnalysisResults?.summary);
        const jobComplete = data.status === "COMPLETED";
        const waitingForExtras =
          (expectsGa4 && !hasGa4) || 
          (expectsDesign && !hasDesign) || 
          (expectsClarity && !hasClarity);

        if (jobComplete && hasScores && !waitingForExtras) {
          delete completionPollsRef.current[jobId];
          setIsLoading(false);
          setIsLoadingLighthouse(false);
          setIsLoadingGA4(false);
          setIsLoadingClarity(false);
          return;
        }

        if (jobComplete) {
          const attempts = completionPollsRef.current[jobId] ?? 0;
          if (attempts >= POST_COMPLETION_POLL_LIMIT) {
            delete completionPollsRef.current[jobId];
            setIsLoading(false);
            setIsLoadingLighthouse(false);
            setIsLoadingGA4(false);
            setIsLoadingClarity(false);
            return;
          }
          completionPollsRef.current[jobId] = attempts + 1;
        } else {
          delete completionPollsRef.current[jobId];
        }
        pollingRef.current = setTimeout(
          () => pollJobStatus(jobId),
          POLLING_INTERVAL_MS,
        );
      } catch (err) {
        console.error("[POLL] failed", err);
        setError("Failed to refresh job status.");
        setIsLoading(false);
        setIsLoadingLighthouse(false);
        setIsLoadingGA4(false);
        setIsLoadingClarity(false);
      }
    },
    [],
  );

  useEffect(() => {
    const fetchAuth = async () => {
      try {
        const { data: authStatus } = await axios.get<{
          authenticated: boolean;
          provider?: string;
          hasGoogle?: boolean;
        }>(`${API_BASE_URL}/api/auth/status`, {
          withCredentials: true,
        });
        
        setIsAuthenticated(authStatus.authenticated || false);
        setHasGoogleAuth(authStatus.hasGoogle || false);
        
        // Fetch GA4 properties only if authenticated with Google
        if (authStatus.hasGoogle) {
          try {
            const { data } = await axios.get<GA4Property[]>(
              `${API_BASE_URL}/api/auth/ga4/properties`,
              { withCredentials: true },
            );
            // Ensure data is always an array
            const properties = Array.isArray(data) ? data : [];
            setGa4Properties(properties);
            if (properties.length > 0) {
              setSelectedProperty((prev) => prev || properties[0].property);
            }
          } catch (err) {
            console.log("[GA4] Failed to fetch properties", err);
            setGa4Properties([]); // Ensure it's always an array
          }
        } else {
          setGa4Properties([]);
        }
        
        // Clarity token is now provided per-job, not stored in database
      } catch {
        setIsAuthenticated(false);
        setHasGoogleAuth(false);
        setGa4Properties([]);
        setClarityProjects([]);
        setHasMicrosoftAuth(false);
        setSelectedClarityProject("");
      }
    };
    fetchAuth();
  }, []);

  // Removed auto-select effect - project ID is now manually entered by user

  useEffect(() => {
    if (!hasGoogleAuth || !selectedProperty) {
      return;
    }
    let cancelled = false;

    const fetchGa4Pulse = async () => {
      const propertyId = selectedProperty.replace(/^properties\//i, "");
      if (!propertyId) {
        return;
      }
      try {
        setGa4Analytics(null);
        const { data } = await axios.get<GA4Results>(
          `${API_BASE_URL}/api/auth/ga4/analytics`,
          {
            params: { propertyId },
            withCredentials: true,
          },
        );
        if (!cancelled) {
          setGa4Analytics(data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[GA4] Failed to load analytics snapshot", err);
        }
      }
    };

    fetchGa4Pulse();

    return () => {
      cancelled = true;
    };
  }, [hasGoogleAuth, selectedProperty]);

  const normalizeEndpointUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return trimmed;
    
    // If URL doesn't start with http:// or https://, prepend https://
    if (!trimmed.match(/^https?:\/\//i)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const handleClarityTokenSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!clarityTokenInput.trim()) {
      setClarityTokenStatus("error");
      setClarityTokenMessage("Please paste your Clarity export token.");
      return;
    }
    // Just validate and close dialog - token will be passed when creating job
    setClarityTokenStatus("success");
    setClarityTokenMessage("Token ready. Click Launch to start analysis.");
    setHasMicrosoftAuth(true);
    // Close dialog after a brief delay
    setTimeout(() => {
      setIsClarityDialogOpen(false);
    }, 1000);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setJobDetails(null);
    setGa4Analytics(null);
    setAiInsights(null);
    aiInsightsRef.current = null;
    setAiStreamMessage("");
    setAiStatus("idle");
    setAiError(null);
    setAiRequested(false);
    aiLastJobRef.current = null;
    // Initialize loading states
    setIsLoadingLighthouse(false);
    setIsLoadingGA4(false);
    setIsLoadingClarity(false);
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
    }

    let uploadedFilesWithHeatmaps: Array<{file: {fileName: string; publicUrl: string; storagePath: string}; heatmapBase64: string | null}> = [];
    let payload: Record<string, unknown>;
    if (activeTab === "url") {
      if (!url) {
        setError("Please supply a valid URL.");
        setIsLoading(false);
        return;
      }
      payload = {
        type: "URL_ANALYSIS",
        url,
        pages,
        propertyId: selectedProperty || undefined,
        clarityProjectId: selectedClarityProject || undefined,
        clarityToken: clarityTokenInput.trim() || undefined,
      };
      console.log("[Frontend] Creating job with payload:", {
        type: payload.type,
        url: payload.url,
        pages: payload.pages,
        propertyId: payload.propertyId,
        clarityProjectId: payload.clarityProjectId,
        hasClarityToken: !!payload.clarityToken,
        hasMicrosoftAuth: hasMicrosoftAuth,
      });
    } else {
      if (!designInput && files.length === 0) {
        setError("Add a design link or upload files.");
        setIsLoading(false);
        return;
      }
      
      // Upload files if any
      let uploadedFileUrls: string[] = [];
      
      if (files.length > 0) {
        try {
          const uploaded = await uploadDesignFiles(files);
          setUploadedFiles(uploaded);
          uploadedFileUrls = uploaded.map(f => f.publicUrl);
          
          // Generate heatmaps for uploaded files
          for (const uploadedFile of uploaded) {
            try {
              const heatmapBase64 = await generateHeatmapForFile(uploadedFile.publicUrl, uploadedFile.fileName);
              uploadedFilesWithHeatmaps.push({
                file: uploadedFile,
                heatmapBase64: heatmapBase64
              });
            } catch (err) {
              console.error('Failed to generate heatmap for', uploadedFile.fileName, err);
              uploadedFilesWithHeatmaps.push({
                file: uploadedFile,
                heatmapBase64: null
              });
            }
          }
        } catch (err) {
          setIsLoading(false);
          return;
        }
      }
      
      payload = {
        type: "DESIGN_ANALYSIS",
        designInput: designInput || (uploadedFileUrls.length > 0 ? uploadedFileUrls.join(', ') : ''),
      };
    }

    try {
      const { data } = await axios.post<Job>(API_URL, payload, {
        withCredentials: true,
      });
      console.log("[Frontend] Job created:", {
        jobId: data.id,
        type: data.type,
        clarityProjectId: data.clarityProjectId,
      });
      setActiveJobId(data.id);
      setJobDetails(data);
      
      // Add screenshots with heatmaps for uploaded design files
      if (activeTab === "design" && uploadedFilesWithHeatmaps.length > 0) {
        for (const item of uploadedFilesWithHeatmaps) {
          try {
            // Create screenshot entry for the uploaded file
            const screenshotPayload: any = {
              pageUrl: item.file.publicUrl,
              imageStoragePath: item.file.storagePath,
              imagePublicUrl: item.file.publicUrl,
            };
            
            // Add heatmap if generated
            if (item.heatmapBase64) {
              const heatmapData = item.heatmapBase64.split(',')[1];
              screenshotPayload.heatmapBase64 = heatmapData;
              screenshotPayload.heatmapContentType = 'image/png';
              screenshotPayload.heatmapFileName = item.file.fileName.replace(/\.[^/.]+$/, '') + '-heatmap.png';
            }
            
            await axios.post(`${API_URL}/me/${data.id}/screenshots`, screenshotPayload, {
              withCredentials: true,
            });
          } catch (err) {
            console.error('Failed to add screenshot for', item.file.fileName, err);
          }
        }
      }
      
      if (activeTab === "url" && selectedProperty) {
        const { data: ga4 } = await axios.get<GA4Results>(
          `${API_BASE_URL}/api/auth/ga4/analytics`,
          {
            params: { propertyId: selectedProperty.replace("properties/", "") },
            withCredentials: true,
          },
        );
        setGa4Analytics(ga4);
      }
      pollJobStatus(data.id);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ??
        "Something went wrong while creating the job.";
      setError(message);
      setIsLoading(false);
    }
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(event.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDesignFiles = async (filesToUpload: File[]): Promise<Array<{fileName: string; publicUrl: string; storagePath: string}>> => {
    if (filesToUpload.length === 0) return [];
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      filesToUpload.forEach(file => {
        formData.append('files', file);
      });
      formData.append('domain', 'design-uploads');

      const { data } = await axios.post<{
        files: Array<{
          fileName: string;
          storagePath: string;
          publicUrl: string;
          contentType: string;
          size: number;
        }>;
      }>(`${API_BASE_URL}/api/jobs/design-files/upload`, formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return data.files.map(f => ({
        fileName: f.fileName,
        publicUrl: f.publicUrl,
        storagePath: f.storagePath,
      }));
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Failed to upload files.";
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const generateHeatmapForFile = async (fileUrl: string, fileName: string): Promise<string | null> => {
    try {
      // Create a temporary image element to load the file
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          
          // Generate heatmap using similar logic to HeatmapOverlay
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const heatmapCanvas = document.createElement('canvas');
          heatmapCanvas.width = canvas.width;
          heatmapCanvas.height = canvas.height;
          const heatmapCtx = heatmapCanvas.getContext('2d');
          if (!heatmapCtx) {
            reject(new Error('Failed to get heatmap canvas context'));
            return;
          }
          
          // Simple heatmap generation based on image intensity
          const data = imageData.data;
          const gray = new Float32Array(canvas.width * canvas.height);
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
          }
          
          // Create heatmap visualization
          const heatmapData = heatmapCtx.createImageData(canvas.width, canvas.height);
          for (let i = 0; i < gray.length; i++) {
            const intensity = gray[i] / 255;
            const heatValue = Math.pow(intensity, 0.7);
            const r = Math.min(255, heatValue * 255);
            const g = Math.min(255, heatValue * 200);
            const b = Math.min(255, heatValue * 100);
            
            const idx = i * 4;
            heatmapData.data[idx] = r;
            heatmapData.data[idx + 1] = g;
            heatmapData.data[idx + 2] = b;
            heatmapData.data[idx + 3] = 200;
          }
          
          heatmapCtx.putImageData(heatmapData, 0, 0);
          
          // Convert to base64
          const heatmapBase64 = heatmapCanvas.toDataURL('image/png');
          resolve(heatmapBase64);
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = fileUrl;
      });
    } catch (err) {
      console.error('Failed to generate heatmap:', err);
      return null;
    }
  };

  const startAiStream = useCallback(
    (jobId: string) => {
      if (!jobId || aiStatus === "streaming") return;

      setAiRequested(true);
      aiSourceRef.current?.close();
      setAiStatus("streaming");
      setAiError(null);
      setAiInsights(null);
      aiInsightsRef.current = null;
      setAiStreamMessage("Connecting to Gemini…");

      const source = new EventSource(aiStreamUrl(jobId), {
        withCredentials: true,
      });
      aiSourceRef.current = source;

      const chunkHandler = (event: MessageEvent) => {
        const text = String(event.data || "");
        setAiStreamMessage(text);
      };

      const payloadHandler = (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(String(event.data || "{}")) as AiInsightsPayload;
          aiInsightsRef.current = parsed;
          setAiInsights(parsed);
          setAiStreamMessage("Brief compiled. Formatting cards…");
        } catch (err) {
          console.error("[AI] Invalid payload", err);
          errorHandler("AI payload was unreadable.");
        }
      };

      const doneHandler = () => {
        aiLastJobRef.current = jobId;
        if (aiInsightsRef.current) {
          setAiStatus("ready");
          setAiStreamMessage("Brief ready.");
        } else {
          setAiStatus("error");
          setAiError("AI response never arrived. Please retry.");
        }
        closeSource();
      };

      const errorEventListener = (event: MessageEvent) => {
        const text = String(event.data || "");
        errorHandler(text || undefined);
      };

      const closeSource = () => {
        source.removeEventListener("chunk", chunkHandler as EventListener);
        source.removeEventListener("payload", payloadHandler as EventListener);
        source.removeEventListener("done", doneHandler);
        source.removeEventListener("error", errorEventListener);
        source.close();
        aiSourceRef.current = null;
      };

      function errorHandler(message?: string) {
        aiLastJobRef.current = jobId;
        setAiStatus("error");
        setAiError(message ?? "Unable to stream AI insight.");
        closeSource();
      }

      source.addEventListener("chunk", chunkHandler as EventListener);
      source.addEventListener("payload", payloadHandler as EventListener);
      source.addEventListener("done", doneHandler);
      source.addEventListener("error", errorEventListener);
      source.onmessage = chunkHandler;
      source.onerror = () => {
        if (source.readyState === EventSource.CLOSED) {
          errorHandler("Connection to AI service failed.");
        }
      };
    },
    [aiStatus],
  );

  const ga4Payload = jobDetails?.ga4Results || ga4Analytics;
  const readyForAi = jobDetails ? jobHasMeaningfulData(jobDetails) : false;
  const canAskAnalyst =
    Boolean(jobDetails?.id && readyForAi && aiStatus !== "streaming");

  if (!isClient) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center text-foreground">
        <div className="flex items-center gap-2 text-sm tracking-[0.4em] uppercase text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
          Booting monochrome surface
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Analysis Jobs"
        description="Create and manage your UX analysis jobs"
      />
      <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs tracking-[0.45em] uppercase text-muted-foreground">
              Lighthouse · Heatmaps · GA4
            </p>
            <h1 className="text-4xl md:text-5xl font-light text-foreground">
              Monochrome UX Radar
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Stream Gemini-powered guidance on every run. We stitch Lighthouse
              scores, attention heatmaps, and GA4 behavior traces into one
              black-and-white command surface.
            </p>
          </div>
          <div className="flex flex-col gap-3 items-start lg:items-end">
            <div className="flex flex-col gap-2">
              {!hasGoogleAuth ? (
                <Button
                  asChild
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <a href="http://localhost:8080/oauth2/authorization/google">
                    Link GA4 property
                  </a>
                </Button>
              ) : (
                <Badge className="bg-primary text-primary-foreground border border-primary/20 uppercase tracking-widest">
                  GA4 Linked
                </Badge>
              )}
              <Dialog open={isClarityDialogOpen} onOpenChange={handleClarityDialogChange}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black transition-colors"
                  >
                    {hasMicrosoftAuth ? "Manage Clarity token" : "Connect Microsoft Clarity"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background border-border text-foreground max-h-[90vh] overflow-y-auto">
                  <DialogHeader className="space-y-2">
                    <DialogTitle className="text-foreground text-2xl">
                      Connect Microsoft Clarity
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Provide your Clarity endpoint URL and export token.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 text-sm text-foreground/80">
                    <p>Enter your Clarity export endpoint URL and token to pull dashboards without Microsoft sign-in.</p>
                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                      <li>Enter your Clarity export endpoint URL (e.g., <span className="font-mono text-xs">https://www.clarity.ms/export-data/api/v1/project-live-insights</span>).</li>
                      <li>In Microsoft Clarity, open Settings &gt; Data Export &gt; Generate new API token (admins only).</li>
                      <li>Paste the generated API token below.</li>
                      <li>Enter your Clarity Project ID in the form when launching analysis.</li>
                      <li>
                        Your backend calls the export endpoint with{" "}
                        <span className="font-mono text-xs">Authorization: Bearer &lt;token&gt;</span>. The API returns dashboard metrics (rate limit ~10 calls/day/project, 1–3 day window, up to 3 dimensions and 1,000 rows).
                      </li>
                    </ol>
                    <div className="grid gap-1 text-xs text-muted-foreground">
                      <p>
                        <span className="font-semibold text-foreground">Pros:</span> fast, no user administration.
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">Cons:</span> users must handle secret entry/rotation.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                      {CLARITY_SOURCE_TAGS.map((source, index) => (
                        <span
                          key={`${source}-${index}`}
                          className="rounded border border-white/15 px-2 py-1"
                        >
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                  <form className="space-y-3" onSubmit={handleClarityTokenSubmit}>
                    <div className="space-y-2">
                      <Label
                        htmlFor="clarityToken"
                        className="text-muted-foreground uppercase text-xs tracking-[0.3em]"
                      >
                        Clarity API Token
                      </Label>
                      <Input
                        id="clarityToken"
                        type="password"
                        autoComplete="off"
                        className="bg-background border-input text-foreground"
                        value={clarityTokenInput}
                        onChange={(event) => setClarityTokenInput(event.target.value)}
                        placeholder="Enter your API token (NOT the endpoint URL)"
                      />
                      <p className="text-xs text-muted-foreground">
                        Get your API token from Clarity Settings → Data Export → Create API Token
                      </p>
                    </div>
                    {clarityTokenMessage && (
                      <p
                        className={cn(
                          "text-xs",
                          clarityTokenStatus === "error"
                            ? "text-red-300"
                            : "text-emerald-300",
                        )}
                      >
                        {clarityTokenMessage}
                      </p>
                    )}
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={clarityTokenStatus === "saving"}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {clarityTokenStatus === "saving"
                          ? "Validating..."
                          : "Done"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              {hasMicrosoftAuth && (
                <Badge className="bg-blue-500/20 text-blue-300 border border-blue-400/40 uppercase tracking-widest">
                  Clarity Connected
                </Badge>
              )}
            </div>
            {jobDetails?.status && (
              <Badge
                className={cn(
                  "flex items-center gap-2 border",
                  statusTheme[jobDetails.status].badge,
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    statusTheme[jobDetails.status].dot,
                  )}
                />
                {statusTheme[jobDetails.status].label}
              </Badge>
            )}
          </div>
        </header>


        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="bg-card border-border text-card-foreground">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Radio size={20} />
                Run an analysis
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Choose a live URL or upload a static design reference. We will
                trigger screenshotting, Lighthouse, and design parsing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={handleSubmit}>
              <Tabs
                value={activeTab}
                onValueChange={(value) =>
                  setActiveTab(value as "url" | "design")
                }
                className="w-full"
              >
                <TabsList className="bg-white/5">
                  <TabsTrigger value="url">
                    URL audit
                  </TabsTrigger>
                  <TabsTrigger value="design">
                    Design file
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="url" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="url" className="text-muted-foreground uppercase text-xs">
                      URL
                    </Label>
                    <Input
                      id="url"
                      type="url"
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      required
                      className="bg-background border-input text-foreground"
                      placeholder="https://"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pages" className="text-muted-foreground uppercase text-xs">
                      Crawl depth (max 10)
                    </Label>
                    <Input
                      id="pages"
                      type="number"
                      min={1}
                      max={10}
                      value={pages}
                      onChange={(event) =>
                        setPages(Number(event.target.value) || 1)
                      }
                      className="bg-background border-input text-foreground"
                    />
                  </div>
                  {hasGoogleAuth && Array.isArray(ga4Properties) && ga4Properties.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground uppercase text-xs">
                        GA4 Property
                      </Label>
                      <Select
                        value={selectedProperty}
                        onValueChange={setSelectedProperty}
                      >
                        <SelectTrigger className="bg-background border-input text-foreground">
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border text-popover-foreground">
                          {ga4Properties.map((property) => (
                            <SelectItem
                              key={property.property}
                              value={property.property}
                            >
                              {property.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {hasMicrosoftAuth && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground uppercase text-xs">
                        Clarity Project ID
                        {!selectedClarityProject && (
                          <span className="text-yellow-400 ml-2 text-[10px]">(Required)</span>
                        )}
                      </Label>
                      <Input
                        type="text"
                        value={selectedClarityProject}
                        onChange={(event) => {
                          console.log("[Frontend] Clarity project ID entered:", event.target.value);
                          setSelectedClarityProject(event.target.value);
                        }}
                        placeholder="Enter your Clarity project ID"
                        className="bg-background border-input text-foreground"
                      />
                      <p className="text-xs text-white/50">
                        Find your project ID in Microsoft Clarity Settings &gt; Project Settings
                      </p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="design" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground uppercase text-xs">
                      Figma, Webflow, or doc URL
                    </Label>
                    <Textarea
                      value={designInput}
                      onChange={(event) => setDesignInput(event.target.value)}
                      placeholder="https://www.figma.com/file/..."
                      className="bg-background border-input text-foreground min-h-[96px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground uppercase text-xs">
                      or choose multiple files
                    </Label>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={cn(
                        "border-2 border-dashed rounded-lg p-6 transition-colors",
                        isDragOver
                          ? "border-white bg-white/10"
                          : "border-white/20 bg-black/50 hover:border-white/40"
                      )}
                    >
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="text-center">
                          <p className="text-white/70 text-sm mb-2">
                            Drag and drop files here, or
                          </p>
                          <label className="cursor-pointer">
                            <span className="inline-flex items-center px-4 py-2 bg-white text-black rounded hover:bg-white/80 transition-colors text-sm">
                              Choose Files
                            </span>
                            <input
                              type="file"
                              multiple
                              onChange={handleFile}
                              className="hidden"
                              accept="image/*,.fig,.sketch,.psd,.xd"
                            />
                          </label>
                        </div>
                        {files.length > 0 && (
                          <div className="w-full space-y-2 mt-4">
                            {files.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10"
                              >
                                <span className="text-white/80 text-sm truncate flex-1">
                                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeFile(index)}
                                  className="ml-2 text-red-400 hover:text-red-300 text-sm"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {isUploading && (
                          <p className="text-white/60 text-sm">Uploading files...</p>
                        )}
                        {uploadedFiles.length > 0 && (
                          <div className="w-full space-y-2 mt-4">
                            <p className="text-white/60 text-xs uppercase tracking-wider">
                              Uploaded Files:
                            </p>
                            {uploadedFiles.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-green-500/10 rounded border border-green-500/20"
                              >
                                <span className="text-green-300 text-sm truncate flex-1">
                                  {file.fileName}
                                </span>
                                <a
                                  href={file.publicUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 text-green-400 hover:text-green-300 text-xs"
                                >
                                  View
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {error && (
                <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/40 rounded px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoading ? "Queueing..." : "Launch analysis"}
              </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 bg-card border-border text-card-foreground">
            <CardHeader className="flex flex-col gap-2">
              <CardTitle className="flex items-center gap-2 text-xl">
                <GaugeCircle size={20} />
                Lighthouse pulse
              </CardTitle>
              <CardDescription className="text-muted-foreground flex flex-wrap gap-2 items-center">
                {jobDetails?.startUrl ? (
                  <>
                    {jobDetails.startUrl}
                    <a
                      className="inline-flex items-center text-white hover:text-white/70"
                      href={jobDetails.startUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ArrowUpRight size={16} />
                    </a>
                  </>
                ) : (
                  "Waiting for an active job"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingLighthouse ? (
                <LighthouseLoadingSkeleton />
              ) : jobDetails ? (
                <>
                  <ScoreGrid job={jobDetails} />
                  <div className="rounded border border-white/10 p-4 text-sm text-white/60 font-mono">
                    <div className="flex items-center justify-between">
                      <span>Job ID</span>
                      <span>{jobDetails.id}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span>Type</span>
                      <span>{jobDetails.type}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span>Last update</span>
                      <span>{jobDetails.updatedAt ?? "—"}</span>
                    </div>
                  </div>
                </>
              ) : (
                <Skeleton className="h-48 w-full bg-white/5" />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 bg-card border-border text-card-foreground relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent_60%)]" />
            <CardHeader className="relative space-y-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles size={20} />
                  AI heatmap narrative
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!canAskAnalyst}
                  onClick={() => jobDetails?.id && startAiStream(jobDetails.id)}
                  className={cn(
                    "text-xs tracking-[0.3em] uppercase border-white/40",
                    !canAskAnalyst && "opacity-40 cursor-not-allowed",
                  )}
                >
                  {aiStatus === "streaming" ? "Analyzing…" : "Ask Senior UX Analyst"}
                </Button>
              </div>
              <CardDescription className="text-muted-foreground">
                A senior UX voice digests Lighthouse output, GA4 telemetry, and
                heatmap captures. Trigger it when you want a narrative.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <AiInsightsPanel
                insights={aiInsights}
                status={aiStatus}
                streamMessage={aiStreamMessage}
                readyForAi={readyForAi}
                jobLoaded={Boolean(jobDetails)}
                aiRequested={aiRequested}
                error={aiError}
              />
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/40">
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      {
                        streaming: "animate-pulse bg-white",
                        ready: "bg-white/60",
                        idle: "bg-white/20",
                        error: "bg-red-400",
                      }[aiStatus],
                    )}
                  />
                  {aiStatus === "streaming"
                    ? "Streaming"
                    : aiStatus === "ready"
                      ? "Complete"
                      : aiStatus === "error"
                        ? "Error"
                        : "Idle"}
                </span>
                <span>
                  {jobDetails?.status
                    ? statusTheme[jobDetails.status].label
                    : "Awaiting job"}
                </span>
              </div>
              {aiStatus !== "ready" && (
                <p className="text-white/40 text-[11px] tracking-[0.3em] uppercase">
                  {aiStatus === "error"
                    ? aiError ?? "Unable to generate insights."
                    : aiStreamMessage || "Standing by for signals…"}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border text-card-foreground">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Activity size={20} />
                GA4 pulse
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                28-day engagement snapshot from the linked GA4 property.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingGA4 ? (
                <GA4LoadingSkeleton />
              ) : ga4Payload && (ga4Payload.totalUsers || ga4Payload.sessions) ? (
                <GA4Visualizations data={ga4Payload} />
              ) : (
                <Ga4Panel ga4={ga4Payload} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-3 bg-card border-border text-card-foreground relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.3),_transparent_60%)]" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2 text-xl">
                <ScanEye size={20} />
                Microsoft Clarity Insights
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                User behavior analytics, session recordings, and interaction insights from Microsoft Clarity.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              {isLoadingClarity ? (
                <ClarityLoadingSkeleton />
              ) : jobDetails?.clarityInsights ? (
                <ClarityVisualizations 
                  data={jobDetails.clarityInsights} 
                  screenshotUrl={jobDetails.screenshots?.[0]?.imagePublicUrl || undefined}
                />
              ) : (
                <ClarityPanel clarity={jobDetails?.clarityInsights} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 bg-card border-border text-card-foreground">
            <CardHeader className="flex flex-col gap-2">
              <CardTitle className="flex items-center gap-2 text-xl">
                <ScanEye size={20} />
                Heatmap captures
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Screens are rendered in pure monochrome with live overlays from
                the capture pipeline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HeatmapGallery jobId={activeJobId} screenshots={jobDetails?.screenshots} />
            </CardContent>
          </Card>

          <Card className="bg-card border-border text-card-foreground">
            <CardHeader className="gap-2">
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListOrdered size={20} />
                Design insights
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Summary streamed from the design-analysis worker.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DesignPanel design={jobDetails?.designAnalysisResults} />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
    </div>
  );
}

// Loading Skeleton Components
const LoadingSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="h-full w-full bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] animate-shimmer rounded" />
  </div>
);

const LighthouseLoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="border border-white/10 rounded-lg p-4 space-y-3 bg-gradient-to-b from-white/5 to-transparent">
          <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
          <div className="h-8 w-16 bg-white/10 rounded animate-pulse" />
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full w-0 bg-white/20 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
    <div className="rounded border border-white/10 p-4 space-y-2">
      <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
      <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
      <div className="h-4 w-40 bg-white/10 rounded animate-pulse" />
    </div>
  </div>
);

const GA4LoadingSkeleton = () => (
  <div className="space-y-5 text-sm">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-xl border border-white/10 px-4 py-3 bg-gradient-to-b from-white/5 to-transparent">
          <div className="h-3 w-20 bg-white/10 rounded animate-pulse mb-2" />
          <div className="h-6 w-24 bg-white/10 rounded animate-pulse" />
        </div>
      ))}
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-white/10 p-4 space-y-3">
          <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3].map((j) => (
              <div key={j} className="rounded-lg border border-white/10 px-3 py-2 bg-white/5">
                <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ClarityLoadingSkeleton = () => (
  <div className="space-y-6 text-sm">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="rounded-xl border border-white/10 px-4 py-3 bg-gradient-to-b from-white/5 to-transparent">
          <div className="h-3 w-20 bg-white/10 rounded animate-pulse mb-2" />
          <div className="h-6 w-24 bg-white/10 rounded animate-pulse" />
        </div>
      ))}
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-white/10 px-4 py-3 bg-gradient-to-b from-white/5 to-transparent">
          <div className="h-3 w-20 bg-white/10 rounded animate-pulse mb-2" />
          <div className="h-6 w-24 bg-white/10 rounded animate-pulse" />
        </div>
      ))}
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-white/10 p-4 space-y-3">
          <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3].map((j) => (
              <div key={j} className="rounded-lg border border-white/10 px-3 py-2 bg-white/5">
                <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ScoreGrid = ({ job }: { job: Job }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {metricMeta.map(({ key, label }) => {
      const value = formatPercent(job[key]);
      return (
        <div
          key={key}
          className="border border-white/10 rounded-lg p-4 space-y-3 bg-gradient-to-b from-white/5 to-transparent"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            {label}
          </p>
          <p className="text-3xl font-light">{value}</p>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all"
              style={{ width: `${typeof job[key] === "number" ? job[key] : 5}%` }}
            />
          </div>
        </div>
      );
    })}
  </div>
);

const Ga4Panel = ({ ga4 }: { ga4?: GA4Results | null }) => {
  if (!ga4) {
    return (
      <div className="rounded-2xl border border-dashed border-white/20 p-6 text-sm text-white/60 space-y-2">
        <p className="text-white/80">No GA4 telemetry yet.</p>
        <p>
          Link a GA4 property and run a crawl; the analytics worker will paint
          these tiles with 28-day engagement metrics as soon as data lands.
        </p>
        <p className="text-xs text-white/40">
          Tip: the header button “Link GA4 property” starts OAuth for the active
          profile.
        </p>
      </div>
    );
  }

  const formatNumber = (value?: number | null) =>
    typeof value === "number" ? value.toLocaleString() : "—";
  const formatRate = (value?: number | null) =>
    typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "—";
  const formatSeconds = (value?: number | null) => {
    if (typeof value !== "number") return "—";
    const mins = Math.floor(value / 60);
    const secs = Math.round(value % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const statCards = [
    { label: "Users", value: formatNumber(ga4.totalUsers) },
    { label: "New Users", value: formatNumber(ga4.newUsers) },
    { label: "Sessions", value: formatNumber(ga4.sessions) },
    { label: "Engagement", value: formatRate(ga4.engagementRate) },
    {
      label: "Avg session",
      value: formatSeconds(ga4.averageSessionDuration),
    },
    {
      label: "Engaged sessions",
      value: formatNumber(ga4.engagedSessions),
    },
  ];

  const topPages = ga4.topPages ?? [];
  const topChannels = ga4.acquisitionChannels ?? ga4.trafficSources ?? [];
  const vitals = (ga4.coreWebVitals ?? []).filter(
    (v) => v.lcpMs || v.inpMs || v.cls,
  );

  return (
    <div className="space-y-5 text-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 px-4 py-3 bg-gradient-to-b from-white/5 to-transparent"
          >
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">
              {label}
            </p>
            <p className="text-2xl font-light text-white mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 p-4 space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">
            Top pages
          </p>
          {topPages.length === 0 ? (
            <p className="text-white/40 text-sm">
              No page-level events in this window.
            </p>
          ) : (
            <div className="space-y-2">
              {topPages.slice(0, 4).map((page) => (
                <div
                  key={`${page.pagePath}-${page.pageTitle}`}
                  className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2"
                >
                  <div className="max-w-[70%]">
                    <p className="text-white/80 truncate">{page.pagePath}</p>
                    {page.pageTitle && (
                      <p className="text-[11px] text-white/40 truncate">
                        {page.pageTitle}
                      </p>
                    )}
                  </div>
                  <span className="text-white/60 text-xs">
                    {page.views} views
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 p-4 space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">
            Acquisition mix
          </p>
          {topChannels.length === 0 ? (
            <p className="text-white/40 text-sm">
              Waiting for GA4 acquisition data.
            </p>
          ) : (
            <div className="space-y-2">
              {topChannels.slice(0, 4).map((channel) => (
                <div
                  key={
                    "channel" in channel
                      ? channel.channel
                      : `${channel.source}-${channel.medium}`
                  }
                  className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2"
                >
                  <div>
                    <p className="text-white/80">
                      {"channel" in channel
                        ? channel.channel
                        : `${channel.source} / ${channel.medium}`}
                    </p>
                    {"activeUsers" in channel && channel.activeUsers !== undefined && (
                      <p className="text-[11px] text-white/40">
                        {channel.activeUsers} active users
                      </p>
                    )}
                  </div>
                  <span className="text-white/60 text-xs">
                    {channel.sessions} sessions
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {vitals.length > 0 && (
        <div className="rounded-2xl border border-white/10 p-4 space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">
            Core Web Vitals
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {vitals.slice(0, 4).map((vital) => (
              <div
                key={vital.url}
                className="rounded-xl border border-white/10 px-3 py-2 bg-white/5"
              >
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                  {vital.url.replace(/^https?:\/\//, "")}
                </p>
                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                  {typeof vital.lcpMs === "number" && (
                    <span className="px-2 py-1 rounded-full bg-white/10 text-white/80">
                      LCP {(vital.lcpMs / 1000).toFixed(1)}s
                    </span>
                  )}
                  {typeof vital.inpMs === "number" && (
                    <span className="px-2 py-1 rounded-full bg-white/10 text-white/80">
                      INP {(vital.inpMs / 1000).toFixed(1)}s
                    </span>
                  )}
                  {typeof vital.cls === "number" && (
                    <span className="px-2 py-1 rounded-full bg-white/10 text-white/80">
                      CLS {vital.cls.toFixed(2)}
                    </span>
                  )}
                  {vital.error && (
                    <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-200">
                      {vital.error}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ClarityPanel = ({ clarity }: { clarity?: ClarityInsights | null }) => {
  if (!clarity) {
    return (
      <div className="rounded-2xl border border-dashed border-white/20 p-6 text-sm text-white/60 space-y-2">
        <p className="text-white/80">No Clarity insights yet.</p>
        <p>
          Configure your Microsoft Clarity API key to start receiving user behavior analytics,
          session recordings, and interaction insights.
        </p>
        <p className="text-xs text-white/40">
          Tip: Add your Clarity API key in settings to enable automatic data fetching.
        </p>
      </div>
    );
  }

  // Debug logging
  console.log("[ClarityPanel] Rendering with data:", {
    hasTrafficSources: !!clarity.trafficSources?.length,
    hasBrowsers: !!clarity.browsers?.length,
    hasDevices: !!clarity.devices?.length,
    hasOS: !!clarity.operatingSystems?.length,
    hasCountries: !!clarity.countries?.length,
    hasPageTitles: !!clarity.pageTitles?.length,
    hasPerformanceMetrics: !!clarity.performanceMetrics,
    hasDiagnosticEvents: !!clarity.diagnosticEvents?.length,
    clarityData: clarity,
  });

  const formatNumber = (value?: number | null) =>
    typeof value === "number" ? value.toLocaleString() : "—";
  const formatSeconds = (value?: number | null) => {
    if (typeof value !== "number") return "—";
    const mins = Math.floor(value / 60);
    const secs = Math.round(value % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };
  const formatPercentage = (value?: number | null) =>
    typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "—";

  const statCards = [
    { label: "Sessions", value: formatNumber(clarity.totalSessions) },
    { label: "Recordings", value: formatNumber(clarity.totalRecordings) },
    { label: "Active Users", value: formatNumber(clarity.activeUsers) },
    {
      label: "Avg Engagement",
      value: formatSeconds(clarity.averageEngagementSeconds),
    },
    {
      label: "Scroll Depth",
      value: formatPercentage(clarity.averageScrollDepth),
    },
  ];

  const behaviorCards = [
    { label: "Rage Clicks", value: formatNumber(clarity.rageClicks), color: "text-red-300" },
    { label: "Dead Clicks", value: formatNumber(clarity.deadClicks), color: "text-yellow-300" },
    { label: "Quick Backs", value: formatNumber(clarity.quickBacks), color: "text-orange-300" },
  ];

  const topIssues = clarity.topIssues ?? [];
  const heatmaps = clarity.heatmaps ?? [];
  const sessions = clarity.standoutSessions ?? [];

  return (
    <div className="space-y-6 text-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 px-4 py-3 bg-gradient-to-b from-white/5 to-transparent"
          >
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">
              {label}
            </p>
            <p className="text-2xl font-light text-white mt-1">{value}</p>
          </div>
        ))}
      </div>

      {behaviorCards.some(c => c.value !== "—") && (
        <div className="grid gap-3 sm:grid-cols-3">
          {behaviorCards.map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 px-4 py-3 bg-gradient-to-b from-white/5 to-transparent"
            >
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">
                {label}
              </p>
              <p className={`text-2xl font-light ${color} mt-1`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {topIssues.length > 0 && (
          <div className="rounded-2xl border border-white/10 p-4 space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">
              Top Issues
            </p>
            <div className="space-y-2">
              {topIssues.slice(0, 5).map((issue, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-white/10 px-3 py-2 bg-white/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-sm font-medium truncate">
                        {issue.title || "Unknown Issue"}
                      </p>
                      {issue.description && (
                        <p className="text-[11px] text-white/40 mt-1 line-clamp-2">
                          {issue.description}
                        </p>
                      )}
                      {issue.severity && (
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.2em] ${
                          issue.severity.toLowerCase() === "high" ? "bg-red-500/20 text-red-300" :
                          issue.severity.toLowerCase() === "medium" ? "bg-yellow-500/20 text-yellow-300" :
                          "bg-blue-500/20 text-blue-300"
                        }`}>
                          {issue.severity}
                        </span>
                      )}
                    </div>
                    {issue.value !== null && issue.value !== undefined && (
                      <span className="text-white/60 text-xs whitespace-nowrap">
                        {typeof issue.value === "number" ? issue.value.toFixed(1) : issue.value}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {heatmaps.length > 0 && (
          <div className="rounded-2xl border border-white/10 p-4 space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">
              Top Pages
            </p>
            <div className="space-y-2">
              {heatmaps.slice(0, 5).map((heatmap, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 bg-white/5"
                >
                  <div className="max-w-[70%] min-w-0">
                    <p className="text-white/80 truncate text-sm">
                      {heatmap.pageUrl?.replace(/^https?:\/\//, "") || "Unknown Page"}
                    </p>
                    <div className="flex gap-2 mt-1 text-[11px] text-white/40">
                      {heatmap.clickRate !== null && heatmap.clickRate !== undefined && (
                        <span>Click: {formatPercentage(heatmap.clickRate)}</span>
                      )}
                      {heatmap.scrollDepth !== null && heatmap.scrollDepth !== undefined && (
                        <span>Scroll: {formatPercentage(heatmap.scrollDepth)}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-white/60 text-xs whitespace-nowrap">
                    {heatmap.views} views
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {sessions.length > 0 && (
          <div className="rounded-2xl border border-white/10 p-4 space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">
              Standout Sessions
            </p>
            <div className="space-y-2">
              {sessions.slice(0, 5).map((session, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-white/10 px-3 py-2 bg-white/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-sm truncate">
                        {session.entryPage?.replace(/^https?:\/\//, "") || "Unknown Entry"}
                      </p>
                      <div className="flex gap-2 mt-1 text-[11px] text-white/40">
                        {session.durationSeconds !== null && session.durationSeconds !== undefined && (
                          <span>{formatSeconds(session.durationSeconds)}</span>
                        )}
                        {session.interactions !== null && session.interactions !== undefined && (
                          <span>• {session.interactions} interactions</span>
                        )}
                        {session.device && (
                          <span>• {session.device}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Traffic Sources */}
      {clarity.trafficSources && clarity.trafficSources.length > 0 && (
        <div className="rounded-2xl border border-white/10 p-4 space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">
            Traffic Sources
          </p>
          <div className="space-y-2">
            {clarity.trafficSources.slice(0, 5).map((source, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 bg-white/5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-sm truncate">
                    {source.source || "Direct"}
                  </p>
                  {source.medium && (
                    <p className="text-[11px] text-white/40 mt-1">{source.medium}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-xs">
                    {formatNumber(source.sessionsCount)} sessions
                  </p>
                  {source.percentage !== undefined && source.percentage !== null && (
                    <p className="text-[10px] text-white/40">
                      {source.percentage.toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Device & Browser Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        {clarity.devices && clarity.devices.length > 0 && (
          <div className="rounded-2xl border border-white/10 p-4 space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">
              Device Types
            </p>
            <div className="space-y-2">
              {clarity.devices.slice(0, 5).map((device, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 bg-white/5"
                >
                  <p className="text-white/80 text-sm">{device.type || "Unknown"}</p>
                  <div className="text-right">
                    <p className="text-white/60 text-xs">
                      {formatNumber(device.sessionsCount)} sessions
                    </p>
                    {device.percentage !== undefined && device.percentage !== null && (
                      <p className="text-[10px] text-white/40">
                        {device.percentage.toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {clarity.browsers && clarity.browsers.length > 0 && (
          <div className="rounded-2xl border border-white/10 p-4 space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">
              Browsers
            </p>
            <div className="space-y-2">
              {clarity.browsers.slice(0, 5).map((browser, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 bg-white/5"
                >
                  <p className="text-white/80 text-sm">{browser.name || "Unknown"}</p>
                  <div className="text-right">
                    <p className="text-white/60 text-xs">
                      {formatNumber(browser.sessionsCount)} sessions
                    </p>
                    {browser.percentage !== undefined && browser.percentage !== null && (
                      <p className="text-[10px] text-white/40">
                        {browser.percentage.toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Operating Systems & Countries */}
      <div className="grid gap-4 md:grid-cols-2">
        {clarity.operatingSystems && clarity.operatingSystems.length > 0 && (
          <div className="rounded-2xl border border-white/10 p-4 space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">
              Operating Systems
            </p>
            <div className="space-y-2">
              {clarity.operatingSystems.slice(0, 5).map((os, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 bg-white/5"
                >
                  <p className="text-white/80 text-sm">{os.name || "Unknown"}</p>
                  <div className="text-right">
                    <p className="text-white/60 text-xs">
                      {formatNumber(os.sessionsCount)} sessions
                    </p>
                    {os.percentage !== undefined && os.percentage !== null && (
                      <p className="text-[10px] text-white/40">
                        {os.percentage.toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {clarity.countries && clarity.countries.length > 0 && (
          <div className="rounded-2xl border border-white/10 p-4 space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">
              Countries
            </p>
            <div className="space-y-2">
              {clarity.countries.slice(0, 5).map((country, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 bg-white/5"
                >
                  <p className="text-white/80 text-sm">{country.name || "Unknown"}</p>
                  <div className="text-right">
                    <p className="text-white/60 text-xs">
                      {formatNumber(country.sessionsCount)} sessions
                    </p>
                    {country.percentage !== undefined && country.percentage !== null && (
                      <p className="text-[10px] text-white/40">
                        {country.percentage.toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      {clarity.performanceMetrics && (
        <div className="rounded-2xl border border-white/10 p-4 space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">
            Performance Metrics
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {clarity.performanceMetrics.botSessions !== undefined && (
              <div className="rounded-lg border border-white/10 px-3 py-2 bg-white/5">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Bot Sessions
                </p>
                <p className="text-xl font-light text-white mt-1">
                  {formatNumber(clarity.performanceMetrics.botSessions)}
                </p>
              </div>
            )}
            {clarity.performanceMetrics.pagesPerSession !== undefined && 
             clarity.performanceMetrics.pagesPerSession !== null && (
              <div className="rounded-lg border border-white/10 px-3 py-2 bg-white/5">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Pages/Session
                </p>
                <p className="text-xl font-light text-white mt-1">
                  {clarity.performanceMetrics.pagesPerSession.toFixed(1)}
                </p>
              </div>
            )}
            {clarity.performanceMetrics.totalTime !== undefined && (
              <div className="rounded-lg border border-white/10 px-3 py-2 bg-white/5">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Total Time
                </p>
                <p className="text-xl font-light text-white mt-1">
                  {formatSeconds(clarity.performanceMetrics.totalTime)}
                </p>
              </div>
            )}
            {clarity.performanceMetrics.activeTime !== undefined && (
              <div className="rounded-lg border border-white/10 px-3 py-2 bg-white/5">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Active Time
                </p>
                <p className="text-xl font-light text-white mt-1">
                  {formatSeconds(clarity.performanceMetrics.activeTime)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Diagnostic Events */}
      {clarity.diagnosticEvents && clarity.diagnosticEvents.length > 0 && (
        <div className="rounded-2xl border border-white/10 p-4 space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">
            Diagnostic Events
          </p>
          <div className="space-y-2">
            {clarity.diagnosticEvents.slice(0, 5).map((event, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-white/10 px-3 py-2 bg-white/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm font-medium">
                      {event.eventType || "Unknown Event"}
                    </p>
                    <div className="flex gap-2 mt-1 text-[11px] text-white/40">
                      {event.count !== undefined && (
                        <span>Count: {formatNumber(event.count)}</span>
                      )}
                      {event.sessionsAffected !== undefined && (
                        <span>• Sessions: {formatNumber(event.sessionsAffected)}</span>
                      )}
                      {event.percentage !== undefined && event.percentage !== null && (
                        <span>• {event.percentage.toFixed(1)}%</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Page Titles */}
      {clarity.pageTitles && clarity.pageTitles.length > 0 && (
        <div className="rounded-2xl border border-white/10 p-4 space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">
            Page Titles
          </p>
          <div className="space-y-2">
            {clarity.pageTitles.slice(0, 5).map((page, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 bg-white/5"
              >
                <p className="text-white/80 text-sm truncate max-w-[70%]">
                  {page.title || "Unknown"}
                </p>
                <div className="text-right">
                  <p className="text-white/60 text-xs">
                    {formatNumber(page.sessionsCount)} sessions
                  </p>
                  {page.percentage !== undefined && page.percentage !== null && (
                    <p className="text-[10px] text-white/40">
                      {page.percentage.toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show message only if absolutely no data */}
      {topIssues.length === 0 && 
       heatmaps.length === 0 && 
       sessions.length === 0 && 
       (!clarity.trafficSources || clarity.trafficSources.length === 0) &&
       (!clarity.devices || clarity.devices.length === 0) &&
       (!clarity.browsers || clarity.browsers.length === 0) &&
       (!clarity.operatingSystems || clarity.operatingSystems.length === 0) &&
       (!clarity.countries || clarity.countries.length === 0) &&
       (!clarity.pageTitles || clarity.pageTitles.length === 0) &&
       !clarity.performanceMetrics &&
       (!clarity.diagnosticEvents || clarity.diagnosticEvents.length === 0) && (
        <div className="rounded-2xl border border-dashed border-white/20 p-6 text-center text-white/40 text-sm">
          <p>No detailed insights available yet.</p>
          <p className="text-xs mt-2">Clarity data will populate as users interact with your site.</p>
        </div>
      )}
    </div>
  );
};

const HeatmapGallery = ({
  jobId,
  screenshots,
}: {
  jobId: string | null;
  screenshots?: Screenshot[];
}) => {
  const [heatmapMode, setHeatmapMode] = useState<'ai' | 'd3'>('d3');

  if (!screenshots || screenshots.length === 0) {
    return (
      <div className="text-white/40 border border-dashed border-white/20 rounded-lg p-10 text-center text-sm">
        Heatmap captures will appear here once the crawler uploads them.
      </div>
    );
  }

  // Generate sample D3 heatmap data from screenshots
  const generateD3HeatmapData = (screenshot: Screenshot): HeatmapDataPoint[] => {
    // This generates sample click data - in production, this would come from Clarity API
    const points: HeatmapDataPoint[] = [];
    const clickAreas = [
      { x: 0.5, y: 0.08, intensity: 15 },  // Top header/nav
      { x: 0.2, y: 0.15, intensity: 10 },  // Logo area
      { x: 0.8, y: 0.15, intensity: 8 },   // Menu/CTA
      { x: 0.3, y: 0.35, intensity: 12 },  // Left content
      { x: 0.7, y: 0.35, intensity: 9 },   // Right sidebar
      { x: 0.5, y: 0.5, intensity: 14 },   // Main content center
      { x: 0.5, y: 0.65, intensity: 16 },  // Primary CTA
      { x: 0.3, y: 0.75, intensity: 7 },   // Secondary content
      { x: 0.7, y: 0.75, intensity: 6 },   // Tertiary content
      { x: 0.5, y: 0.92, intensity: 5 },   // Footer
    ];

    clickAreas.forEach(area => {
      // Generate more points for higher intensity
      const numPoints = area.intensity * 8;
      for (let i = 0; i < numPoints; i++) {
        points.push({
          x: Math.max(0, Math.min(1, area.x + (Math.random() - 0.5) * 0.12)),
          y: Math.max(0, Math.min(1, area.y + (Math.random() - 0.5) * 0.12)),
          value: area.intensity + Math.random() * 4,
          label: 'Click',
        });
      }
    });

    return points;
  };

  return (
    <div className="space-y-4">
      {/* Heatmap Mode Toggle */}
      <div className="flex items-center gap-2 pb-2 border-b border-white/10">
        <span className="text-xs uppercase tracking-[0.3em] text-white/40">Heatmap Type:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setHeatmapMode('ai')}
            className={cn(
              "px-3 py-1 text-xs rounded-md transition-colors",
              heatmapMode === 'ai'
                ? "bg-primary text-primary-foreground"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            )}
          >
            AI Attention
          </button>
          <button
            onClick={() => setHeatmapMode('d3')}
            className={cn(
              "px-3 py-1 text-xs rounded-md transition-colors",
              heatmapMode === 'd3'
                ? "bg-primary text-primary-foreground"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            )}
          >
            D3.js Interactive
          </button>
        </div>
      </div>

      <ScrollArea className="h-[420px] pr-4">
        <div className="space-y-4">
          {screenshots.map((shot) => {
            const screenshotUrl = buildAssetUrl(
              shot.imagePublicUrl ?? shot.imageStoragePath,
            );
            const heatmapUrl = buildAssetUrl(
              shot.heatmapPublicUrl ?? shot.heatmapStoragePath,
            );
            const d3HeatmapData = generateD3HeatmapData(shot);

            return (
              <div
                key={shot.id}
                className="border border-white/10 rounded-lg overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/40">
                  <span className="truncate text-white/70">{shot.pageUrl}</span>
                  <a
                    className="flex items-center gap-1 text-white hover:text-white/70"
                    href={shot.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Visit <ArrowUpRight size={14} />
                  </a>
                </div>
                <div className="bg-black border-t border-white/10">
                  {heatmapMode === 'ai' ? (
                    screenshotUrl ? (
                      <HeatmapOverlay
                        imageUrl={proxied(screenshotUrl)}
                        uploadUrl={
                          jobId
                            ? `${API_URL}/me/${jobId}/screenshots/${shot.id}/heatmap`
                            : undefined
                        }
                        heatmapUrl={heatmapUrl}
                        screenshotId={shot.id}
                      />
                    ) : (
                      <Skeleton className="h-64 w-full bg-white/5" />
                    )
                  ) : (
                    screenshotUrl ? (
                      <D3Heatmap
                        data={d3HeatmapData}
                        backgroundImage={proxied(screenshotUrl)}
                        height={500}
                        heatmapType="click"
                        colorScheme="hot"
                        showExport={true}
                      />
                    ) : (
                      <Skeleton className="h-[500px] w-full bg-white/5" />
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

const DesignPanel = ({ design }: { design?: DesignAnalysisResult }) => {
  if (!design?.summary) {
    return (
      <div className="rounded-2xl border border-dashed border-white/20 p-6 text-center text-sm text-white/50 space-y-2">
        <p>The design-analysis worker is still mapping the mock.</p>
        <p className="text-xs text-white/40">
          Once screenshots drop, this panel fills with hierarchy notes and
          component cues automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-transparent to-transparent p-5">
        <p className="text-white/90 leading-relaxed">{design.summary}</p>
      </div>
      {design.keyPoints && design.keyPoints.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-xs">
          {design.keyPoints.map((point, index) => (
            <li
              key={`${point}-${index}`}
              className="px-3 py-2 rounded-full border border-white/15 bg-white/5 text-white/80"
            >
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const AiInsightsPanel = ({
  insights,
  status,
  streamMessage,
  readyForAi,
  jobLoaded,
  aiRequested,
  error,
}: {
  insights: AiInsightsPayload | null;
  status: "idle" | "streaming" | "ready" | "error";
  streamMessage: string;
  readyForAi: boolean;
  jobLoaded: boolean;
  aiRequested: boolean;
  error: string | null;
}) => {
  if (!insights) {
    let message = "Click “Ask Senior UX Analyst” to stream a live briefing.";
    if (status === "error") {
      message = error ?? "Unable to generate insights.";
    } else if (!jobLoaded) {
      message = "Run an analysis to receive commentary.";
    } else if (!readyForAi) {
      message =
        "Waiting for Lighthouse, GA4, and heatmap data before the analyst can weigh in.";
    } else if (aiRequested) {
      message = streamMessage || "Connecting to senior analyst…";
    }
    return (
      <div className="min-h-[220px] rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-transparent to-transparent p-6 text-sm text-white/60">
        {message}
      </div>
    );
  }

  const pulse = insights.pulse ?? {};
  const normalizedScorecard = SCORECARD_LABELS.map((label) => {
    const entry = insights.scorecard?.find(
      (score) => score.label.toLowerCase() === label.toLowerCase(),
    );
    return {
      label,
      score: entry?.score ?? null,
      narrative: entry?.narrative ?? "-",
    };
  });

  const heatmapEntries = (insights.heatmaps ?? []).slice(0, 3);
  const signals = [
    { label: "GA4", value: insights.dataSignals?.ga4 },
    { label: "Clarity", value: insights.dataSignals?.clarity },
    { label: "AB Stack", value: insights.dataSignals?.abStack },
    { label: "Design Ref", value: insights.dataSignals?.designRef },
  ];
  const vitals = insights.dataSignals?.coreWebVitals ?? [];
  const actions = (insights.actions ?? []).slice(0, 3);

  return (
    <div className="space-y-6 text-sm">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-transparent to-transparent p-5 space-y-2">
        <p className="text-[11px] uppercase tracking-[0.4em] text-white/40">
          UX pulse
        </p>
        <p className="text-2xl font-light text-white">
          {pulse.headline ?? "—"}
        </p>
        <p className="text-white/70">{pulse.supporting ?? "—"}</p>
        <p className="text-white/50 italic">{pulse.impact ?? "—"}</p>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-[0.4em] text-white/40 mb-2">
          Scorecard
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {normalizedScorecard.map(({ label, score, narrative }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 p-4 bg-white/5"
            >
              <div className="flex items-center justify-between">
                <p className="text-white/70">{label}</p>
                <span className="text-3xl font-light text-white">
                  {score !== null && score !== undefined
                    ? Math.round(score)
                    : "—"}
                </span>
              </div>
              <p className="text-white/55 text-xs mt-2 leading-relaxed">
                {narrative}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-[0.4em] text-white/40 mb-2">
          Heatmap dossier
        </p>
        {heatmapEntries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-4 text-white/50">
            No heatmaps available.
          </p>
        ) : (
          <div className="space-y-3">
            {heatmapEntries.map((entry) => (
              <div
                key={`${entry.rank}-${entry.page}`}
                className="rounded-2xl border border-white/10 p-4 bg-black/30 space-y-2"
              >
                <p className="text-xs text-white/50">
                  [#{entry.rank}] {entry.page}
                </p>
                <div className="grid gap-2 sm:grid-cols-3 text-xs text-white/70">
                  <div>
                    <p className="uppercase tracking-[0.3em] text-white/30 text-[10px]">
                      Attention
                    </p>
                    <p>{entry.attentionSignal ?? "-"}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-[0.3em] text-white/30 text-[10px]">
                      Friction
                    </p>
                    <p>{entry.frictionSource ?? "-"}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-[0.3em] text-white/30 text-[10px]">
                      Conversion hook
                    </p>
                    <p>{entry.conversionHook ?? "-"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.4em] text-white/40">
          Data signals
        </p>
        <div className="flex flex-wrap gap-3">
          {signals.map(({ label, value }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 px-4 py-3 bg-white/5 w-full md:w-auto md:max-w-sm"
            >
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">
                {label}
              </p>
              <p className="text-white/80 text-sm mt-1">
                {value && value !== "-" ? value : "—"}
              </p>
            </div>
          ))}
        </div>
        {vitals.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {vitals.map((vital) => (
              <span
                key={`${vital.metric}-${vital.value}`}
                className="px-3 py-1 rounded-full border border-white/15 text-white/75"
              >
                {vital.metric}: {vital.value}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-[0.4em] text-white/40 mb-2">
          Action board
        </p>
        {actions.length === 0 ? (
          <p className="text-white/50 text-sm">
            AI returned no specific actions for this run.
          </p>
        ) : (
          <div className="space-y-3">
            {actions.map((action, index) => (
              <div
                key={`${action.title}-${index}`}
                className="rounded-2xl border border-white/10 p-4 space-y-1 bg-white/5"
              >
                <p className="text-xs text-white/40 uppercase tracking-[0.3em]">
                  {index + 1}
                </p>
                <p className="text-white text-base">{action.title}</p>
                <p className="text-white/70 text-sm">{action.description}</p>
                <p className="text-white/50 text-xs">
                  Success: {action.successMetric}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
