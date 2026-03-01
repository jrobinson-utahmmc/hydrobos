/**
 * SSE (Server-Sent Events) Utility
 * Manages real-time connections with clients.
 */

import type { Response } from 'express';
import { setSSEBroadcast } from './logger';

const clients: Set<Response> = new Set();

export function initSSE(res: Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  clients.add(res);
  res.write(`event: connected\ndata: ${JSON.stringify({ clientCount: clients.size })}\n\n`);

  res.on('close', () => { clients.delete(res); });
}

export function broadcast(event: string, data: unknown): void {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((c) => {
    try { c.write(msg); } catch { clients.delete(c); }
  });
}

export function sendTo(res: Response, event: string, data: unknown): void {
  try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch { clients.delete(res); }
}

export function getClientCount(): number { return clients.size; }

export function broadcastProgress(type: string, current: number, total: number, details?: Record<string, unknown>): void {
  broadcast('progress', { type, current, total, percentage: Math.round((current / total) * 100), ...details });
}

export function broadcastNotification(type: 'info' | 'success' | 'warning' | 'error', message: string, details?: Record<string, unknown>): void {
  broadcast('notification', { type, message, timestamp: new Date().toISOString(), ...details });
}

// Connect SSE ↔ Logger
setSSEBroadcast(broadcast);
