import { defineConfig } from 'drizzle-kit';

// No schema files exist yet — each module will export its tables from
// src/modules/<name>/<name>.schema.ts once the domain model is implemented.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/modules/**/*.schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://mybills:mybills@localhost:5432/mybills',
  },
});
