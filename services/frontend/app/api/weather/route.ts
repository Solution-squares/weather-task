import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { transformDatabaseArrayToWeatherResponse } from '@/lib/transform';
import { DatabaseWeatherData } from '@/types/api';
import { PAGINATION } from '@/lib/constants';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(PAGINATION.DEFAULT_PAGE, parseInt(searchParams.get('page') || String(PAGINATION.DEFAULT_PAGE), 10));
    const limit = Math.min(PAGINATION.MAX_LIMIT_WEATHER, Math.max(1, parseInt(searchParams.get('limit') || String(PAGINATION.WEATHER_PAGE_SIZE), 10)));
    const offset = (page - 1) * limit;

    const pool = getPool();

    // Get latest weather data for all cities
    // Use JOIN with cities table to get city name
    // Use subquery to get latest per city, sort by timestamp DESC
    const query = `
      WITH latest_per_city AS (
        SELECT DISTINCT ON (wd.city_id)
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
        ORDER BY wd.city_id, wd.timestamp DESC
      )
      SELECT 
        id,
        city_id as "cityId",
        city_name as "cityName",
        temperature,
        humidity,
        description,
        "windSpeed",
        pressure,
        timestamp,
        "createdAt",
        "updatedAt"
      FROM latest_per_city
      ORDER BY timestamp DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT wd.city_id) as total
      FROM weather_data wd
      INNER JOIN cities c ON wd.city_id = c.id
    `;

    // Get latest timestamp for lastSyncAt (from all cities)
    const lastSyncQuery = `
      SELECT MAX(wd.timestamp) as "lastSyncAt"
      FROM weather_data wd
      INNER JOIN cities c ON wd.city_id = c.id
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
      cityId: row.cityId,
      cityName: row.cityName,
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
    console.error('Error fetching weather data:', error);
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

