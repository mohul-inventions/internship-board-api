# 🎓 Internship Board API

A production-minded, beginner-friendly REST API for managing internship listings. Built with **Node.js**, **Express**, **SQLite** (`sql.js`), and validated with **Zod**. Tests powered by **Vitest** + **Supertest**.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Starting the Server](#starting-the-server)
- [Seeding the Database](#seeding-the-database)
- [API Endpoints](#api-endpoints)
- [Example Requests and Responses](#example-requests-and-responses)
- [Pagination, Search, Filters and Sorting](#pagination-search-filters-and-sorting)
- [Running Automated Tests](#running-automated-tests)
- [Error Status Codes](#error-status-codes)

---

## Project Overview

The Internship Board API provides full CRUD operations for internship listings with:

- **Persistent SQLite storage** — data survives server restarts
- **Zod request validation** — descriptive errors for bad input
- **Pagination, search, filters, and sorting** on the list endpoint
- **Consistent JSON response shape** for both success and errors
- **Isolated in-memory DB for tests** — development database is never touched

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js     | >= 18.x |
| npm         | >= 9.x  |

---

## Installation

```bash
git clone https://github.com/your-username/internship-board-api.git
cd internship-board-api
npm install
```

---

## Environment Configuration

Copy the example file and adjust as needed:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| NODE_ENV | development | development, production, or test |
| PORT | 3000 | HTTP port the server listens on |
| DB_PATH | ./data/internships.db | Path to the SQLite database file |

---

## Starting the Server

```bash
# Development (auto-restarts on file changes — Node >= 18)
npm run dev

# Production
npm start
```

The server will print:
```
🚀 Internship Board API running on http://localhost:3000
   Environment : development
   Database    : ./data/internships.db
```

The SQLite database and schema are created automatically on first startup.

---

## Seeding the Database

Inserts 10 realistic sample internships. Safe to run multiple times — duplicate records are skipped.

```bash
npm run seed
```

Output:
```
Seed complete — 10 new record(s) inserted, 0 skipped (already exist).
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/health | Service health check |
| GET | /api/internships | List internships (paginated) |
| GET | /api/internships/:id | Get a single internship by ID |
| POST | /api/internships | Create a new internship |
| PUT | /api/internships/:id | Update an internship (partial OK) |
| DELETE | /api/internships/:id | Delete an internship |

### Data Model

| Field | Type | Required | Constraints |
|---|---|---|---|
| id | integer | auto | Primary key |
| title | string | yes | Non-empty |
| company | string | yes | Non-empty |
| domain | string | yes | Non-empty |
| location | string | yes | Non-empty |
| workMode | string | yes | `onsite` \| `hybrid` \| `remote` |
| description | string | yes | Non-empty |
| stipend | number | no | Non-negative float |
| duration | string | yes | Non-empty (e.g. `3 months`) |
| applyUrl | string | no | Valid URL |
| createdAt | string | auto | ISO 8601 timestamp |
| updatedAt | string | auto | ISO 8601, auto-updated on PUT |

---

## Example Requests and Responses

### Health Check

```bash
curl http://localhost:3000/api/health
```

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "uptime": 42.5
  },
  "message": "Service is healthy"
}
```

### Create an Internship

```bash
curl -X POST http://localhost:3000/api/internships \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Backend Engineering Intern",
    "company": "Acme Corp",
    "domain": "Web Development",
    "location": "Bengaluru, Karnataka",
    "workMode": "hybrid",
    "description": "Build REST APIs with Node.js and PostgreSQL.",
    "stipend": 20000,
    "duration": "3 months",
    "applyUrl": "https://acme.example.com/apply"
  }'
```

**201 Created:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Backend Engineering Intern",
    "company": "Acme Corp",
    "domain": "Web Development",
    "location": "Bengaluru, Karnataka",
    "workMode": "hybrid",
    "description": "Build REST APIs with Node.js and PostgreSQL.",
    "stipend": 20000,
    "duration": "3 months",
    "applyUrl": "https://acme.example.com/apply",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Internship created successfully"
}
```

### Get Single Internship

```bash
curl http://localhost:3000/api/internships/1
```

### Update an Internship (Partial)

```bash
curl -X PUT http://localhost:3000/api/internships/1 \
  -H "Content-Type: application/json" \
  -d '{ "stipend": 25000, "workMode": "remote" }'
```

### Delete an Internship

```bash
curl -X DELETE http://localhost:3000/api/internships/1
```

**200 OK:**
```json
{
  "success": true,
  "data": null,
  "message": "Internship deleted successfully"
}
```

---

## Pagination, Search, Filters and Sorting

All query parameters are optional. Defaults: `page=1`, `limit=10`, `sortBy=createdAt`, `order=desc`.

### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| page | integer | 1 | Page number (>= 1) |
| limit | integer | 10 | Records per page (1–100) |
| q | string | — | Search in title, company, domain, description |
| domain | string | — | Exact match on domain |
| workMode | string | — | `onsite` \| `hybrid` \| `remote` |
| sortBy | string | createdAt | `createdAt` \| `title` \| `company` |
| order | string | desc | `asc` \| `desc` |

### Examples

```bash
# Page 2, 5 items per page
curl "http://localhost:3000/api/internships?page=2&limit=5"

# Search for "machine learning"
curl "http://localhost:3000/api/internships?q=machine+learning"

# Filter by domain
curl "http://localhost:3000/api/internships?domain=Data+Science"

# Filter by workMode
curl "http://localhost:3000/api/internships?workMode=remote"

# Sort by title A to Z
curl "http://localhost:3000/api/internships?sortBy=title&order=asc"

# Combine: remote Data Science internships sorted by company
curl "http://localhost:3000/api/internships?workMode=remote&domain=Data+Science&sortBy=company&order=asc"
```

### Paginated Response Shape

```json
{
  "success": true,
  "data": {
    "data": [{ "id": 1, "title": "..." }],
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  },
  "message": "Internships retrieved successfully"
}
```

---

## Running Automated Tests

Tests use an isolated in-memory SQLite database. The development database is never modified.

```bash
npm test
```

### What is tested

- Health endpoint
- Unknown and unsupported routes (404)
- Create internship with valid payload
- Create internship with missing required fields
- Create internship with invalid `workMode`, negative `stipend`, bad URL
- Malformed JSON body
- List with pagination metadata
- Page 1 vs page 2 return different records
- Default page and limit values
- Search with `q` parameter
- Filter by `workMode`
- Filter by `domain`
- Invalid filter value (400)
- Sort by title ascending
- Sort by company descending
- Invalid pagination (`page=0`, `limit=200`, `page=abc`)
- Get internship by ID
- Get nonexistent internship (404)
- Get with non-integer ID (400)
- Update internship (partial)
- Update nonexistent internship (404)
- Update with invalid data (400)
- Delete internship
- Delete already-deleted record (404)
- Error response shape consistency across all error cases

---

## Error Status Codes

| Status | Code | When it occurs |
|---|---|---|
| 200 | — | Successful read, update, or delete |
| 201 | — | Successful creation |
| 400 | `VALIDATION_ERROR` | Invalid request body or query params |
| 400 | `INVALID_JSON` | Malformed JSON in request body |
| 404 | `NOT_FOUND` | Record or route not found |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error |

### Error Response Shape

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "title", "message": "title is required" },
      { "field": "workMode", "message": "workMode must be one of: onsite, hybrid, remote" }
    ]
  }
}
```

Stack traces and internal database details are never exposed in responses.
