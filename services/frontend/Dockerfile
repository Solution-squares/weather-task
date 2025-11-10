FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY frontend/package*.json ./
RUN npm ci

# Copy app source
COPY frontend/ ./

# Build app (assumes Next.js or similar with build script)
RUN npm run build

# Expose port for Next.js
EXPOSE 3000

# Default envs for runtime (override via compose)
ENV PORT=3000
ENV NEXT_PUBLIC_SOCKET_URL=http://worker:3001

# Start (Next.js: next start). Ensure package.json has "start"
CMD ["npm", "start"]


