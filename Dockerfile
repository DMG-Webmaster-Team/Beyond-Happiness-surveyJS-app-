# مرحلة البناء
FROM node:20-slim AS builder

# Install Chromium and dependencies (minimal set)
RUN apt-get update && apt-get install -y \
  chromium \
  --no-install-recommends \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

# Set Puppeteer environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:20-slim

# Install Chromium and dependencies in production stage (minimal set)
RUN apt-get update && apt-get install -y \
  chromium \
  --no-install-recommends \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

WORKDIR /app
ENV NODE_ENV=production

# Set Puppeteer environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public


ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]