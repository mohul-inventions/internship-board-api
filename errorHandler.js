// src/middleware/errorHandler.js
// Global Express error-handling middleware.
// Must be registered LAST (after all routes).

import { isProd } from '../config/env.js';

/**
 * Handles errors forwarded via next(err).
 * - Never exposes stack traces or internal DB details in production.
 * - Handles malformed JSON (SyntaxError from body-parser).
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Malformed JSON body
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Request body contains malformed JSON',
        details: [],
      },
    });
  }

  // Operational errors with a known HTTP status (set by services/controllers)
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code ?? 'ERROR',
        message: err.message,
        details: err.details ?? [],
      },
    });
  }

  // Unexpected errors — log server-side, never expose internals
  console.error('[ERROR]', err);

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
      details: [],
    },
  });
}
