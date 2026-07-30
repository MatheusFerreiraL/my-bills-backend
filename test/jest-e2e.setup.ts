// Lets `npm run test:e2e` boot the app without a real .env file. Pool creation is lazy
// (no socket opens until a query runs), so a placeholder connection string is enough here.
process.env.DATABASE_URL ??= 'postgres://mybills:mybills@localhost:5432/mybills';
