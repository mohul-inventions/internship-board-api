// src/config/env.js
// Centralised environment configuration.
// Reads from process.env and provides typed, defaulted values.

const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  DB_PATH: process.env.DB_PATH ?? './data/internships.db',
};

export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

export default env;
