import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApiApp } from '../server.ts';

const app = createApiApp();

/**
 * Vercel serverless entry — mounts the Express demo API under /api/*.
 * The Vite SPA is served from `dist` via vercel.json static output.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
