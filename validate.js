// src/middleware/validate.js
// Reusable Zod validation middleware factory.
// Usage: validate(schema, 'body' | 'query' | 'params')

import { ZodError } from 'zod';

/**
 * Returns an Express middleware that validates req[source] against `schema`.
 * On success, replaces req[source] with the parsed (coerced/defaulted) value.
 * On failure, calls next() with a structured 400 error.
 *
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} source
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details,
        },
      });
    }
    req[source] = result.data; // replace with parsed/coerced value
    next();
  };
}
