# 1. Builder Image
FROM node:20 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Use npm ci instead of npm install for faster, more reliable builds
# Add flags to handle potential issues
RUN npm ci --legacy-peer-deps --prefer-offline --no-audit

# Copy the rest of the project
COPY . .

# Build Next.js app
RUN npm run build

# 2. Production Image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Expose the port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
