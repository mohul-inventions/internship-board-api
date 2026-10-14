// src/services/internship.service.js
// All database access for internships lives here.
// Controllers call these functions — no raw SQL in route handlers.

/**
 * Creates an AppError with a statusCode for the global error handler.
 */
function AppError(message, statusCode = 500, code = 'ERROR', details = []) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  err.details = details;
  return err;
}

// Whitelisted sort columns — prevents SQL injection via ORDER BY
const SORT_COLUMNS = {
  createdAt: 'createdAt',
  title:     'title',
  company:   'company',
};

/**
 * Returns a page of internships with optional search, filter, and sort.
 * @param {import('better-sqlite3').Database} db
 * @param {object} query - Validated query params from listQuerySchema
 */
export function listInternships(db, query) {
  const { page, limit, q, domain, workMode, sortBy, order } = query;
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = {};

  if (q) {
    conditions.push(
      `(title LIKE @search OR company LIKE @search OR description LIKE @search OR domain LIKE @search)`
    );
    params.search = `%${q}%`;
  }

  if (domain) {
    conditions.push(`domain = @domain`);
    params.domain = domain;
  }

  if (workMode) {
    conditions.push(`workMode = @workMode`);
    params.workMode = workMode;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const col   = SORT_COLUMNS[sortBy] ?? 'createdAt';
  const dir   = order === 'asc' ? 'ASC' : 'DESC';

  const countRow = db
    .prepare(`SELECT COUNT(*) AS total FROM internships ${where}`)
    .get(params);

  const total = countRow ? (countRow.total ?? 0) : 0;

  const rows = db
    .prepare(
      `SELECT * FROM internships ${where} ORDER BY ${col} ${dir} LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit, offset });

  return {
    data:       rows,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Returns a single internship by id, or throws a 404 AppError.
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 */
export function getInternshipById(db, id) {
  const row = db.prepare(`SELECT * FROM internships WHERE id = ?`).get([id]);
  if (!row) {
    throw AppError(`Internship with id ${id} not found`, 404, 'NOT_FOUND');
  }
  return row;
}

/**
 * Inserts a new internship and returns the created record.
 * @param {import('better-sqlite3').Database} db
 * @param {object} data - Validated body from createInternshipSchema
 */
export function createInternship(db, data) {
  const stmt = db.prepare(`
    INSERT INTO internships (title, company, domain, location, workMode, description, stipend, duration, applyUrl)
    VALUES (@title, @company, @domain, @location, @workMode, @description, @stipend, @duration, @applyUrl)
  `);

  const info = stmt.run({
    title:       data.title,
    company:     data.company,
    domain:      data.domain,
    location:    data.location,
    workMode:    data.workMode ?? 'onsite',
    description: data.description,
    stipend:     data.stipend ?? null,
    duration:    data.duration,
    applyUrl:    data.applyUrl ?? null,
  });

  return getInternshipById(db, info.lastInsertRowid);
}

/**
 * Updates an existing internship and returns the updated record.
 * Only provided fields are changed (partial update).
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 * @param {object} data - Validated body from updateInternshipSchema (partial)
 */
export function updateInternship(db, id, data) {
  // Confirm existence first
  getInternshipById(db, id);

  const fields = Object.keys(data);
  if (fields.length === 0) {
    throw AppError('No fields provided for update', 400, 'VALIDATION_ERROR');
  }

  const setClauses = fields.map((f) => `${f} = @${f}`).join(', ');
  const stmt = db.prepare(`UPDATE internships SET ${setClauses} WHERE id = @id`);
  stmt.run({ ...data, id });

  return getInternshipById(db, id);
}

/**
 * Deletes an internship by id. Throws 404 if not found.
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 */
export function deleteInternship(db, id) {
  getInternshipById(db, id); // throws 404 if missing
  db.prepare(`DELETE FROM internships WHERE id = ?`).run([id]);
}
