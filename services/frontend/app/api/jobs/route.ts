import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { PAGINATION } from '@/lib/constants';

// Get job history from jobs table
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(PAGINATION.DEFAULT_PAGE, parseInt(searchParams.get('page') || String(PAGINATION.DEFAULT_PAGE), 10));
    const limit = Math.min(PAGINATION.MAX_LIMIT_JOBS, Math.max(1, parseInt(searchParams.get('limit') || String(PAGINATION.JOBS_PAGE_SIZE), 10)));
    const offset = (page - 1) * limit;

    const pool = getPool();

    // Get recent job history from jobs table
    // Sort by created_at DESC (most recent first), then apply pagination
    const query = `
      SELECT 
        id,
        job_id as "jobId",
        job_type as "jobType",
        city_id as "cityId",
        city_name as "cityName",
        status,
        priority,
        attempts,
        max_attempts as "maxAttempts",
        error_message as "errorMessage",
        result,
        started_at as "startedAt",
        completed_at as "completedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM jobs
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM jobs
    `;

    const [result, countResult] = await Promise.all([
      pool.query(query, [limit, offset]),
      pool.query(countQuery),
    ]);

    const total = parseInt(countResult.rows[0]?.total || '0', 10);
    const totalPages = Math.ceil(total / limit);

    // Transform to job history format
    const paginatedJobs = result.rows.map((row) => {
      const timestamp = row.completedAt || row.startedAt || row.createdAt;
      const createdAt = row.createdAt ? new Date(row.createdAt) : new Date();
      
      return {
        id: row.id,
        type: row.jobType || 'weather-fetch',
        jobType: row.jobType || 'weather-fetch', // Keep for display
        city: row.cityName || 'All Cities',
        timestamp: timestamp ? new Date(timestamp).toISOString() : createdAt.toISOString(),
        createdAt: createdAt.toISOString(),
        status: row.status,
      };
    });

    return NextResponse.json({
      success: true,
      data: paginatedJobs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching job history:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'DatabaseError',
        message: error.message || 'Failed to fetch job history',
      },
      { status: 500 }
    );
  }
}

