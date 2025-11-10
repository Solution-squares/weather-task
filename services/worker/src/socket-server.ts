import { Server } from 'socket.io';
import { createServer } from 'http';
import { Pool } from 'pg';
import { config } from './config';

let io: Server | null = null;
let httpServer: ReturnType<typeof createServer> | null = null;

export function initializeSocketServer(port: number = 3001) {
  if (io) {
    return io; // Already initialized
  }

  // Create HTTP server for Socket.io
  httpServer = createServer();
  
  io = new Server(httpServer, {
    cors: {
      origin: config.socket?.frontendURL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Attach error handler BEFORE calling listen
  httpServer.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use. Socket.io server cannot start.`);
      console.error(`   Please stop the process using port ${port} or change SOCKET_PORT in .env`);
      console.warn(`⚠️  Worker will continue without Socket.io real-time updates`);
      // Reset io and httpServer so we can retry later if needed
      io = null;
      httpServer = null;
    } else {
      console.error('❌ Error starting Socket.io server:', error);
      io = null;
      httpServer = null;
    }
  });

  // Start listening on the specified port
  try {
    httpServer.listen(port, () => {
      console.log(`✅ Socket.io server running on port ${port}`);
    });
  } catch (error) {
    console.error('❌ Failed to start Socket.io server:', error);
    io = null;
    httpServer = null;
  }

  return io;
}

export async function emitWeatherUpdate(pool: Pool) {
  if (!io) {
    console.warn('Socket.io server not initialized');
    return;
  }

  try {
    const query = `
      SELECT DISTINCT ON (c.name)
        wd.id,
        c.name AS city,
        wd.temperature,
        wd.humidity,
        wd.description,
        wd.wind_speed as "windSpeed",
        wd.pressure,
        wd.timestamp,
        wd.created_at as "createdAt",
        wd.updated_at as "updatedAt"
      FROM weather_data wd
      JOIN cities c ON c.id = wd.city_id
      ORDER BY c.name, wd.timestamp DESC
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      return; // No data to emit
    }

    // Transform database rows to frontend format
    const dbData = result.rows.map((row) => ({
      id: row.id,
      city: row.city,
      temperature: parseFloat(row.temperature) || 0,
      humidity: parseInt(row.humidity) || 0,
      description: row.description || '',
      windSpeed: row.windSpeed ? parseFloat(row.windSpeed) : undefined,
      pressure: row.pressure ? parseInt(row.pressure) : undefined,
      timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
    }));

    // Calculate lastSyncAt (most recent timestamp)
    const lastSyncAt = dbData.reduce((latest, current) => {
      const currentTime = new Date(current.timestamp).getTime();
      const latestTime = new Date(latest.timestamp).getTime();
      return currentTime > latestTime ? current : latest;
    }).timestamp;

    // Emit to all connected clients
    io.emit('weather-update', {
      data: dbData,
      lastSyncAt,
    });
    
    console.log(`✅ Emitted weather-update: ${dbData.length} cities, lastSyncAt: ${lastSyncAt}`);
  } catch (error) {
    console.error('❌ Error emitting weather update:', error);
  }
}

export async function closeSocketServer() {
  if (io) {
    io.close();
    io = null;
  }
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
}

