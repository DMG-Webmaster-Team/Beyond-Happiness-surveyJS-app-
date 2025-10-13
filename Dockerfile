# 1. Builder Image
FROM node:20 AS builder

WORKDIR /app

# Set environment variables to optimize builds
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install system dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install with increased timeout and memory
RUN npm install --legacy-peer-deps --prefer-offline --maxsockets 1 --network-timeout 600000

# Copy the rest of the project
COPY . .

# Build Next.js app
RUN npm run build

# 2. Production Image
FROM node:20-alpine AS runner

WORKDIR /app

# Install Chromium for Puppeteer in production
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Expose the port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
