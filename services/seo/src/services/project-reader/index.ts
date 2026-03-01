/**
 * Project Reader Service — Analyses project structure, detects frameworks.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ProjectStructure, FolderInfo, TemplateInfo, ComponentInfo, StyleInfo, ContentInfo, ImageInfo, SitemapInfo, ConfigInfo } from '../../types';
import { logDebug, logInfo, logWarn, startTimer } from '../../lib/logger';

const FOLDER_DESCRIPTIONS: Record<string, string> = {
  app: 'Next.js App Router pages and API routes', pages: 'Next.js Pages Router', src: 'Source code root',
  components: 'React components', lib: 'Utility functions and libraries', utils: 'Utility functions',
  hooks: 'React custom hooks', styles: 'CSS and styling files', public: 'Static assets',
  assets: 'Project assets', content: 'Content data files', types: 'TypeScript type definitions',
  api: 'API routes or backend code', config: 'Configuration files', tests: 'Test files',
};

const FRAMEWORK_INDICATORS: Record<string, string[]> = {
  'Next.js': ['next.config.js', 'next.config.mjs', 'next.config.ts', '.next'],
  'React (Vite)': ['vite.config.ts', 'vite.config.js'],
  'React (CRA)': ['react-scripts'],
  Vue: ['vue.config.js'],
  Angular: ['angular.json'],
  Svelte: ['svelte.config.js'],
  Astro: ['astro.config.mjs'],
  Remix: ['remix.config.js'],
};

function detectConfig(projectPath: string): ConfigInfo {
  const cfg: ConfigInfo = { framework: 'Unknown', typescript: false, styling: [], deployment: 'unknown' };
  if (fs.existsSync(path.join(projectPath, 'tsconfig.json'))) cfg.typescript = true;
  for (const [fw, indicators] of Object.entries(FRAMEWORK_INDICATORS)) {
    for (const i of indicators) { if (fs.existsSync(path.join(projectPath, i))) { cfg.framework = fw; break; } }
    if (cfg.framework !== 'Unknown') break;
  }
  if (fs.existsSync(path.join(projectPath, 'tailwind.config.js')) || fs.existsSync(path.join(projectPath, 'tailwind.config.ts'))) cfg.styling.push('TailwindCSS');
  if (fs.existsSync(path.join(projectPath, 'postcss.config.js'))) cfg.styling.push('PostCSS');
  if (fs.existsSync(path.join(projectPath, 'vercel.json'))) cfg.deployment = 'Vercel';
  else if (fs.existsSync(path.join(projectPath, 'netlify.toml'))) cfg.deployment = 'Netlify';
  else if (fs.existsSync(path.join(projectPath, 'Dockerfile'))) cfg.deployment = 'Docker';
  return cfg;
}

function countFiles(dirPath: string, depth = 0): number {
  if (depth > 10) return 0;
  let count = 0;
  try {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      count += entry.isFile() ? 1 : countFiles(path.join(dirPath, entry.name), depth + 1);
    }
  } catch { /* ignore */ }
  return count;
}

function categorizeFolder(name: string): FolderInfo['type'] {
  const m: Record<string, FolderInfo['type']> = { app: 'app', pages: 'app', components: 'components', content: 'content', public: 'public', lib: 'lib', utils: 'lib', types: 'types' };
  return m[name] || 'other';
}

function analyzeFolders(projectPath: string): FolderInfo[] {
  const folders: FolderInfo[] = [];
  try {
    for (const e of fs.readdirSync(projectPath, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name.startsWith('.') || e.name === 'node_modules') continue;
      folders.push({ path: e.name, type: categorizeFolder(e.name), files: countFiles(path.join(projectPath, e.name)), description: FOLDER_DESCRIPTIONS[e.name] });
    }
  } catch (error) { logWarn('PROJECT-READER', `Error reading directory: ${projectPath}`, error); }
  return folders;
}

function findTemplates(projectPath: string): TemplateInfo[] {
  const templates: TemplateInfo[] = [];
  for (const dir of ['components/templates', 'src/templates', 'templates']) {
    const full = path.join(projectPath, dir);
    if (!fs.existsSync(full)) continue;
    try {
      for (const f of fs.readdirSync(full).filter(f => /\.(tsx|jsx|vue)$/.test(f))) {
        const content = fs.readFileSync(path.join(full, f), 'utf-8');
        const pm = content.match(/interface\s+(\w+Props)\s*{([^}]+)}/);
        templates.push({ name: f.replace(/\.(tsx|jsx|vue)$/, ''), path: `${dir}/${f}`, type: inferTemplateType(f), props: pm?.[2] ? (pm[2].match(/\w+(?=\s*[?:])/g) || []) : [] });
      }
    } catch { /* ignore */ }
  }
  return templates;
}

function inferTemplateType(filename: string): string {
  const n = filename.toLowerCase();
  if (n.includes('page')) return 'Page'; if (n.includes('layout')) return 'Layout';
  if (n.includes('section')) return 'Section'; if (n.includes('card')) return 'Card';
  if (n.includes('hero')) return 'Hero'; return 'Generic';
}

function findComponents(projectPath: string): ComponentInfo[] {
  const components: ComponentInfo[] = [];
  for (const baseDir of ['components', 'src/components']) {
    const full = path.join(projectPath, baseDir);
    if (!fs.existsSync(full)) continue;
    try {
      for (const cat of fs.readdirSync(full, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)) {
        for (const f of fs.readdirSync(path.join(full, cat)).filter(f => /\.(tsx|jsx)$/.test(f))) {
          const catName = cat.toLowerCase();
          const category: ComponentInfo['category'] = catName === 'ui' || catName === 'common' ? 'ui' : catName.startsWith('layout') ? 'layout' : catName.startsWith('section') ? 'section' : catName.startsWith('form') ? 'form' : catName.startsWith('template') ? 'template' : 'ui';
          components.push({ name: f.replace(/\.(tsx|jsx)$/, ''), path: `${baseDir}/${cat}/${f}`, category, exports: [f.replace(/\.(tsx|jsx)$/, '')] });
        }
      }
    } catch { /* ignore */ }
  }
  return components;
}

function findStyles(projectPath: string): StyleInfo[] {
  const styles: StyleInfo[] = [];
  for (const sp of ['app/globals.css', 'src/styles/globals.css', 'styles/globals.css', 'src/index.css']) {
    const full = path.join(projectPath, sp);
    if (!fs.existsSync(full)) continue;
    try {
      const content = fs.readFileSync(full, 'utf-8');
      const variables = (content.match(/--[\w-]+:/g) || []).map(v => v.replace(':', '')).slice(0, 20);
      styles.push({ path: sp, type: 'global', variables });
    } catch { /* ignore */ }
  }
  return styles;
}

function findContent(projectPath: string): ContentInfo[] {
  const content: ContentInfo[] = [];
  const contentDir = path.join(projectPath, 'content');
  if (!fs.existsSync(contentDir)) return content;
  try {
    for (const f of fs.readdirSync(contentDir).filter(f => /\.(ts|js|json)$/.test(f))) {
      const fc = fs.readFileSync(path.join(contentDir, f), 'utf-8');
      const slugs = (fc.match(/'[\w-]+'\s*:/g) || []).map(s => s.replace(/['":]/g, '')).slice(0, 20);
      const n = f.toLowerCase();
      const type: ContentInfo['type'] = n.includes('cities') ? 'cities' : n.includes('service') ? 'services' : n.includes('product') ? 'products' : n.includes('guide') ? 'guides' : n.includes('blog') ? 'blog' : 'static';
      content.push({ path: `content/${f}`, type, items: slugs });
    }
  } catch { /* ignore */ }
  return content;
}

function findImages(projectPath: string): ImageInfo[] {
  const images: ImageInfo[] = [];
  for (const dir of ['public/images', 'public/img', 'src/assets/images']) {
    const full = path.join(projectPath, dir);
    if (!fs.existsSync(full)) continue;
    try {
      const entries = fs.readdirSync(full, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const sub = path.join(full, entry.name);
          const files = fs.readdirSync(sub).filter(f => /\.(webp|jpg|jpeg|png|avif|gif|svg)$/i.test(f));
          if (files.length) images.push({ folder: `${dir}/${entry.name}`, count: files.length, formats: [...new Set(files.map(f => path.extname(f).slice(1)))], samples: files.slice(0, 5) });
        }
      }
      const root = entries.filter(e => e.isFile() && /\.(webp|jpg|jpeg|png|avif|gif|svg)$/i.test(e.name)).map(e => e.name);
      if (root.length) images.unshift({ folder: dir, count: root.length, formats: [...new Set(root.map(f => path.extname(f).slice(1)))], samples: root.slice(0, 5) });
    } catch { /* ignore */ }
  }
  return images;
}

function findSitemaps(projectPath: string): SitemapInfo[] {
  const sitemaps: SitemapInfo[] = [];
  const pub = path.join(projectPath, 'public');
  if (!fs.existsSync(pub)) return sitemaps;
  try {
    for (const f of fs.readdirSync(pub).filter(f => f.includes('sitemap') && f.endsWith('.xml'))) {
      const content = fs.readFileSync(path.join(pub, f), 'utf-8');
      const urls = (content.match(/<loc>/g) || []).length;
      const types: string[] = [];
      if (content.includes('/city/')) types.push('cities');
      if (content.includes('/services/')) types.push('services');
      if (content.includes('/products/')) types.push('products');
      if (content.includes('/blog/')) types.push('blog');
      if (content.includes('/guides/')) types.push('guides');
      sitemaps.push({ path: `public/${f}`, urls, types: types.length ? types : ['pages'] });
    }
  } catch { /* ignore */ }
  return sitemaps;
}

export function analyzeProject(projectPath: string): ProjectStructure {
  const timer = startTimer('PROJECT-READER', 'Project structure analysis');
  logInfo('PROJECT-READER', `Analyzing project at: ${projectPath}`);
  const structure: ProjectStructure = {
    folders: analyzeFolders(projectPath), templates: findTemplates(projectPath),
    components: findComponents(projectPath), styles: findStyles(projectPath),
    content: findContent(projectPath), images: findImages(projectPath),
    sitemaps: findSitemaps(projectPath), config: detectConfig(projectPath),
  };
  logDebug('PROJECT-READER', `Found ${structure.folders.length} folders, ${structure.templates.length} templates, ${structure.components.length} components`);
  timer.complete('Project analysis');
  return structure;
}

const projectReader = { analyzeProject, countFiles };
export default projectReader;
