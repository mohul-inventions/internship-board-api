// src/controllers/internship.controller.js
// Thin controllers: parse validated input, delegate to service, format response.
// All DB errors bubble up to the global errorHandler via next(err).

import * as service from '../services/internship.service.js';

/**
 * GET /api/internships
 */
export function list(db) {
  return (req, res, next) => {
    try {
      const result = service.listInternships(db, req.query);
      res.status(200).json({
        success: true,
        data:    result,
        message: 'Internships retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };
}

/**
 * GET /api/internships/:id
 */
export function getOne(db) {
  return (req, res, next) => {
    try {
      const internship = service.getInternshipById(db, req.params.id);
      res.status(200).json({
        success: true,
        data:    internship,
        message: 'Internship retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };
}

/**
 * POST /api/internships
 */
export function create(db) {
  return (req, res, next) => {
    try {
      const internship = service.createInternship(db, req.body);
      res.status(201).json({
        success: true,
        data:    internship,
        message: 'Internship created successfully',
      });
    } catch (err) {
      next(err);
    }
  };
}

/**
 * PUT /api/internships/:id
 */
export function update(db) {
  return (req, res, next) => {
    try {
      const internship = service.updateInternship(db, req.params.id, req.body);
      res.status(200).json({
        success: true,
        data:    internship,
        message: 'Internship updated successfully',
      });
    } catch (err) {
      next(err);
    }
  };
}

/**
 * DELETE /api/internships/:id
 */
export function remove(db) {
  return (req, res, next) => {
    try {
      service.deleteInternship(db, req.params.id);
      res.status(200).json({
        success: true,
        data:    null,
        message: 'Internship deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  };
}
