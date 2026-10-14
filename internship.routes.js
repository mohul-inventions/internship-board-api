// src/routes/internship.routes.js
// Accepts a `db` instance so tests can inject an isolated database.

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  createInternshipSchema,
  updateInternshipSchema,
  listQuerySchema,
  idParamSchema,
} from '../validators/internship.validator.js';
import * as ctrl from '../controllers/internship.controller.js';

/**
 * @param {import('better-sqlite3').Database} db
 */
export default function internshipRoutes(db) {
  const router = Router();

  router.get(
    '/',
    validate(listQuerySchema, 'query'),
    ctrl.list(db)
  );

  router.get(
    '/:id',
    validate(idParamSchema, 'params'),
    ctrl.getOne(db)
  );

  router.post(
    '/',
    validate(createInternshipSchema, 'body'),
    ctrl.create(db)
  );

  router.put(
    '/:id',
    validate(idParamSchema, 'params'),
    validate(updateInternshipSchema, 'body'),
    ctrl.update(db)
  );

  router.delete(
    '/:id',
    validate(idParamSchema, 'params'),
    ctrl.remove(db)
  );

  return router;
}
