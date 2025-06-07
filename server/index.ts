import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { backgroundSync } from "./services/backgroundSync";
import { logger } from "./services/logger";
import { performanceMonitor } from "./services/performanceMonitor";
import { errorTracker } from "./services/errorTracker";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add performance monitoring middleware
app.use(performanceMonitor.middleware());

// Enhanced request logging with monitoring
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);

      // Log API errors with more detail
      if (res.statusCode >= 400 && capturedJsonResponse?.error) {
        logger.warn('API Error Response', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          error: capturedJsonResponse.error,
          message: capturedJsonResponse.message,
          requestId: req.requestId,
          duration
        });
      }
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Enhanced error handling with tracking
  app.use(errorTracker.middleware());

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Enhanced process error handlers with logging
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      type: 'uncaughtException',
      pid: process.pid,
      uptime: process.uptime()
    }, error);
    
    errorTracker.trackError(error, {
      method: 'PROCESS',
      path: 'uncaughtException'
    });
    
    console.error('Uncaught Exception:', error);
    // Don't exit the process, just log the error
  });

  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    
    logger.error('Unhandled Rejection', {
      type: 'unhandledRejection',
      promise: promise.toString(),
      reason: String(reason),
      pid: process.pid
    }, error);
    
    errorTracker.trackError(error, {
      method: 'PROCESS',
      path: 'unhandledRejection'
    });
    
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process, just log the error
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    performanceMonitor.cleanup();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    performanceMonitor.cleanup();
    process.exit(0);
  });

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Log application startup
    logger.info('Application started successfully', {
      port,
      nodeEnv: process.env.NODE_ENV,
      nodeVersion: process.version,
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    });

    // Start background sync for fresh retailer data
    backgroundSync.start(30); // Sync every 30 minutes
    
    logger.info('Background sync started', { intervalMinutes: 30 });
  });
})();