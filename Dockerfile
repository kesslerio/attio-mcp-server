FROM node:20-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install only production dependencies to reduce build time
RUN npm ci --only=production || npm install --production

# Copy source and build files
COPY tsconfig.json ./
COPY src ./src
COPY configs ./configs

# Install dev dependencies temporarily for build, then remove
RUN npm install --save-dev typescript @types/node && \
    npm run build && \
    npm prune --production

# Expose port (Smithery typically uses 8081)
EXPOSE 8081

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8081

# Command to run the Smithery entry point
# Smithery will handle the HTTP transport layer
CMD ["node", "dist/smithery.js"]