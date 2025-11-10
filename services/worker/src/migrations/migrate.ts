import dotenv from 'dotenv';
import { Pool } from 'pg';
import { config } from '../config';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config({ path: '../../.env' });

const pool = new Pool({
  host: config.postgres.host,
  port: config.postgres.port,
  user: config.postgres.user,
  password: config.postgres.password,
  database: config.postgres.database,
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('Running database migrations from schema.sql...');
    const schemaPath = join(__dirname, 'schema.sql');
    const schemaSQL = readFileSync(schemaPath, 'utf-8');
    await client.query(schemaSQL);
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations()
  .then(() => {
    console.log('Database setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database setup failed:', error);
    process.exit(1);
  });

