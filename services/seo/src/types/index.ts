/**
 * SEO Applet — Type Definitions
 *
 * Ported from del_when_sone_SEO_optimizer and adapted for CommonJS.
 * These types are internal to the SEO service; cross-service types live in
 * @hydrobos/shared-types.
 */

// ── Project Types ──

export interface ProjectStructure {
  folders: FolderInfo[];
  templates: TemplateInfo[];
  components: ComponentInfo[];
  styles: StyleInfo[];
  content: ContentInfo[];
  images: ImageInfo[];
  sitemaps: SitemapInfo[];
  config: ConfigInfo;
}

export interface FolderInfo { path: string; type: 'app' | 'components' | 'content' | 'public' | 'lib' | 'types' | 'other'; files: number; description?: string; }
export interface TemplateInfo { name: string; path: string; type: string; props?: string[]; }
export interface ComponentInfo { name: string; path: string; category: 'ui' | 'layout' | 'section' | 'form' | 'template'; exports: string[]; }
export interface StyleInfo { path: string; type: 'global' | 'module' | 'component'; variables?: string[]; }
export interface ContentInfo { path: string; type: 'cities' | 'services' | 'products' | 'guides' | 'blog' | 'static'; items: string[]; }
export interface ImageInfo { folder: string; count: number; formats: string[]; samples: string[]; }
export interface SitemapInfo { path: string; urls: number; types: string[]; }
export interface ConfigInfo { framework: string; typescript: boolean; styling: string[]; deployment: string; }

// ── SEO / Lighthouse Types ──

export interface LighthouseResult {
  url: string;
  scores: { performance: number; accessibility: number; bestPractices: number; seo: number };
  audits: LighthouseAudit[];
  timestamp: string;
  strategy?: 'mobile' | 'desktop';
  lighthouseVersion?: string;
  fetchTime?: string;
  requestedUrl?: string;
  finalUrl?: string;
  cruxData?: CruxData;
  categories?: Record<string, { score?: number }>;
}

export interface CruxData {
  overallCategory?: string;
  fcp?: CruxMetric;
  lcp?: CruxMetric;
  cls?: CruxMetric;
  inp?: CruxMetric;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  firstContentfulPaint?: number;
  interactionToNextPaint?: number;
  timeToFirstByte?: number;
}
export interface CruxMetric { percentile?: number; category?: 'FAST' | 'AVERAGE' | 'SLOW'; distributions?: Array<{ min: number; max?: number; proportion: number }>; }
export interface LighthouseAudit { id: string; title: string; description: string; score: number | null; scoreDisplayMode: string; details?: any; displayValue?: string; }
export interface SEORecommendation { type?: 'performance' | 'accessibility' | 'seo' | 'best-practices'; category?: string; priority: 'critical' | 'high' | 'medium' | 'low'; title: string; description: string; impact?: string; auditId?: string; score?: number; id?: string; }

// ── Content Types ──

export interface MissingPage { path: string; type: 'city' | 'service' | 'product' | 'guide' | 'blog' | 'static' | 'unknown'; slug: string; suggestedAction: string; template?: string; targetPath?: string; }
export interface GenerationProgress { id: string; status: 'queued' | 'generating' | 'writing' | 'complete' | 'error'; slug: string; type: string; message?: string; content?: Record<string, unknown>; filePath?: string; }
export interface GenerationConfig { apiKey?: string; model?: string; maxTokens?: number; temperature?: number; concurrency?: number; systemPrompt?: string; outputDir?: string; templateId?: string; items?: Array<Record<string, string>>; options?: Record<string, unknown>; }
export interface ContentTemplate { id: string; name: string; type?: string; schema?: Record<string, unknown>; prompt?: string; description?: string; seoFields?: string[]; variables?: string[]; category?: string; }

// ── Image Types ──

export interface ImageAnalysis { path: string; filename: string; size: number; dimensions?: { width: number; height: number }; labels?: string[]; objects?: string[]; text?: string[]; suggestedName?: string; suggestedAlt?: string; category?: string; }

// ── File Operation Types ──

export interface FileOperation { type: 'create' | 'edit' | 'modify' | 'move' | 'rename' | 'delete' | 'createFolder'; sourcePath?: string; targetPath?: string; path?: string; newPath?: string; content?: string; overwrite?: boolean; }
export interface FileOperationResult { success: boolean; message: string; path?: string; }
export interface DirectoryEntry { name: string; path: string; type: 'file' | 'folder'; isDirectory: boolean; size?: number; }

// ── API Types ──

export interface APIResponse<T = unknown> { success: boolean; data?: T; error?: string; timestamp: string; }
export interface SSEEvent { event: string; data: unknown; timestamp: string; }

// ── Integration Types ──

export interface IntegrationConfig { name: string; apiKey?: string; baseUrl?: string; enabled: boolean; rateLimit?: number; }
export interface ClaudeAPIConfig extends IntegrationConfig { model: string; maxTokens: number; temperature: number; }
export interface GoogleAPIConfig extends IntegrationConfig { projectId?: string; clientEmail?: string; }

// ── AHREFS Types ──

export interface AhrefsDomainOverview { domain: string; domainRating: number; urlRating: number; backlinks: number; referringDomains: number; organicKeywords: number; organicTraffic: number; paidKeywords: number; paidTraffic: number; timestamp: string; }
export interface AhrefsBacklink { urlFrom: string; urlTo: string; anchor: string; domainRatingSource: number; firstSeen: string; lastSeen: string; isDoFollow: boolean; httpCode: number; urlFromTitle: string; }
export interface AhrefsBacklinksResult { domain: string; totalBacklinks: number; backlinks: AhrefsBacklink[]; timestamp: string; }
export interface AhrefsKeyword { keyword: string; volume: number; difficulty: number; cpc: number; position: number; url: string; traffic: number; trafficPercentage: number; }
export interface AhrefsOrganicKeywordsResult { domain: string; totalKeywords: number; keywords: AhrefsKeyword[]; timestamp: string; }
export interface AhrefsKeywordIdea { keyword: string; volume: number; difficulty: number; cpc: number; clicks: number; returnRate: number; parentTopic: string; parentTopicVolume: number; }
export interface AhrefsKeywordResearchResult { seedKeyword: string; country: string; totalIdeas: number; keywords: AhrefsKeywordIdea[]; timestamp: string; }
export interface AhrefsCompetitorDomain { domain: string; commonKeywords: number; organicTraffic: number; organicKeywords: number; domainRating: number; }
export interface AhrefsCompetitorResult { domain: string; competitors: AhrefsCompetitorDomain[]; timestamp: string; }

// ── AI Types ──

export interface AIInsight { type: string; priority: 'high' | 'medium' | 'low'; title: string; description: string; action?: { type: string; details: Record<string, unknown> }; source?: string; timestamp?: number; }
