# Build Next.js app
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Install everything including devDependencies
RUN npm install --legacy-peer-deps --include=dev

COPY . .

RUN npm run build
