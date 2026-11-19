# Multi-stage / Production Dockerfile for Backend from root context
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy backend package manifests
COPY backend/package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy backend source code
COPY backend/ .

# Expose ports (5000 for local / 10000 for Render)
EXPOSE 5000 10000

# Set production environment
ENV NODE_ENV=production

# Start backend server
CMD ["node", "server.js"]
