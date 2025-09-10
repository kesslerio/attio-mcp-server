FROM node:20-alpine
WORKDIR /app

# Install all deps (we need dev deps for tsc and smithery's TS build)
COPY package*.json ./
RUN npm ci

# Copy sources and build
COPY . .
RUN npm run build

# No CMD: smithery.yaml controls how the server starts