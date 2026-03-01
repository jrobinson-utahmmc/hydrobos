/**
 * AHREFS API Integration — Domain overview, backlinks, keywords, competitors.
 */

import {
  AhrefsDomainOverview, AhrefsBacklinksResult, AhrefsBacklink,
  AhrefsOrganicKeywordsResult, AhrefsKeyword,
  AhrefsKeywordResearchResult, AhrefsKeywordIdea,
  AhrefsCompetitorResult, AhrefsCompetitorDomain,
} from '../../types';
import { logDebug, logInfo, logError, logSuccess } from '../../lib/logger';

const AHREFS_API_BASE = 'https://api.ahrefs.com/v3';
function getDate(): string { return new Date().toISOString().split('T')[0]; }

async function req<T>(opts: { apiKey: string; endpoint: string; params?: Record<string, string | number | boolean> }): Promise<T | null> {
  const url = new URL(`${AHREFS_API_BASE}${opts.endpoint}`);
  for (const [k, v] of Object.entries(opts.params || {})) url.searchParams.set(k, String(v));
  logDebug('AHREFS', `Requesting: ${opts.endpoint}`, { params: opts.params });
  const response = await fetch(url.toString(), { method: 'GET', headers: { Authorization: `Bearer ${opts.apiKey}`, Accept: 'application/json' } });
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(`AHREFS API error: ${err.error || err.message || `HTTP ${response.status}`}`);
  }
  const data = (await response.json()) as T;
  logInfo('AHREFS', `Response received for ${opts.endpoint}`);
  return data;
}

export async function getDomainOverview(domain: string, options: { apiKey: string }): Promise<AhrefsDomainOverview | null> {
  logInfo('AHREFS', `Getting domain overview for: ${domain}`);
  const date = getDate();
  try {
    const dr = await req<{ domain_rating?: number }>({ apiKey: options.apiKey, endpoint: '/site-explorer/domain-rating', params: { target: domain, date } });
    let metrics: any = null;
    try { metrics = await req<any>({ apiKey: options.apiKey, endpoint: '/site-explorer/metrics', params: { target: domain, date } }); } catch { /* partial ok */ }
    const result: AhrefsDomainOverview = {
      domain, domainRating: dr?.domain_rating || 0, urlRating: 0,
      backlinks: metrics?.live || metrics?.all_time || 0,
      referringDomains: metrics?.live_refdomains || metrics?.all_time_refdomains || 0,
      organicKeywords: metrics?.organic?.keywords_top3 || 0,
      organicTraffic: metrics?.organic?.traffic || 0,
      paidKeywords: metrics?.paid?.keywords || 0,
      paidTraffic: metrics?.paid?.traffic || 0,
      timestamp: new Date().toISOString(),
    };
    logSuccess('AHREFS', `Domain overview retrieved for ${domain}`, { dr: result.domainRating });
    return result;
  } catch (error) { logError('AHREFS', 'Domain overview failed', { error, domain }); throw error; }
}

export async function getBacklinks(domain: string, options: { apiKey: string; limit?: number; orderBy?: string; mode?: string }): Promise<AhrefsBacklinksResult | null> {
  const { apiKey, limit = 50, orderBy = 'domain_rating_source', mode = 'domain' } = options;
  logInfo('AHREFS', `Getting backlinks for: ${domain}`);
  const data = await req<{ backlinks?: any[]; stats?: { total?: number } }>({
    apiKey, endpoint: '/site-explorer/all-backlinks',
    params: { target: domain, mode, limit, order_by: `${orderBy}:desc`, output: 'json', select: 'url_from,url_to,anchor,domain_rating_source,first_seen,last_seen,dofollow,http_code,title' },
  });
  if (!data) return null;
  const backlinks: AhrefsBacklink[] = (data.backlinks || []).map((bl: any) => ({
    urlFrom: bl.url_from || '', urlTo: bl.url_to || '', anchor: bl.anchor || '',
    domainRatingSource: bl.domain_rating_source || 0, firstSeen: bl.first_seen || '',
    lastSeen: bl.last_seen || '', isDoFollow: bl.dofollow ?? true, httpCode: bl.http_code || 200, urlFromTitle: bl.title || '',
  }));
  logSuccess('AHREFS', `Found ${backlinks.length} backlinks for ${domain}`);
  return { domain, totalBacklinks: data.stats?.total || backlinks.length, backlinks, timestamp: new Date().toISOString() };
}

export async function getOrganicKeywords(domain: string, options: { apiKey: string; country?: string; limit?: number; orderBy?: string }): Promise<AhrefsOrganicKeywordsResult | null> {
  const { apiKey, country = 'us', limit = 50, orderBy = 'traffic' } = options;
  logInfo('AHREFS', `Getting organic keywords for: ${domain}`);
  const data = await req<{ keywords?: any[]; stats?: { total?: number } }>({
    apiKey, endpoint: '/site-explorer/organic-keywords',
    params: { target: domain, mode: 'domain', country, date: getDate(), limit, order_by: `${orderBy}:desc`, output: 'json', select: 'keyword,volume,difficulty,cpc,position,url,traffic,traffic_percentage' },
  });
  if (!data) return null;
  const keywords: AhrefsKeyword[] = (data.keywords || []).map((kw: any) => ({
    keyword: kw.keyword || '', volume: kw.volume || 0, difficulty: kw.difficulty || 0,
    cpc: kw.cpc || 0, position: kw.position || 0, url: kw.url || '',
    traffic: kw.traffic || 0, trafficPercentage: kw.traffic_percentage || 0,
  }));
  logSuccess('AHREFS', `Found ${keywords.length} organic keywords for ${domain}`);
  return { domain, totalKeywords: data.stats?.total || keywords.length, keywords, timestamp: new Date().toISOString() };
}

export async function getKeywordIdeas(keyword: string, options: { apiKey: string; country?: string; limit?: number }): Promise<AhrefsKeywordResearchResult | null> {
  const { apiKey, country = 'us', limit = 50 } = options;
  logInfo('AHREFS', `Getting keyword ideas for: ${keyword}`);
  const data = await req<{ keywords?: any[]; stats?: { total?: number } }>({
    apiKey, endpoint: '/keywords-explorer/keyword-ideas',
    params: { keywords: keyword, country, limit, order_by: 'volume:desc', output: 'json', select: 'keyword,volume,difficulty,cpc,clicks,return_rate,parent_topic,parent_topic_volume' },
  });
  if (!data) return null;
  const keywords: AhrefsKeywordIdea[] = (data.keywords || []).map((kw: any) => ({
    keyword: kw.keyword || '', volume: kw.volume || 0, difficulty: kw.difficulty || 0,
    cpc: kw.cpc || 0, clicks: kw.clicks || 0, returnRate: kw.return_rate || 0,
    parentTopic: kw.parent_topic || '', parentTopicVolume: kw.parent_topic_volume || 0,
  }));
  logSuccess('AHREFS', `Found ${keywords.length} keyword ideas for "${keyword}"`);
  return { seedKeyword: keyword, country, totalIdeas: data.stats?.total || keywords.length, keywords, timestamp: new Date().toISOString() };
}

export async function getCompetingDomains(domain: string, options: { apiKey: string; country?: string; limit?: number }): Promise<AhrefsCompetitorResult | null> {
  const { apiKey, country = 'us', limit = 20 } = options;
  logInfo('AHREFS', `Getting competing domains for: ${domain}`);
  const data = await req<{ domains?: any[] }>({
    apiKey, endpoint: '/site-explorer/competing-domains',
    params: { target: domain, mode: 'domain', country, date: getDate(), limit, order_by: 'common_keywords:desc', output: 'json' },
  });
  if (!data) return null;
  const competitors: AhrefsCompetitorDomain[] = (data.domains || []).map((d: any) => ({
    domain: d.domain || '', commonKeywords: d.common_keywords || 0,
    organicTraffic: d.organic_traffic || 0, organicKeywords: d.organic_keywords || 0, domainRating: d.domain_rating || 0,
  }));
  logSuccess('AHREFS', `Found ${competitors.length} competing domains for ${domain}`);
  return { domain, competitors, timestamp: new Date().toISOString() };
}

export function generateContextSummary(
  overview?: AhrefsDomainOverview | null, keywords?: AhrefsOrganicKeywordsResult | null,
  backlinks?: AhrefsBacklinksResult | null, competitors?: AhrefsCompetitorResult | null,
): string {
  const parts: string[] = [];
  if (overview) parts.push(`DOMAIN OVERVIEW (${overview.domain}):\n- DR: ${overview.domainRating}/100\n- Backlinks: ${overview.backlinks.toLocaleString()}\n- Referring Domains: ${overview.referringDomains.toLocaleString()}\n- Organic Keywords: ${overview.organicKeywords.toLocaleString()}\n- Organic Traffic: ${overview.organicTraffic.toLocaleString()}/month`);
  if (keywords?.keywords.length) parts.push(`TOP ORGANIC KEYWORDS:\n${keywords.keywords.slice(0, 15).map(kw => `- "${kw.keyword}" | Vol: ${kw.volume} | KD: ${kw.difficulty}% | Pos: ${kw.position}`).join('\n')}`);
  if (backlinks?.backlinks.length) parts.push(`TOP BACKLINKS:\nTotal: ${backlinks.totalBacklinks.toLocaleString()}\n${backlinks.backlinks.slice(0, 10).map(bl => `- DR${bl.domainRatingSource} | ${bl.urlFrom} -> "${bl.anchor}" ${bl.isDoFollow ? '(dofollow)' : '(nofollow)'}`).join('\n')}`);
  if (competitors?.competitors.length) parts.push(`COMPETING DOMAINS:\n${competitors.competitors.slice(0, 8).map(c => `- ${c.domain} | DR: ${c.domainRating} | Common KWs: ${c.commonKeywords}`).join('\n')}`);
  return parts.join('\n\n');
}

const ahrefs = { getDomainOverview, getBacklinks, getOrganicKeywords, getKeywordIdeas, getCompetingDomains, generateContextSummary };
export default ahrefs;
