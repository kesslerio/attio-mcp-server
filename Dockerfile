FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Health check setup
RUN apk --no-cache add curl

# Expose port (Smithery sets PORT=8081)
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Command to run the HTTP server (for Smithery compatibility)
# Use dist/index.js for STDIO if needed
CMD ["node", "dist/http.js"]