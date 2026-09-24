let app: any;

try {
  // @ts-ignore
  const serverModule = await import('../dist/server.cjs');
  app = serverModule.default ?? serverModule;
} catch (error) {
  console.error('Failed to load built server bundle from dist/server.cjs:', error);
  throw error;
}

export default app;
