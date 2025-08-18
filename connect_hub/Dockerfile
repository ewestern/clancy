FROM node:23-bullseye-slim AS builder
ARG NPM_TOKEN

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm config set @ewestern:registry https://npm.pkg.github.com
RUN npm config set //npm.pkg.github.com/:_authToken ${NPM_TOKEN}
COPY package.json ./
COPY package-lock.json ./

RUN npm ci

COPY src ./src
COPY public ./public
COPY tsconfig.json ./tsconfig.json
COPY drizzle.config.ts ./drizzle.config.ts
COPY migrations ./migrations

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
ENV NODE_ENV=production
# Start the application
CMD ["npm", "run", "start"] 