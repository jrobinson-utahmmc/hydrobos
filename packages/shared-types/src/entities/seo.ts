// ── SEO Package Types ──

/** SEO analysis strategy */
export type SeoStrategy = 'mobile' | 'desktop';

/** Core Web Vital scores returned by PageSpeed analysis */
export interface SeoScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

/** An SEO analysis result */
export interface SeoAnalysisResult {
  url: string;
  strategy: SeoStrategy;
  scores: SeoScores;
  overallScore: number;
  auditCount: number;
  recommendationCount: number;
  recommendations?: SeoRecommendation[];
  aiInsights?: string;
  snapshot?: string;
  analyzedAt: string;
}

/** A single SEO recommendation */
export interface SeoRecommendation {
  title: string;
  description?: string;
  impact: 'high' | 'medium' | 'low';
  category?: string;
}

/** SEO analysis request */
export interface RunSeoAnalysisDto {
  url: string;
  strategy?: SeoStrategy;
  includeAiInsights?: boolean;
  includeAhrefs?: boolean;
  projectId?: string;
}

/** SEO content generation request */
export interface GenerateSeoContentDto {
  templateId: string;
  items: Record<string, any>[];
  options?: Record<string, any>;
}

/** SEO AI chat request */
export interface SeoAiChatDto {
  message: string;
  context?: Record<string, any>;
}

/** SEO AI analysis request */
export interface SeoAiAnalyzeDto {
  content: string;
  analysisType?: 'seo' | 'content' | 'structure' | 'general';
}

/** SEO file operation request */
export interface SeoFileOperationDto {
  type: 'create' | 'modify' | 'delete' | 'rename';
  path: string;
  content?: string;
  newPath?: string;
  overwrite?: boolean;
}

/** SEO project */
export interface SeoProject {
  name: string;
  path: string;
  framework?: string;
  createdBy: string;
  lastAnalyzedAt?: string;
  config?: Record<string, any>;
}

/** Ahrefs domain overview */
export interface AhrefsDomainOverview {
  domainRating?: number;
  organicTraffic?: number;
  organicKeywords?: number;
  backlinks?: number;
  referringDomains?: number;
}

/** Ahrefs backlink entry */
export interface AhrefsBacklink {
  urlFrom: string;
  anchor?: string;
  domainRating?: number;
  type?: string;
}

/** Ahrefs keyword entry */
export interface AhrefsKeyword {
  keyword: string;
  position: number;
  volume: number;
  traffic: number;
  difficulty?: number;
}

/** Ahrefs competitor entry */
export interface AhrefsCompetitor {
  domain: string;
  commonKeywords?: number;
  organicTraffic?: number;
  domainRating?: number;
}

/** Full Ahrefs domain report */
export interface AhrefsFullReport {
  overview?: AhrefsDomainOverview;
  backlinks?: AhrefsBacklink[];
  keywords?: AhrefsKeyword[];
  competitors?: AhrefsCompetitor[];
}
