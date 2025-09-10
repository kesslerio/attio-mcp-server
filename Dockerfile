FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (Smithery's build may need dev deps)
RUN npm install

# Copy all source files
COPY . .

# Build TypeScript
RUN npm run build

# Smithery.yaml controls the start command, not Docker CMD
# This CMD is irrelevant for Smithery-managed HTTP runtime