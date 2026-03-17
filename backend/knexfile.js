require('dotenv').config();

// Supabase and Render both provide DATABASE_URL.
// If set, use it. Otherwise fall back to individual DB_* vars for local dev.
const connectionConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'revolve_rent',
      user: process.env.DB_USER || 'revolve',
      password: process.env.DB_PASSWORD || '',
    };

module.exports = {
  development: {
    client: 'pg',
    connection: connectionConfig,
    pool: { min: 1, max: 5 },
    migrations: { directory: './src/migrations' },
  },
  production: {
    client: 'pg',
    connection: connectionConfig,
    pool: { min: 1, max: 10 },
    migrations: { directory: './src/migrations' },
  },
};
