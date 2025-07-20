FROM node:23-bullseye-slim AS builder
ARG NPM_TOKEN
RUN echo "NPM_TOKEN=${NPM_TOKEN}"

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm config set @ewestern:registry https://npm.pkg.github.com
RUN npm config set //npm.pkg.github.com/:_authToken ${NPM_TOKEN}


# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
ENV NODE_ENV=production
# Start the application
CMD ["npm", "run", "start"] 