/**
 * Anthropic Claude Integration
 * Wrapper for Claude API with rate limiting and error handling.
 */

import { ClaudeAPIConfig } from '../../types';
import { logDebug, logInfo, logError } from '../../lib/logger';
import { cleanAndParseJSON } from '../../lib/json-parser';

const DEFAULT_CONFIG: ClaudeAPIConfig = {
  name: 'anthropic',
  enabled: true,
  model: 'claude-sonnet-4-5-20250929',
  maxTokens: 4096,
  temperature: 0.7,
  rateLimit: 60,
};

let requestCount = 0;
let lastResetTime = Date.now();

function checkRateLimit(config: ClaudeAPIConfig): boolean {
  const now = Date.now();
  if (now - lastResetTime > 60_000) { requestCount = 0; lastResetTime = now; }
  if (requestCount >= (config.rateLimit || 60)) return false;
  requestCount++;
  return true;
}

export async function callClaude(
  prompt: string,
  options: { apiKey: string; model?: string; maxTokens?: number; temperature?: number; systemPrompt?: string },
): Promise<string> {
  const config: ClaudeAPIConfig = {
    ...DEFAULT_CONFIG,
    apiKey: options.apiKey,
    model: options.model || DEFAULT_CONFIG.model,
    maxTokens: options.maxTokens || DEFAULT_CONFIG.maxTokens,
    temperature: options.temperature ?? DEFAULT_CONFIG.temperature,
  };

  if (!checkRateLimit(config)) throw new Error('Rate limit exceeded. Please wait before making more requests.');

  logDebug('CLAUDE', 'Calling Claude API', { model: config.model });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: options.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(`Claude API error: ${err.error?.message || `HTTP ${response.status}`}`);
  }

  const data = (await response.json()) as { content?: { text?: string }[]; usage?: { output_tokens?: number } };
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('No text content in Claude response');

  logInfo('CLAUDE', 'Response received', { tokens: data.usage?.output_tokens, model: config.model });
  return text;
}

export async function callClaudeJSON<T = unknown>(
  prompt: string,
  options: { apiKey: string; model?: string; maxTokens?: number; temperature?: number; systemPrompt?: string },
): Promise<T | null> {
  const text = await callClaude(prompt, {
    ...options,
    systemPrompt: `${options.systemPrompt || ''}\n\nIMPORTANT: Respond ONLY with valid JSON.`,
  });
  const result = cleanAndParseJSON<T>(text);
  if (!result.success) { logError('CLAUDE', 'Failed to parse JSON response', { error: result.error }); return null; }
  return result.data!;
}

export async function chat(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options: { apiKey: string; model?: string; maxTokens?: number; systemPrompt?: string },
): Promise<string> {
  const config: ClaudeAPIConfig = { ...DEFAULT_CONFIG, apiKey: options.apiKey, model: options.model || DEFAULT_CONFIG.model, maxTokens: options.maxTokens || DEFAULT_CONFIG.maxTokens };
  if (!checkRateLimit(config)) throw new Error('Rate limit exceeded.');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: config.model, max_tokens: config.maxTokens, system: options.systemPrompt, messages }),
  });
  if (!response.ok) { const e = (await response.json().catch(() => ({}))) as { error?: { message?: string } }; throw new Error(e.error?.message || `HTTP ${response.status}`); }
  const data = (await response.json()) as { content?: { text?: string }[] };
  return data.content?.[0]?.text || '';
}

export async function analyze(
  content: string,
  analysisType: 'seo' | 'content' | 'structure' | 'general',
  options: { apiKey: string; model?: string; context?: string },
): Promise<Record<string, unknown> | null> {
  const prompts: Record<string, string> = {
    seo: 'Analyze for SEO quality. Evaluate keyword usage, meta info, structure, readability. Respond JSON: { score, issues, suggestions, keywords }',
    content: 'Analyze content quality. Evaluate clarity, engagement, information value, grammar. Respond JSON: { score, strengths, improvements, summary }',
    structure: 'Analyze code/document structure. Evaluate organisation, naming, best practices. Respond JSON: { score, issues, suggestions, patterns }',
    general: 'Analyze and provide insights. Respond JSON: { summary, insights, recommendations }',
  };
  const prompt = `${prompts[analysisType]}\n\n${options.context ? `Context: ${options.context}\n\n` : ''}Content:\n---\n${content}\n---`;
  return callClaudeJSON(prompt, { apiKey: options.apiKey, model: options.model, systemPrompt: 'You are an expert analyst. Provide detailed, actionable analysis.' });
}

export function getAvailableModels(): Array<{ id: string; name: string; description: string }> {
  return [
    { id: 'claude-opus-4-5-20250929', name: 'Claude Opus 4.5', description: 'Most capable model, best for complex tasks' },
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', description: 'Balanced performance and speed' },
    { id: 'claude-haiku-3-5-20250929', name: 'Claude Haiku 3.5', description: 'Fastest model, good for simple tasks' },
  ];
}

const claude = { call: callClaude, callJSON: callClaudeJSON, chat, analyze, getAvailableModels };
export default claude;
