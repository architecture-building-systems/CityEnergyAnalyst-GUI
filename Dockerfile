FROM node:20-alpine AS builder

ARG VITE_CEA_URL=""
ARG VITE_AUTH_URL=""
ARG VITE_AUTH_COOKIE_NAME=""

ENV VITE_CEA_URL=$VITE_CEA_URL \
    VITE_AUTH_URL=$VITE_AUTH_URL \
    VITE_AUTH_COOKIE_NAME=$VITE_AUTH_COOKIE_NAME

RUN corepack enable

WORKDIR /app

# Copy only package files first to leverage cache
COPY package.json yarn.lock .yarnrc.yml ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Create production image
FROM nginx:alpine

LABEL org.opencontainers.image.source=https://github.com/architecture-building-systems/CityEnergyAnalyst-GUI

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration for SPA routing
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Use nginx to serve the static files
CMD ["nginx", "-g", "daemon off;"]