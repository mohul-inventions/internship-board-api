// src/config/database.js
// Opens (or creates) a SQLite database using sql.js (pure WebAssembly — no
// native build required). Exports async factory and a lazy singleton getter.

import initSqlJs from 'sql.js';
import path from 'node:path';
import fs from 'node:fs';
import env from './env.js';

// ---------------------------------------------------------------------------
// Schema SQL
// ---------------------------------------------------------------------------

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS internships (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    company     TEXT    NOT NULL,
    domain      TEXT    NOT NULL,
    location    TEXT    NOT NULL,
    workMode    TEXT    NOT NULL DEFAULT 'onsite'
                        CHECK(workMode IN ('onsite', 'hybrid', 'remote')),
    description TEXT    NOT NULL,
    stipend     REAL    CHECK(stipend IS NULL OR stipend >= 0),
    duration    TEXT    NOT NULL,
    applyUrl    TEXT,
    createdAt   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updatedAt   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TRIGGER IF NOT EXISTS internships_updatedAt
  AFTER UPDATE ON internships
  FOR EACH ROW
  BEGIN
    UPDATE internships SET updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
  END;
`;

// ---------------------------------------------------------------------------
// Parameter normalisation
// sql.js bind() expects named param keys to INCLUDE their prefix character.
// Our SQL uses @name placeholders, so we must pass { '@name': value }.
// Positional arrays are passed through as-is.
// ---------------------------------------------------------------------------

function normaliseParams(params) {
  if (!params) return [];
  if (Array.isArray(params)) return params;

  const out = {};
  for (const [k, v] of Object.entries(params)) {
    // If key already starts with @, :, or $ keep it; otherwise add @
    if (k.startsWith('@') || k.startsWith(':') || k.startsWith('$')) {
      out[k] = v == null ? null : v;
    } else {
      out[`@${k}`] = v == null ? null : v;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Row extraction helper
// ---------------------------------------------------------------------------

function stmtToObject(stmt) {
  const cols = stmt.getColumnNames();
  const vals = stmt.get();
  const obj = {};
  for (let i = 0; i < cols.length; i++) {
    obj[cols[i]] = vals[i];
  }
  return obj;
}

// ---------------------------------------------------------------------------
// sql.js wrapper
// Provides a synchronous-looking query API identical to better-sqlite3 so
// the rest of the codebase (services) is completely unaffected.
// ---------------------------------------------------------------------------

class SqlJsWrapper {
  /**
   * @param {import('sql.js').Database} sqlJsDb
   * @param {string|null} filePath  Disk path for persistence, or null for :memory:
   */
  constructor(sqlJsDb, filePath) {
    this._db = sqlJsDb;
    this._filePath = filePath;
  }

  /** Write the current in-memory DB state to disk (no-op for :memory:). */
  _persist() {
    if (this._filePath) {
      const data = this._db.export();
      fs.writeFileSync(this._filePath, Buffer.from(data));
    }
  }

  /**
   * Execute one or more SQL statements (DDL, triggers, etc.).
   */
  exec(sql) {
    this._db.run(sql);
    this._persist();
  }

  /**
   * Returns a statement-like object with .get(), .all(), and .run() methods.
   * Mirrors the better-sqlite3 API so service code needs no changes.
   */
  prepare(sql) {
    const self = this;

    return {
      /**
       * Execute and return the first row as a plain object, or undefined.
       */
      get(params) {
        const stmt = self._db.prepare(sql);
        try {
          stmt.bind(normaliseParams(params));
          return stmt.step() ? stmtToObject(stmt) : undefined;
        } finally {
          stmt.free();
        }
      },

      /**
       * Execute and return all matching rows as plain objects.
       */
      all(params) {
        const stmt = self._db.prepare(sql);
        try {
          stmt.bind(normaliseParams(params));
          const rows = [];
          while (stmt.step()) {
            rows.push(stmtToObject(stmt));
          }
          return rows;
        } finally {
          stmt.free();
        }
      },

      /**
       * Execute a write statement (INSERT / UPDATE / DELETE).
       * Returns { changes, lastInsertRowid } — same shape as better-sqlite3.
       */
      run(params) {
        const stmt = self._db.prepare(sql);
        try {
          stmt.bind(normaliseParams(params));
          stmt.step();
        } finally {
          stmt.free();
        }

        const changes = self._db.getRowsModified();

        // Retrieve lastInsertRowid via a separate query
        const ridStmt = self._db.prepare('SELECT last_insert_rowid() AS rid');
        let lastInsertRowid = 0;
        try {
          if (ridStmt.step()) {
            lastInsertRowid = ridStmt.get()[0];
          }
        } finally {
          ridStmt.free();
        }

        self._persist();
        return { changes, lastInsertRowid };
      },
    };
  }

  close() {
    this._persist();
    this._db.close();
  }
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

/**
 * Asynchronously initialises sql.js WASM and returns a SqlJsWrapper.
 * @param {string} [dbPath] - ':memory:' or a file path.
 */
export async function createDatabase(dbPath) {
  const resolvedPath = dbPath ?? env.DB_PATH;
  const SQL = await initSqlJs();

  let sqlJsDb;
  if (resolvedPath === ':memory:') {
    sqlJsDb = new SQL.Database();
  } else {
    const dir = path.dirname(resolvedPath);
    fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(resolvedPath)) {
      const fileBuffer = fs.readFileSync(resolvedPath);
      sqlJsDb = new SQL.Database(fileBuffer);
    } else {
      sqlJsDb = new SQL.Database();
    }
  }

  const wrapper = new SqlJsWrapper(
    sqlJsDb,
    resolvedPath === ':memory:' ? null : resolvedPath,
  );
  wrapper.exec(SCHEMA_SQL);
  return wrapper;
}

// ---------------------------------------------------------------------------
// Singleton for the main application process
// ---------------------------------------------------------------------------

let _db = null;

/**
 * Returns the shared application DB instance (lazy-initialised on first call).
 */
export async function getDb() {
  if (!_db) {
    _db = await createDatabase();
  }
  return _db;
}
