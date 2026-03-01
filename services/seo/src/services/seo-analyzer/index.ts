/**
 * SEO Analyzer Service — Runs PageSpeed audits, generates recommendations, calculates scores.
 */

import { LighthouseResult, SEORecommendation, CruxData } from '../../types';
import { runPageSpeedInsights } from '../../integrations/google';
import { logDebug, logError, logInfo, logWarn, startTimer } from '../../lib/logger';
import { SeoAnalysis } from '../../models/SeoAnalysis';

export type Strategy = 'mobile' | 'desktop';

export interface AnalysisResult {
  url: string;
  strategy: Strategy;
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  cruxData?: CruxData;
  recommendations: SEORecommendation[];
  overallScore: number;
  lighthouseResult: LighthouseResult;
  analyzedAt: Date;
}

export function calculateOverallScore(scores: AnalysisResult['scores']): number {
  return Math.round(scores.performance * 0.35 + scores.seo * 0.30 + scores.accessibility * 0.20 + scores.bestPractices * 0.15);
}

export function generateRecommendations(lhr: LighthouseResult): SEORecommendation[] {
  const recs: SEORecommendation[] = [];
  const audits = lhr.audits || [];

  const mapping: Record<string, { category: string; priority: SEORecommendation['priority'] }> = {
    'meta-description': { category: 'meta-tags', priority: 'high' },
    'document-title': { category: 'meta-tags', priority: 'high' },
    'html-has-lang': { category: 'meta-tags', priority: 'medium' },
    'link-text': { category: 'content', priority: 'medium' },
    'heading-order': { category: 'content', priority: 'medium' },
    'image-alt': { category: 'images', priority: 'high' },
    'uses-optimized-images': { category: 'images', priority: 'high' },
    'uses-webp-images': { category: 'images', priority: 'medium' },
    'uses-responsive-images': { category: 'images', priority: 'medium' },
    'render-blocking-resources': { category: 'performance', priority: 'high' },
    'uses-text-compression': { category: 'performance', priority: 'high' },
    'efficient-animated-content': { category: 'performance', priority: 'medium' },
    'unused-css-rules': { category: 'performance', priority: 'medium' },
    'unused-javascript': { category: 'performance', priority: 'medium' },
    'is-crawlable': { category: 'technical', priority: 'critical' },
    'robots-txt': { category: 'technical', priority: 'high' },
    'canonical': { category: 'technical', priority: 'high' },
    'hreflang': { category: 'technical', priority: 'medium' },
    'structured-data': { category: 'structured-data', priority: 'high' },
    'http-status-code': { category: 'technical', priority: 'critical' },
    'is-on-https': { category: 'technical', priority: 'critical' },
  };

  for (const audit of audits) {
    if (!audit || audit.score === null || audit.score === undefined || audit.score >= 0.9) continue;
    const m = mapping[audit.id];
    if (!m) continue;
    recs.push({
      id: audit.id,
      title: audit.title || audit.id,
      description: audit.description || '',
      category: m.category,
      priority: m.priority,
      score: Math.round((audit.score ?? 0) * 100),
      impact: audit.score < 0.5 ? 'high' : audit.score < 0.7 ? 'medium' : 'low',
    });
  }
  return recs.sort((a, b) => {
    const o: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (o[a.priority] ?? 4) - (o[b.priority] ?? 4);
  });
}

export async function runPageSpeedAnalysis(
  url: string,
  strategy: Strategy,
  apiKey: string,
  userId?: string,
  projectId?: string,
): Promise<AnalysisResult> {
  const timer = startTimer('SEO-ANALYZER', `PageSpeed analysis for ${url} (${strategy})`);
  logInfo('SEO-ANALYZER', `Running ${strategy} analysis on: ${url}`);

  try {
    const lighthouseResult = await runPageSpeedInsights(url, { apiKey, strategy });
    if (!lighthouseResult) {
      throw new Error(`PageSpeed Insights returned no data for ${url}`);
    }

    // The Google integration already computes scores from the raw categories
    const scores = lighthouseResult.scores;
    const overallScore = calculateOverallScore(scores);
    const recommendations = generateRecommendations(lighthouseResult);

    const result: AnalysisResult = {
      url,
      strategy,
      scores,
      cruxData: lighthouseResult.cruxData,
      recommendations,
      overallScore,
      lighthouseResult,
      analyzedAt: new Date(),
    };

    // Persist to DB
    try {
      await SeoAnalysis.create({
        url,
        projectId,
        scores,
        overallScore,
        strategy,
        auditCount: lighthouseResult.audits?.length || 0,
        recommendationCount: recommendations.length,
        snapshot: {
          lighthouseVersion: lighthouseResult.lighthouseVersion,
          fetchTime: lighthouseResult.fetchTime,
          requestedUrl: lighthouseResult.requestedUrl,
          finalUrl: lighthouseResult.finalUrl,
        },
        createdBy: userId || 'system',
      });
      logDebug('SEO-ANALYZER', 'Analysis result persisted to database');
    } catch (dbErr) {
      logWarn('SEO-ANALYZER', 'Failed to persist analysis result', dbErr);
    }

    timer.complete(`Score: ${overallScore}/100, ${recommendations.length} recommendations`);
    return result;
  } catch (error) {
    logError('SEO-ANALYZER', `Analysis failed for ${url}`, error);
    throw error;
  }
}

export async function getAnalysisHistory(
  filters: { url?: string; projectId?: string; strategy?: Strategy; userId?: string },
  limit = 20,
  skip = 0,
) {
  const query: Record<string, any> = {};
  if (filters.url) query.url = filters.url;
  if (filters.projectId) query.projectId = filters.projectId;
  if (filters.strategy) query.strategy = filters.strategy;
  if (filters.userId) query.createdBy = filters.userId;

  const [results, total] = await Promise.all([
    SeoAnalysis.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    SeoAnalysis.countDocuments(query),
  ]);
  return { results, total, limit, skip };
}

const seoAnalyzer = {
  runPageSpeedAnalysis,
  calculateOverallScore,
  generateRecommendations,
  getAnalysisHistory,
};
export default seoAnalyzer;
