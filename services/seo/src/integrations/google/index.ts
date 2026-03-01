/**
 * Google APIs Integration — PageSpeed Insights + Vision API
 */

import { LighthouseResult, ImageAnalysis } from '../../types';
import { logDebug, logInfo, logError } from '../../lib/logger';

export async function runPageSpeedInsights(
  url: string,
  options: { apiKey?: string; strategy?: 'mobile' | 'desktop'; categories?: string[] } = {},
): Promise<LighthouseResult | null> {
  const { apiKey, strategy = 'mobile', categories = ['performance', 'accessibility', 'best-practices', 'seo'] } = options;
  logInfo('GOOGLE', `Running PageSpeed Insights for: ${url}`);

  try {
    let apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}`;
    for (const cat of categories) apiUrl += `&category=${cat}`;
    if (apiKey) apiUrl += `&key=${apiKey}`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = (await response.json()) as { lighthouseResult?: Record<string, unknown>; loadingExperience?: Record<string, unknown> };
    const lighthouse = data.lighthouseResult as Record<string, unknown> | undefined;
    if (!lighthouse) throw new Error('No Lighthouse result in response');

    const cats = lighthouse.categories as Record<string, { score?: number }> | undefined;
    const scores = {
      performance:   Math.round((cats?.performance?.score || 0) * 100),
      accessibility: Math.round((cats?.accessibility?.score || 0) * 100),
      bestPractices: Math.round((cats?.['best-practices']?.score || 0) * 100),
      seo:           Math.round((cats?.seo?.score || 0) * 100),
    };

    const audits = Object.entries((lighthouse.audits || {}) as Record<string, unknown>)
      .map(([id, audit]) => {
        const a = audit as Record<string, unknown>;
        return { id, title: String(a.title || id), description: String(a.description || ''), score: a.score as number | null, scoreDisplayMode: String(a.scoreDisplayMode || 'binary'), displayValue: a.displayValue as string | undefined };
      })
      .filter(a => a.score !== null && a.score < 1);

    return { url, scores, audits, timestamp: new Date().toISOString(), strategy, lighthouseVersion: lighthouse.lighthouseVersion as string | undefined };
  } catch (error) {
    logError('GOOGLE', 'PageSpeed Insights failed', { error });
    return null;
  }
}

export async function analyzeImageWithVision(
  imageBase64: string,
  options: { apiKey: string; features?: string[]; contextPrompt?: string },
): Promise<ImageAnalysis | null> {
  const { apiKey, features = ['LABEL_DETECTION', 'OBJECT_LOCALIZATION', 'TEXT_DETECTION'] } = options;
  logDebug('GOOGLE', 'Analyzing image with Vision API');

  try {
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ image: { content: imageBase64 }, features: features.map(type => ({ type, maxResults: 10 })) }] }),
    });
    if (!response.ok) { const e = (await response.json().catch(() => ({}))) as { error?: { message?: string } }; throw new Error(e.error?.message || `HTTP ${response.status}`); }

    const data = (await response.json()) as { responses?: Array<{ labelAnnotations?: Array<{ description: string }>; localizedObjectAnnotations?: Array<{ name: string }>; textAnnotations?: Array<{ description: string }> }> };
    const result = data.responses?.[0];
    if (!result) return null;

    const labels  = (result.labelAnnotations || []).map(l => l.description);
    const objects = (result.localizedObjectAnnotations || []).map(o => o.name);
    const text    = result.textAnnotations?.length ? [result.textAnnotations[0].description] : [];

    const suggestedName = labels.slice(0, 3).join('-').toLowerCase().replace(/\s+/g, '-') || 'image';
    const category = categorizeImage(labels, objects);
    let suggestedAlt = labels.slice(0, 5).join(', ');
    if (text.length > 0 && text[0].length < 100) suggestedAlt = `${suggestedAlt}. Text: "${text[0].slice(0, 50)}"`;

    return { path: '', filename: '', size: 0, labels, objects, text, suggestedName, suggestedAlt, category };
  } catch (error) {
    logError('GOOGLE', 'Vision API failed', { error });
    return null;
  }
}

function categorizeImage(labels: string[], objects: string[]): string {
  const all = [...labels, ...objects].map(s => s.toLowerCase());
  const cats: Array<{ kw: string[]; cat: string }> = [
    { kw: ['pond', 'water', 'lake', 'pool'], cat: 'pond' },
    { kw: ['fish', 'koi', 'goldfish', 'carp'], cat: 'fish' },
    { kw: ['plant', 'flower', 'lotus', 'lily', 'garden'], cat: 'plants' },
    { kw: ['fountain', 'waterfall', 'stream'], cat: 'water-features' },
    { kw: ['pump', 'filter', 'equipment', 'tool'], cat: 'equipment' },
    { kw: ['construction', 'building', 'work', 'installation'], cat: 'construction' },
  ];
  for (const { kw, cat } of cats) if (all.some(l => kw.some(k => l.includes(k)))) return cat;
  return 'general';
}

export async function batchAnalyzeImages(
  images: Array<{ path: string; base64: string }>,
  options: { apiKey: string; rateLimit?: number },
): Promise<ImageAnalysis[]> {
  const results: ImageAnalysis[] = [];
  for (const img of images) {
    const analysis = await analyzeImageWithVision(img.base64, { apiKey: options.apiKey });
    if (analysis) results.push({ ...analysis, path: img.path, filename: img.path.split('/').pop() || '' });
    await new Promise(r => setTimeout(r, options.rateLimit ?? 1000));
  }
  return results;
}

const google = { pageSpeed: runPageSpeedInsights, vision: analyzeImageWithVision, batchVision: batchAnalyzeImages };
export default google;
