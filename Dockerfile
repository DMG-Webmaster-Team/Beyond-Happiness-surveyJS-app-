# 1. Build stage
FROM node:20-alpine AS builder

# Create working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all application files
COPY . .

# Build Next.js for production
RUN npm run build

# 2. Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy only necessary files for production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

# Start Next.js in production mode
CMD ["npm", "run", "start"]
