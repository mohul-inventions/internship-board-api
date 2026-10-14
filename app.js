// src/app.js
// Creates and configures the Express application.
// Does NOT call app.listen — that lives in server.js so tests can import this
// module without binding to a port.

import express from 'express';
import healthRoutes from './routes/health.routes.js';
import internshipRoutes from './routes/internship.routes.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

/**
 * @param {import('better-sqlite3').Database} db - Injected DB instance
 */
export function createApp(db) {
  const app = express();

  // ── Body parsing ──────────────────────────────────────────────────────────
  // strict:false lets express forward SyntaxErrors for malformed JSON
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use('/api/health',       healthRoutes);
  app.use('/api/internships',  internshipRoutes(db));

  // ── Error handling (must be last) ─────────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
