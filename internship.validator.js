// src/validators/internship.validator.js
// Zod schemas for validating request bodies and query parameters.

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const nonEmptyString = (field) =>
  z.string({ required_error: `${field} is required` }).trim().min(1, `${field} cannot be empty`);

const WORK_MODES = ['onsite', 'hybrid', 'remote'];
const SORT_FIELDS = ['createdAt', 'title', 'company'];
const SORT_ORDERS = ['asc', 'desc'];

// ---------------------------------------------------------------------------
// Body schemas
// ---------------------------------------------------------------------------

export const createInternshipSchema = z.object({
  title:       nonEmptyString('title'),
  company:     nonEmptyString('company'),
  domain:      nonEmptyString('domain'),
  location:    nonEmptyString('location'),
  workMode:    z.enum(WORK_MODES, {
    errorMap: () => ({ message: `workMode must be one of: ${WORK_MODES.join(', ')}` }),
  }).default('onsite'),
  description: nonEmptyString('description'),
  stipend:     z
    .number({ invalid_type_error: 'stipend must be a number' })
    .nonnegative('stipend must be >= 0')
    .optional(),
  duration:    nonEmptyString('duration'),
  applyUrl:    z.string().url('applyUrl must be a valid URL').optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
});

export const updateInternshipSchema = createInternshipSchema.partial();

// ---------------------------------------------------------------------------
// Query parameter schemas
// ---------------------------------------------------------------------------

export const listQuerySchema = z.object({
  page:     z.coerce.number().int().min(1, 'page must be >= 1').default(1),
  limit:    z.coerce.number().int().min(1, 'limit must be >= 1').max(100, 'limit must be <= 100').default(10),
  q:        z.string().optional(),
  domain:   z.string().optional(),
  workMode: z.enum(WORK_MODES).optional(),
  sortBy:   z.enum(SORT_FIELDS).default('createdAt'),
  order:    z.enum(SORT_ORDERS).default('desc'),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('id must be a positive integer'),
});
