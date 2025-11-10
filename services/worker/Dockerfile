FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY worker/package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy shared types to parent directory (to match import path ../../shared/types)
# From /app/src/config.ts, ../../shared resolves to /shared
WORKDIR /
COPY shared/ /shared/

# Copy worker source code
WORKDIR /app
COPY worker/ ./

# Build TypeScript
RUN npm run build

# Fix dist structure - move files from dist/app/src to dist if needed
RUN if [ -d "dist/app/src" ]; then \
      mv dist/app/src/* dist/ 2>/dev/null || true; \
      rm -rf dist/app 2>/dev/null || true; \
    fi

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Expose port (if needed)
# EXPOSE 3000

# Start the application
CMD ["npm", "start"]

