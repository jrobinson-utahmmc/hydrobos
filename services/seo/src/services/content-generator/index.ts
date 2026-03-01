/**
 * Content Generator Service — Templates, page generation, preview.
 */

import { ContentTemplate, GenerationConfig, ProjectStructure } from '../../types';
import { callClaudeJSON } from '../../integrations/anthropic';
import { logInfo, logWarn, startTimer } from '../../lib/logger';

const DEFAULT_TEMPLATES: ContentTemplate[] = [
  {
    id: 'city-landing',
    name: 'City Landing Page',
    description: 'Location-specific landing page for local SEO',
    variables: ['cityName', 'stateName', 'population', 'description', 'services'],
    seoFields: ['title', 'metaDescription', 'h1', 'h2Tags', 'schema'],
    category: 'location',
  },
  {
    id: 'service-page',
    name: 'Service Page',
    description: 'Service or product detail page with SEO optimization',
    variables: ['serviceName', 'category', 'description', 'features', 'pricing'],
    seoFields: ['title', 'metaDescription', 'h1', 'h2Tags', 'schema', 'faq'],
    category: 'service',
  },
  {
    id: 'blog-post',
    name: 'Blog Post',
    description: 'SEO-optimized blog post with structured data',
    variables: ['title', 'topic', 'keywords', 'targetAudience', 'wordCount'],
    seoFields: ['title', 'metaDescription', 'h1', 'h2Tags', 'schema'],
    category: 'content',
  },
  {
    id: 'product-page',
    name: 'Product Page',
    description: 'E-commerce product page with structured data',
    variables: ['productName', 'category', 'price', 'description', 'features'],
    seoFields: ['title', 'metaDescription', 'h1', 'schema', 'breadcrumbs'],
    category: 'product',
  },
];

export function getTemplates(): ContentTemplate[] {
  return DEFAULT_TEMPLATES;
}

export function getTemplateById(id: string): ContentTemplate | undefined {
  return DEFAULT_TEMPLATES.find(t => t.id === id);
}

export async function generateContentItem(
  template: ContentTemplate,
  variables: Record<string, string>,
  siteContext: string,
  apiKey: string,
): Promise<Record<string, any>> {
  const varSection = Object.entries(variables)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  const seoFieldsList = (template.seoFields || []).map(f => `- "${f}": appropriate content`).join('\n');

  const prompt = `You are a professional SEO content writer. Generate content for a "${template.name}" page.

Template: ${template.description || template.name}

Variables:
${varSection}

Site context: ${siteContext}

Generate a JSON object with these fields:
${seoFieldsList}
- "bodyContent": the main HTML body content (well-structured with semantic HTML)
- "internalLinks": array of suggested internal link paths
- "externalLinks": array of suggested authoritative external links

Ensure all content is unique, informative, and optimized for the given SEO fields.`;

  const result = await callClaudeJSON<Record<string, any>>(prompt, { apiKey });
  return { ...result, templateId: template.id, variables, generatedAt: new Date().toISOString() };
}

export async function generatePages(
  config: GenerationConfig,
  projectStructure: ProjectStructure,
  apiKey: string,
): Promise<{ pages: Record<string, any>[]; summary: string }> {
  const timer = startTimer('CONTENT-GEN', `Generating ${config.items?.length ?? 0} pages`);
  const templateId = config.templateId;
  if (!templateId) throw new Error('templateId is required in GenerationConfig');
  const template = getTemplateById(templateId);
  if (!template) throw new Error(`Template not found: ${templateId}`);

  const siteContext = buildSiteContext(projectStructure);
  const pages: Record<string, any>[] = [];

  for (const item of config.items || []) {
    try {
      logInfo('CONTENT-GEN', `Generating page for: ${JSON.stringify(item).slice(0, 100)}`);
      const content = await generateContentItem(template, item, siteContext, apiKey);
      pages.push(content);
    } catch (err) {
      logWarn('CONTENT-GEN', `Failed to generate page: ${err}`);
      pages.push({ error: String(err), variables: item });
    }
  }

  const successful = pages.filter(p => !p.error).length;
  const summary = `Generated ${successful}/${config.items?.length ?? 0} pages using template "${template.name}"`;
  timer.complete(summary);
  return { pages, summary };
}

export async function generatePreview(
  templateId: string,
  variables: Record<string, string>,
  apiKey: string,
): Promise<{ html: string; meta: Record<string, string> }> {
  const template = getTemplateById(templateId);
  if (!template) throw new Error(`Template not found: ${templateId}`);

  const prompt = `Generate an SEO-optimized HTML preview for a "${template.name}" page.

Variables:
${Object.entries(variables).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Return a JSON object with:
- "html": Complete, semantic HTML content (just the body content, no doctype/head)
- "meta": Object with "title", "description", "ogTitle", "ogDescription" fields

The HTML should be clean, semantic, well-structured, and optimized for SEO.`;

  const result = await callClaudeJSON<{ html: string; meta: Record<string, string> }>(prompt, { apiKey });
  return result || { html: '', meta: {} };
}

function buildSiteContext(project: ProjectStructure): string {
  const parts: string[] = [`Framework: ${project.config.framework}`];
  if (project.content.length) parts.push(`Content types: ${project.content.map(c => c.type).join(', ')}`);
  if (project.sitemaps.length) parts.push(`Sitemaps: ${project.sitemaps.map(s => `${s.path} (${s.urls} URLs)`).join(', ')}`);
  if (project.templates.length) parts.push(`Templates: ${project.templates.map(t => t.name).join(', ')}`);
  return parts.join('. ');
}

const contentGenerator = { getTemplates, getTemplateById, generatePages, generatePreview, generateContentItem };
export default contentGenerator;
