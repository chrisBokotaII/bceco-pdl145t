import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApiApp } from '../server';

/**
 * Vercel serverless entry — mounts the Express demo API under /api/*.
 * api/package.json forces CommonJS so @vercel/node bundles the import graph
 * (native ESM leaves extensionless ../server unresolved at runtime).
 */
const app = createApiApp();

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
