# -------- Base --------
FROM node:20-alpine AS base

WORKDIR /app

# Install all dependencies (dev + prod)
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# -------- Development --------
FROM base AS development

ENV NODE_ENV=development
# Expose dev port
EXPOSE 5000
# Run ts-node-dev for hot reload
# CMD ["npm", "run", "dev:"]

# -------- Build Stage --------
FROM base AS builder

ENV NODE_ENV=production
# Build TypeScript
RUN npm run build

# -------- Production --------
FROM node:20-alpine AS production

WORKDIR /app

# Install curl (for health checks) and bash if needed
RUN apk add --no-cache curl bash

# Only install production deps for smaller image
COPY package*.json ./
# Copy Caddyfile into the image
COPY Caddyfile /etc/caddy/Caddyfile
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Expose prod port
EXPOSE 5000

# Run built JavaScript
CMD ["node", "dist/index.js"]