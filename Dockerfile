FROM node:20-alpine
WORKDIR /app

# Install deps without running prepare/postinstall (sources not copied yet)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Now bring in the source, then build explicitly
COPY . .
RUN npm run build

# No CMD; smithery.yaml starts the server