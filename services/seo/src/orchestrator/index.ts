/**
 * SEO Orchestrator — Central coordination layer that composes services + integrations
 * into higher-level workflows. This is the heart of the orchestrator pattern.
 *
 * Each workflow method coordinates multiple service calls, manages state flow,
 * and broadcasts real-time progress via SSE.
 */

import { analyzeProject } from '../services/project-reader';
import { runPageSpeedAnalysis, getAnalysisHistory, Strategy } from '../services/seo-analyzer';
import { getTemplates, generatePages, generatePreview } from '../services/content-generator';
import { listDirectory, readFile, getImageFiles, executeOperation, exportImagesCSV } from '../services/file-manager';
import { callClaudeJSON, chat as claudeChat, analyze as claudeAnalyze, getAvailableModels } from '../integrations/anthropic';
import { analyzeImageWithVision, batchAnalyzeImages } from '../integrations/google';
import * as ahrefs from '../integrations/ahrefs';
import { ProjectStructure, FileOperation, GenerationConfig, ImageAnalysis, ImageInfo, SEORecommendation } from '../types';
import { broadcastProgress, broadcastNotification } from '../lib/sse';
import { logInfo, logError, logWarn, startTimer } from '../lib/logger';

// ── In-memory state (per-session; persistent state is in MongoDB) ──────────

let currentProjectPath: string | null = null;
let currentProjectStructure: ProjectStructure | null = null;
let lastAnalysisResult: any = null;

// ── Project workflows ──────────────────────────────────────────────────────

export function loadProject(projectPath: string): ProjectStructure {
  const timer = startTimer('ORCHESTRATOR', 'Load project');
  broadcastProgress('project', 1, 10);

  currentProjectPath = projectPath;
  currentProjectStructure = analyzeProject(projectPath);

  broadcastProgress('project', 10, 10);
  broadcastNotification('success', `Project loaded: ${currentProjectStructure.config.framework}`);
  timer.complete('Project loaded');
  return currentProjectStructure;
}

export function getProjectStructure(): ProjectStructure | null {
  return currentProjectStructure;
}

export function getProjectPath(): string | null {
  return currentProjectPath;
}

// ── Analysis workflows ─────────────────────────────────────────────────────

export interface FullAnalysisOptions {
  url: string;
  strategy?: Strategy;
  apiKeys: {
    googlePageSpeed: string;
    anthropic?: string;
    ahrefs?: string;
  };
  userId?: string;
  projectId?: string;
  includeAiInsights?: boolean;
  includeAhrefs?: boolean;
}

export interface FullAnalysisResult {
  pagespeed: any;
  aiInsights?: any;
  ahrefsData?: any;
  recommendations: SEORecommendation[];
  overallScore: number;
  analyzedAt: Date;
}

export async function runFullAnalysis(options: FullAnalysisOptions): Promise<FullAnalysisResult> {
  const timer = startTimer('ORCHESTRATOR', 'Full SEO analysis');
  const { url, strategy = 'mobile', apiKeys, userId, projectId, includeAiInsights = false, includeAhrefs = false } = options;

  broadcastProgress('analysis', 1, 20);

  // Step 1: PageSpeed analysis
  broadcastProgress('analysis', 2, 20);
  const pagespeed = await runPageSpeedAnalysis(url, strategy, apiKeys.googlePageSpeed, userId, projectId);
  broadcastProgress('analysis', 8, 20);

  lastAnalysisResult = pagespeed;

  const result: FullAnalysisResult = {
    pagespeed,
    recommendations: pagespeed.recommendations,
    overallScore: pagespeed.overallScore,
    analyzedAt: new Date(),
  };

  // Step 2: AI insights (optional)
  if (includeAiInsights && apiKeys.anthropic) {
    try {
      broadcastProgress('analysis', 10, 20);
      const aiPrompt = `Analyze these SEO results and provide actionable insights:
URL: ${url}
Scores: Performance=${pagespeed.scores.performance}, SEO=${pagespeed.scores.seo}, Accessibility=${pagespeed.scores.accessibility}
Top issues: ${pagespeed.recommendations.slice(0, 5).map((r: SEORecommendation) => r.title).join(', ')}

Provide 3-5 high-impact, specific recommendations.`;

      result.aiInsights = await callClaudeJSON(aiPrompt, { apiKey: apiKeys.anthropic });
      broadcastProgress('analysis', 14, 20);
    } catch (err) {
      logWarn('ORCHESTRATOR', 'AI insights failed', err);
    }
  }

  // Step 3: Ahrefs data (optional)
  if (includeAhrefs && apiKeys.ahrefs) {
    try {
      broadcastProgress('analysis', 15, 20);
      const domain = new URL(url).hostname;
      const [overview, keywords, backlinks] = await Promise.all([
        ahrefs.getDomainOverview(domain, { apiKey: apiKeys.ahrefs }),
        ahrefs.getOrganicKeywords(domain, { apiKey: apiKeys.ahrefs, country: 'us', limit: 10 }),
        ahrefs.getBacklinks(domain, { apiKey: apiKeys.ahrefs, limit: 10 }),
      ]);
      result.ahrefsData = { overview, keywords, backlinks };
      broadcastProgress('analysis', 18, 20);
    } catch (err) {
      logWarn('ORCHESTRATOR', 'Ahrefs data fetch failed', err);
    }
  }

  broadcastProgress('analysis', 20, 20);
  broadcastNotification('success', `Analysis complete: ${result.overallScore}/100`);
  timer.complete(`Score: ${result.overallScore}/100`);
  return result;
}

export async function getHistory(filters: any, limit?: number, skip?: number) {
  return getAnalysisHistory(filters, limit, skip);
}

// ── Content generation workflows ───────────────────────────────────────────

export async function generateContent(config: GenerationConfig, apiKey: string): Promise<any> {
  const timer = startTimer('ORCHESTRATOR', 'Content generation');
  if (!currentProjectStructure) throw new Error('No project loaded. Load a project first.');
  broadcastProgress('content', 1, 10);
  const result = await generatePages(config, currentProjectStructure, apiKey);
  broadcastProgress('content', 10, 10);
  broadcastNotification('success', result.summary);
  timer.complete(result.summary);
  return result;
}

export async function previewContent(templateId: string, variables: Record<string, string>, apiKey: string) {
  return generatePreview(templateId, variables, apiKey);
}

export function listTemplates() {
  return getTemplates();
}

// ── Image analysis workflows ───────────────────────────────────────────────

export async function analyzeImages(
  images: Array<{ path: string; base64: string }>,
  apiKey: string,
): Promise<ImageAnalysis[]> {
  const timer = startTimer('ORCHESTRATOR', `Image analysis (${images.length} images)`);
  broadcastProgress('images', 1, images.length + 1);
  const results = await batchAnalyzeImages(images, { apiKey });
  broadcastProgress('images', images.length + 1, images.length + 1);
  timer.complete(`Analyzed ${results.length} images`);
  return results;
}

export async function analyzeImage(imageBase64: string, apiKey: string): Promise<ImageAnalysis | null> {
  return analyzeImageWithVision(imageBase64, { apiKey });
}

export function listProjectImages(): ImageInfo[] {
  if (!currentProjectPath) throw new Error('No project loaded');
  return getImageFiles(currentProjectPath);
}

// ── File operation workflows ───────────────────────────────────────────────

export function projectListDirectory(relativePath?: string) {
  if (!currentProjectPath) throw new Error('No project loaded');
  return listDirectory(currentProjectPath, relativePath);
}

export function projectReadFile(filePath: string) {
  if (!currentProjectPath) throw new Error('No project loaded');
  return readFile(currentProjectPath, filePath);
}

export function projectFileOperation(op: FileOperation) {
  if (!currentProjectPath) throw new Error('No project loaded');
  return executeOperation(currentProjectPath, op);
}

export function projectImagesCSV() {
  if (!currentProjectPath) throw new Error('No project loaded');
  return exportImagesCSV(currentProjectPath);
}

// ── AI workflows ───────────────────────────────────────────────────────────

export async function aiChat(message: string, apiKey: string, context?: string) {
  const enrichedContext = context || buildDefaultContext();
  return claudeChat(
    [{ role: 'user', content: message }],
    { apiKey, systemPrompt: enrichedContext },
  );
}

export async function aiAnalyze(content: string, analysisType: 'seo' | 'content' | 'structure' | 'general', apiKey: string) {
  return claudeAnalyze(content, analysisType, { apiKey });
}

export async function aiModels() {
  return getAvailableModels();
}

// ── Ahrefs workflows ──────────────────────────────────────────────────────

export async function ahrefsDomainOverview(domain: string, apiKey: string) {
  return ahrefs.getDomainOverview(domain, { apiKey });
}

export async function ahrefsBacklinks(domain: string, apiKey: string, limit?: number) {
  return ahrefs.getBacklinks(domain, { apiKey, limit });
}

export async function ahrefsOrganicKeywords(domain: string, apiKey: string, country?: string, limit?: number) {
  return ahrefs.getOrganicKeywords(domain, { apiKey, country, limit });
}

export async function ahrefsKeywordIdeas(keyword: string, apiKey: string, country?: string, limit?: number) {
  return ahrefs.getKeywordIdeas(keyword, { apiKey, country, limit });
}

export async function ahrefsCompetitors(domain: string, apiKey: string, limit?: number) {
  return ahrefs.getCompetingDomains(domain, { apiKey, limit });
}

export async function ahrefsFullReport(domain: string, apiKey: string) {
  const timer = startTimer('ORCHESTRATOR', `Full Ahrefs report for ${domain}`);
  broadcastProgress('ahrefs', 1, 10);

  const [overview, keywords, backlinks, competitors] = await Promise.all([
    ahrefs.getDomainOverview(domain, { apiKey }),
    ahrefs.getOrganicKeywords(domain, { apiKey, country: 'us', limit: 20 }),
    ahrefs.getBacklinks(domain, { apiKey, limit: 20 }),
    ahrefs.getCompetingDomains(domain, { apiKey, limit: 10 }),
  ]);

  const contextSummary = ahrefs.generateContextSummary(overview, keywords, backlinks, competitors);

  broadcastProgress('ahrefs', 10, 10);
  timer.complete('Full report generated');
  return { overview, keywords, backlinks, competitors, contextSummary };
}

// ── SSE & status ───────────────────────────────────────────────────────────

export function getLastAnalysis(): any {
  return lastAnalysisResult;
}

export function getStatus() {
  return {
    projectLoaded: !!currentProjectPath,
    projectPath: currentProjectPath,
    framework: currentProjectStructure?.config.framework ?? null,
    lastAnalysisScore: lastAnalysisResult?.overallScore ?? null,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildDefaultContext(): string {
  const parts: string[] = ['You are an SEO optimization assistant integrated into the HydroBOS platform.'];
  if (currentProjectStructure) {
    parts.push(`Current project framework: ${currentProjectStructure.config.framework}`);
    parts.push(`Components: ${currentProjectStructure.components.length}`);
    parts.push(`Content types: ${currentProjectStructure.content.map(c => c.type).join(', ') || 'none'}`);
  }
  if (lastAnalysisResult) {
    parts.push(`Last analysis: ${lastAnalysisResult.url} scored ${lastAnalysisResult.overallScore}/100`);
  }
  return parts.join('\n');
}
