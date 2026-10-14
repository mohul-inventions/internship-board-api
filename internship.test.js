// tests/internship.test.js
// Vitest + Supertest integration tests.
// Uses an in-memory SQLite database — never touches the development DB.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createDatabase } from '../src/config/database.js';
import { createApp } from '../src/app.js';

// ---------------------------------------------------------------------------
// Setup: in-memory DB + isolated app instance
// ---------------------------------------------------------------------------

let db;
let app;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  db  = await createDatabase(':memory:');
  app = createApp(db);
});

afterAll(() => {
  db.close();
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const validPayload = () => ({
  title:       'Software Engineering Intern',
  company:     'Acme Corp',
  domain:      'Web Development',
  location:    'Remote',
  workMode:    'remote',
  description: 'Build and maintain REST APIs using Node.js and PostgreSQL.',
  stipend:     15000,
  duration:    '3 months',
  applyUrl:    'https://acme.example.com/apply',
});

// ---------------------------------------------------------------------------
// 1. Health endpoint
// ---------------------------------------------------------------------------

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });
});

// ---------------------------------------------------------------------------
// 2. Unknown routes
// ---------------------------------------------------------------------------

describe('Unknown routes', () => {
  it('returns 404 for an unknown path', async () => {
    const res = await request(app).get('/api/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// 3. Create internship — valid
// ---------------------------------------------------------------------------

describe('POST /api/internships', () => {
  it('creates an internship and returns 201 with the new record', async () => {
    const res = await request(app).post('/api/internships').send(validPayload());
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      title:   'Software Engineering Intern',
      company: 'Acme Corp',
    });
    expect(res.body.data.id).toBeTypeOf('number');
    expect(res.body.data.createdAt).toBeTypeOf('string');
  });

  it('defaults workMode to onsite when not provided', async () => {
    const payload = validPayload();
    delete payload.workMode;
    const res = await request(app).post('/api/internships').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.workMode).toBe('onsite');
  });
});

// ---------------------------------------------------------------------------
// 4. Create internship — validation errors
// ---------------------------------------------------------------------------

describe('POST /api/internships — validation', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/internships').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeInstanceOf(Array);
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('returns 400 for invalid workMode', async () => {
    const res = await request(app)
      .post('/api/internships')
      .send({ ...validPayload(), workMode: 'flying' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for negative stipend', async () => {
    const res = await request(app)
      .post('/api/internships')
      .send({ ...validPayload(), stipend: -500 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid applyUrl', async () => {
    const res = await request(app)
      .post('/api/internships')
      .send({ ...validPayload(), applyUrl: 'not-a-url' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for malformed JSON body', async () => {
    const res = await request(app)
      .post('/api/internships')
      .set('Content-Type', 'application/json')
      .send('{bad json');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. List internships — pagination
// ---------------------------------------------------------------------------

describe('GET /api/internships', () => {
  // Seed a few records before pagination tests
  beforeAll(async () => {
    for (let i = 1; i <= 5; i++) {
      await request(app).post('/api/internships').send({
        ...validPayload(),
        title:   `Intern Role ${i}`,
        company: `Company ${i}`,
        domain:  i % 2 === 0 ? 'Design' : 'Engineering',
        workMode: i % 3 === 0 ? 'remote' : 'onsite',
      });
    }
  });

  it('returns a paginated list with metadata', async () => {
    const res = await request(app).get('/api/internships?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { data } = res.body;
    expect(data.data).toBeInstanceOf(Array);
    expect(data.data.length).toBeLessThanOrEqual(2);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(2);
    expect(typeof data.total).toBe('number');
    expect(typeof data.totalPages).toBe('number');
  });

  it('returns page 2 with different records than page 1', async () => {
    const page1 = await request(app).get('/api/internships?page=1&limit=2');
    const page2 = await request(app).get('/api/internships?page=2&limit=2');
    const ids1 = page1.body.data.data.map((r) => r.id);
    const ids2 = page2.body.data.data.map((r) => r.id);
    const overlap = ids1.filter((id) => ids2.includes(id));
    expect(overlap.length).toBe(0);
  });

  it('defaults to page=1 and limit=10 when not provided', async () => {
    const res = await request(app).get('/api/internships');
    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// 6. Search
// ---------------------------------------------------------------------------

describe('GET /api/internships — search', () => {
  it('filters records by search term q', async () => {
    // Create a uniquely-named record to search for
    await request(app).post('/api/internships').send({
      ...validPayload(),
      title: 'UniqueSearchableTitle XYZ',
    });

    const res = await request(app).get('/api/internships?q=UniqueSearchableTitle');
    expect(res.status).toBe(200);
    expect(res.body.data.data.length).toBeGreaterThan(0);
    expect(res.body.data.data[0].title).toContain('UniqueSearchableTitle');
  });

  it('returns empty data when search term matches nothing', async () => {
    const res = await request(app).get('/api/internships?q=ZZZNOMATCH9999');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.data).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 7. Filters
// ---------------------------------------------------------------------------

describe('GET /api/internships — filters', () => {
  it('filters by workMode', async () => {
    const res = await request(app).get('/api/internships?workMode=remote');
    expect(res.status).toBe(200);
    res.body.data.data.forEach((r) => expect(r.workMode).toBe('remote'));
  });

  it('filters by domain', async () => {
    const res = await request(app).get('/api/internships?domain=Design');
    expect(res.status).toBe(200);
    res.body.data.data.forEach((r) => expect(r.domain).toBe('Design'));
  });

  it('returns 400 for invalid workMode filter', async () => {
    const res = await request(app).get('/api/internships?workMode=flying');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// 8. Sorting
// ---------------------------------------------------------------------------

describe('GET /api/internships — sorting', () => {
  it('sorts by title ascending', async () => {
    const res = await request(app).get('/api/internships?sortBy=title&order=asc&limit=100');
    expect(res.status).toBe(200);
    const titles = res.body.data.data.map((r) => r.title);
    const sorted = [...titles].sort((a, b) => a.localeCompare(b));
    expect(titles).toEqual(sorted);
  });

  it('sorts by company descending', async () => {
    const res = await request(app).get('/api/internships?sortBy=company&order=desc&limit=100');
    expect(res.status).toBe(200);
    const companies = res.body.data.data.map((r) => r.company);
    const sorted = [...companies].sort((a, b) => b.localeCompare(a));
    expect(companies).toEqual(sorted);
  });
});

// ---------------------------------------------------------------------------
// 9. Invalid pagination parameters
// ---------------------------------------------------------------------------

describe('GET /api/internships — invalid pagination', () => {
  it('returns 400 when page is 0', async () => {
    const res = await request(app).get('/api/internships?page=0');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when limit exceeds 100', async () => {
    const res = await request(app).get('/api/internships?limit=200');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when page is not a number', async () => {
    const res = await request(app).get('/api/internships?page=abc');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// 10. Get single internship
// ---------------------------------------------------------------------------

describe('GET /api/internships/:id', () => {
  let createdId;

  beforeAll(async () => {
    const res = await request(app).post('/api/internships').send(validPayload());
    createdId = res.body.data.id;
  });

  it('returns the internship by id', async () => {
    const res = await request(app).get(`/api/internships/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdId);
  });

  it('returns 404 for a nonexistent id', async () => {
    const res = await request(app).get('/api/internships/999999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for a non-integer id', async () => {
    const res = await request(app).get('/api/internships/abc');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// 11. Update internship
// ---------------------------------------------------------------------------

describe('PUT /api/internships/:id', () => {
  let createdId;

  beforeAll(async () => {
    const res = await request(app).post('/api/internships').send(validPayload());
    createdId = res.body.data.id;
  });

  it('updates the internship and returns the updated record', async () => {
    const res = await request(app)
      .put(`/api/internships/${createdId}`)
      .send({ title: 'Updated Intern Title', stipend: 20000 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Updated Intern Title');
    expect(res.body.data.stipend).toBe(20000);
  });

  it('returns 404 when updating a nonexistent id', async () => {
    const res = await request(app)
      .put('/api/internships/999999')
      .send({ title: 'Ghost' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for invalid update data', async () => {
    const res = await request(app)
      .put(`/api/internships/${createdId}`)
      .send({ workMode: 'flying' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// 12. Delete internship
// ---------------------------------------------------------------------------

describe('DELETE /api/internships/:id', () => {
  let createdId;

  beforeAll(async () => {
    const res = await request(app).post('/api/internships').send(validPayload());
    createdId = res.body.data.id;
  });

  it('deletes the internship and returns 200', async () => {
    const res = await request(app).delete(`/api/internships/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });

  it('returns 404 after deleting the same record again', async () => {
    const res = await request(app).delete(`/api/internships/${createdId}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// 13. Error response consistency
// ---------------------------------------------------------------------------

describe('Error response shape consistency', () => {
  it('all error responses have success:false and error.code', async () => {
    const endpoints = [
      () => request(app).get('/api/internships/999999'),
      () => request(app).post('/api/internships').send({}),
      () => request(app).get('/api/internships?page=0'),
      () => request(app).get('/no-such-route'),
    ];

    for (const call of endpoints) {
      const res = await call();
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBeTypeOf('string');
      expect(res.body.error.message).toBeTypeOf('string');
    }
  });
});
