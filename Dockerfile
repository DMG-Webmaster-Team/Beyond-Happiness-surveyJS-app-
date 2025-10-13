# 1. Builder Image
FROM node:20 AS builder

WORKDIR /app

# Install build dependencies (skip apt-get update since DNS is broken)
# These are already installed in the base image anyway

# Copy package files
COPY package*.json ./

# Use Yarn instead of npm - more stable for large packages
RUN npm install -g yarn && \
    yarn install --network-timeout 600000

# Copy source code
COPY . .

# Build the app
RUN yarn build

# 2. Production Image
FROM node:20 AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy everything from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["yarn", "start"]
