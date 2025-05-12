FROM node:18-alpine

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

# Expose port
EXPOSE 3000

# Command to run the server
CMD ["node", "dist/index.js"]
EOD < /dev/null