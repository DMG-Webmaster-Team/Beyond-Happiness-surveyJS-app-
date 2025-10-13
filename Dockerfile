# 1. Builder Image (use Debian-based, not Alpine!)
FROM node:20 AS builder

WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install all dependencies including dev (e.g. next, eslint)
RUN npm install

# Copy the rest of the project
COPY . .

# Build Next.js app
RUN npm run build

# 2. Production Image
FROM node:20-alpine AS runner

WORKDIR /app

# Only copy necessary files for running the built app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Expose the port used by Next.js
EXPOSE 3000

# Run in production mode
CMD ["npm", "start"]
