# Stage 1: Build frontend with Node
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependencies
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Build Vite production bundle
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Stage 2: Serve production assets with Nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
