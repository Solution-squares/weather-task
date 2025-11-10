import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getQueue } from '@/lib/queue';

// Create a manual weather-fetch job
export async function POST() {
  try {
    const pool = getPool();
    const weatherQueue = await getQueue();

    const jobId = `job_${Date.now()}`;
    const jobType = 'manual'; // manual trigger from dashboard
    const status = 'pending';

    const insertQuery = `
      INSERT INTO jobs (
        job_id,
        job_type,
        status,
        priority,
        attempts,
        max_attempts,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, 0, 0, 3, NOW(), NOW())
      RETURNING 
        id,
        job_id as "jobId",
        job_type as "jobType",
        status,
        created_at as "createdAt"
    `;

    const result = await pool.query(insertQuery, [jobId, jobType, status]);
    const row = result.rows[0];

    // Add job to Bull queue immediately so it can be processed
    try {
      await weatherQueue.add(
        'manual',
        {
          // No city specified, so it will fetch all cities
          city: undefined,
        },
        {
          jobId: jobId, // Use the existing job_id
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }
      );
      console.log(`✅ Added manual job ${jobId} to queue`);
    } catch (queueError: any) {
      console.error(`❌ Failed to add job ${jobId} to queue:`, queueError.message);
      // Don't fail the request if queue add fails, job is still in database
      // It can be processed later via process-pending-jobs script
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Weather fetch job enqueued',
        jobId: row.jobId,
        status: row.status,
        data: row,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error enqueueing job:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'JobError',
        message: error.message || 'Failed to enqueue weather fetch job',
      },
      { status: 500 }
    );
  }
}

