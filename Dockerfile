# 1. Builder stage
FROM node:20 AS builder

WORKDIR /app

# Speed up Puppeteer install, skip Chromium download
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# System dependencies for building native Node modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy only dependency files first
COPY package*.json ./

# Install deps (with fallback flags)
RUN npm install --legacy-peer-deps --prefer-offline --network-timeout=600000

# Copy the rest of the app
COPY . .

# Build Next.js app
RUN npm run build

---

# 2. Runtime stage
FROM node:20-slim AS runner

WORKDIR /app

# Install Chromium and dependencies for Puppeteer (Debian-based)
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

# Set Puppeteer config
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production

# Copy built app from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
