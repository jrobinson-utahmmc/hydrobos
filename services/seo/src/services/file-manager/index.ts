/**
 * File Manager Service — File listing, reading, image utilities, operations.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { FileOperation, ImageInfo } from '../../types';
import { logDebug, logError, logInfo, logWarn, startTimer } from '../../lib/logger';

const ALLOWED_EXTENSIONS = new Set([
  '.tsx', '.jsx', '.ts', '.js', '.css', '.html', '.json', '.mdx', '.md',
  '.xml', '.txt', '.yaml', '.yml', '.toml', '.env', '.gitignore',
]);

const IMAGE_EXTENSIONS = new Set(['.webp', '.jpg', '.jpeg', '.png', '.avif', '.gif', '.svg', '.ico']);

function isPathSafe(base: string, target: string): boolean {
  const resolved = path.resolve(base, target);
  return resolved.startsWith(path.resolve(base));
}

export function listDirectory(projectPath: string, relativePath = ''): { name: string; type: 'file' | 'directory'; size?: number }[] {
  const full = path.join(projectPath, relativePath);
  if (!isPathSafe(projectPath, relativePath)) throw new Error('Path traversal not allowed');
  if (!fs.existsSync(full)) throw new Error(`Directory not found: ${relativePath || '/'}`);

  return fs.readdirSync(full, { withFileTypes: true })
    .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
    .map(e => {
      const entry: { name: string; type: 'file' | 'directory'; size?: number } = {
        name: e.name,
        type: e.isDirectory() ? 'directory' : 'file',
      };
      if (e.isFile()) {
        try { entry.size = fs.statSync(path.join(full, e.name)).size; } catch { /* ignore */ }
      }
      return entry;
    })
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1));
}

export function readFile(projectPath: string, filePath: string): { content: string; size: number; extension: string } {
  if (!isPathSafe(projectPath, filePath)) throw new Error('Path traversal not allowed');
  const full = path.join(projectPath, filePath);
  if (!fs.existsSync(full)) throw new Error(`File not found: ${filePath}`);

  const ext = path.extname(full).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error(`File type not allowed: ${ext}`);

  const stats = fs.statSync(full);
  if (stats.size > 2 * 1024 * 1024) throw new Error('File too large (>2MB)');

  return { content: fs.readFileSync(full, 'utf-8'), size: stats.size, extension: ext };
}

export function getImageFiles(projectPath: string): ImageInfo[] {
  const images: ImageInfo[] = [];
  for (const dir of ['public/images', 'public/img', 'src/assets/images', 'public']) {
    const full = path.join(projectPath, dir);
    if (!fs.existsSync(full)) continue;
    try { scanImagesRecursive(full, dir, images); } catch { /* ignore */ }
  }
  return images;
}

function scanImagesRecursive(dirPath: string, relativeBase: string, images: ImageInfo[], depth = 0) {
  if (depth > 5) return;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      scanImagesRecursive(fullPath, `${relativeBase}/${entry.name}`, images, depth + 1);
    } else if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      const stats = fs.statSync(fullPath);
      images.push({
        folder: relativeBase,
        count: 1,
        formats: [path.extname(entry.name).slice(1)],
        samples: [entry.name],
        size: stats.size,
        path: `${relativeBase}/${entry.name}`,
      } as ImageInfo & { size: number; path: string });
    }
  }
}

export function executeOperation(projectPath: string, op: FileOperation): { success: boolean; message: string } {
  const timer = startTimer('FILE-MGR', `${op.type} operation`);

  const opPath = op.path || op.sourcePath || '';
  if (!isPathSafe(projectPath, opPath)) throw new Error('Path traversal not allowed');
  const full = path.join(projectPath, opPath);

  try {
    switch (op.type) {
      case 'create': {
        const dir = path.dirname(full);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (fs.existsSync(full) && !op.overwrite) throw new Error(`File already exists: ${opPath}`);
        fs.writeFileSync(full, op.content || '', 'utf-8');
        timer.complete(`Created ${opPath}`);
        return { success: true, message: `Created file: ${opPath}` };
      }
      case 'edit':
      case 'modify': {
        if (!fs.existsSync(full)) throw new Error(`File not found: ${opPath}`);
        fs.writeFileSync(full, op.content || '', 'utf-8');
        timer.complete(`Modified ${opPath}`);
        return { success: true, message: `Modified file: ${opPath}` };
      }
      case 'delete': {
        if (!fs.existsSync(full)) throw new Error(`File not found: ${opPath}`);
        fs.unlinkSync(full);
        timer.complete(`Deleted ${opPath}`);
        return { success: true, message: `Deleted file: ${opPath}` };
      }
      case 'rename':
      case 'move': {
        if (!fs.existsSync(full)) throw new Error(`File not found: ${opPath}`);
        const newTarget = op.newPath || op.targetPath;
        if (!newTarget) throw new Error('newPath/targetPath required for rename/move');
        if (!isPathSafe(projectPath, newTarget)) throw new Error('Path traversal not allowed');
        const newFull = path.join(projectPath, newTarget);
        fs.renameSync(full, newFull);
        timer.complete(`Renamed ${opPath} → ${newTarget}`);
        return { success: true, message: `Renamed: ${opPath} → ${newTarget}` };
      }
      case 'createFolder': {
        if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
        timer.complete(`Created folder ${opPath}`);
        return { success: true, message: `Created folder: ${opPath}` };
      }
      default:
        throw new Error(`Unknown operation: ${op.type}`);
    }
  } catch (error: any) {
    logError('FILE-MGR', `Operation failed: ${error.message}`);
    return { success: false, message: error.message };
  }
}

export function exportImagesCSV(projectPath: string): string {
  const images = getImageFiles(projectPath);
  const rows = ['path,folder,format,size'];
  for (const img of images) {
    const ext = (img as any).path ? path.extname((img as any).path).slice(1) : img.formats[0];
    rows.push(`"${(img as any).path || img.folder}","${img.folder}","${ext}","${(img as any).size || ''}"`);
  }
  return rows.join('\n');
}

const fileManager = { listDirectory, readFile, getImageFiles, executeOperation, exportImagesCSV };
export default fileManager;
