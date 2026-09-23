import type { Request, Response } from 'express';

let cachedApp: any = null;

async function getApp() {
  if (cachedApp) return cachedApp;

  try {
    // @ts-ignore
    const serverModule = await import('../dist/server.cjs');
    cachedApp = serverModule.default ?? serverModule;
    return cachedApp;
  } catch (error) {
    console.error('Failed to load built server bundle from dist/server.cjs:', error);
    throw error;
  }
}

export default async function handler(req: Request, res: Response) {
  try {
    const app = await getApp();
    app(req, res);
  } catch (error: any) {
    res.status(500).json({
      error: 'Server initialization failed',
      message: error?.message || 'Unknown error'
    });
  }
}
