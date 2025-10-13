# 1. Builder Image
FROM node:20 AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies (allow Puppeteer to download Chromium)
RUN npm install --legacy-peer-deps --prefer-offline --maxsockets 1 --network-timeout 600000

# Copy source code
COPY . .

# Build the app
RUN npm run build

# 2. Production Image - Use FULL node image, not slim
FROM node:20 AS runner

WORKDIR /app

# Set environment
ENV NODE_ENV=production

# Copy everything from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
