/**
 * Helper script to process pending manual jobs from database
 * This adds pending jobs to the Bull queue so they can be processed
 */

import Queue from 'bull';
import { Pool } from 'pg';
import { config } from './config';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const pool = new Pool({
  host: config.postgres.host,
  port: config.postgres.port,
  user: config.postgres.user,
  password: config.postgres.password,
  database: config.postgres.database,
});

const redisConfig = {
  host: config.redis.host,
  port: config.redis.port,
};

const weatherQueue = new Queue('weather-fetch', {
  redis: redisConfig,
});

async function processPendingJobs() {
  try {
    // Get pending manual jobs from database
    const result = await pool.query(`
      SELECT job_id, city_name, created_at
      FROM jobs
      WHERE job_type = 'manual' AND status = 'pending'
      ORDER BY created_at ASC
    `);

    console.log(`Found ${result.rows.length} pending manual jobs`);

    for (const row of result.rows) {
      try {
        // Add job to Bull queue with name 'manual'
        await weatherQueue.add(
          'manual',
          {
            // If city_name exists, use it; otherwise fetch all cities
            city: row.city_name || undefined,
          },
          {
            jobId: row.job_id, // Use the existing job_id
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          }
        );
        console.log(`✅ Added pending job ${row.job_id} to queue`);
      } catch (error: any) {
        console.error(`❌ Failed to add job ${row.job_id}:`, error.message);
      }
    }

    console.log('✅ Finished processing pending jobs');
  } catch (error: any) {
    console.error('❌ Error processing pending jobs:', error.message);
  } finally {
    await weatherQueue.close();
    await pool.end();
    process.exit(0);
  }
}

processPendingJobs();

