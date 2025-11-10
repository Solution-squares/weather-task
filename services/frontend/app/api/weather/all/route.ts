import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { transformDatabaseArrayToWeatherResponse } from '@/lib/transform';
import { DatabaseWeatherData } from '@/types/api';
import { PAGINATION } from '@/lib/constants';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(PAGINATION.DEFAULT_PAGE, parseInt(searchParams.get('page') || String(PAGINATION.DEFAULT_PAGE), 10));
    const limit = Math.min(PAGINATION.MAX_LIMIT_ALL_WEATHER, Math.max(1, parseInt(searchParams.get('limit') || String(PAGINATION.ALL_WEATHER_PAGE_SIZE), 10)));
    const offset = (page - 1) * limit;

    const pool = getPool();

    // Get ALL weather data (not just latest per city)
    // Use JOIN with cities table to get city name
    // Sort by timestamp DESC (most recent first)
    const query = `
      SELECT 
        wd.id,
        wd.city_id,
        c.name as city_name,
        wd.temperature,
        wd.humidity,
        wd.description,
        wd.wind_speed as "windSpeed",
        wd.pressure,
        wd.timestamp,
        wd.created_at as "createdAt",
        wd.updated_at as "updatedAt"
      FROM weather_data wd
      INNER JOIN cities c ON wd.city_id = c.id
      ORDER BY wd.timestamp DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM weather_data
    `;

    // Get latest timestamp for lastSyncAt
    const lastSyncQuery = `
      SELECT MAX(timestamp) as "lastSyncAt"
      FROM weather_data
    `;

    const [result, countResult, lastSyncResult] = await Promise.all([
      pool.query(query, [limit, offset]),
      pool.query(countQuery),
      pool.query(lastSyncQuery),
    ]);

    const total = parseInt(countResult.rows[0]?.total || '0', 10);
    const totalPages = Math.ceil(total / limit);
    const lastSyncAt = lastSyncResult.rows[0]?.lastSyncAt 
      ? new Date(lastSyncResult.rows[0].lastSyncAt).toISOString()
      : null;

    if (result.rows.length === 0) {
      return NextResponse.json({
        data: [],
        lastSyncAt,
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Transform database format to frontend format
    const paginatedDbData: DatabaseWeatherData[] = result.rows.map((row) => ({
      id: row.id,
      cityId: row.city_id,
      cityName: row.city_name,
      temperature: parseFloat(row.temperature) || 0,
      humidity: parseInt(row.humidity) || 0,
      description: row.description || '',
      windSpeed: row.windSpeed ? parseFloat(row.windSpeed) : undefined,
      pressure: row.pressure ? parseInt(row.pressure) : undefined,
      timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
    }));

    // Transform to frontend format
    const weatherResponses = transformDatabaseArrayToWeatherResponse(paginatedDbData);

    return NextResponse.json({
      data: weatherResponses,
      lastSyncAt,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching all weather data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'DatabaseError',
        message: error.message || 'Failed to fetch weather data',
      },
      { status: 500 }
    );
  }
}

