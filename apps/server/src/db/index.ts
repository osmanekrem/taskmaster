import * as schema from './schema';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '@/config/env';

import { DATABASE } from '@taskmaster/constants';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: DATABASE.MAX_CONNECTIONS,
  idleTimeoutMillis: DATABASE.IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: DATABASE.CONNECTION_TIMEOUT_MS,
});

export const db = drizzle(pool, { schema });

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

export async function closeDatabaseConnections(): Promise<void> {
  await pool.end();
}
