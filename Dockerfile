# 1. Builder Image
FROM node:20 AS builder

WORKDIR /app

# Environment variables to skip Chromium download during build
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install with flags to handle large packages
RUN npm install --legacy-peer-deps --prefer-offline --maxsockets 1 --network-timeout 600000

# Copy source code
COPY . .

# Build the app
RUN npm run build

# 2. Production Image (also using Debian, not Alpine)
FROM node:20-slim AS runner

WORKDIR /app

# Install Chromium for Puppeteer (Debian packages)
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

# Copy built app from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
