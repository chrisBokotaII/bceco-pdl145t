import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApiApp } from '../server';

/**
 * Vercel serverless entry — mounts the Express demo API under /api/*.
 * The Vite SPA is served from `dist` via the Vite framework preset.
 */
const app = createApiApp();

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
