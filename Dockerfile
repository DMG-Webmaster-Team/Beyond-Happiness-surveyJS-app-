# مرحلة البناء
FROM zenika/alpine-chrome:with-node AS builder

# Set Puppeteer environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Switch to root to fix permissions
USER root

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . . 

RUN npm run build

FROM zenika/alpine-chrome:with-node

# Switch to root for setup
USER root

WORKDIR /app
ENV NODE_ENV=production

# Database: set at runtime via docker compose --env-file .env.production
# See DEPLOYMENT_GUIDE.md and .env.production.example (DATABASE_URL required in production)

# Set Puppeteer environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Fix permissions for chrome user
RUN chown -R chrome:chrome /app

# Switch back to chrome user for security
USER chrome

ENV PORT=3000
EXPOSE 3000 

CMD ["npm", "start"]