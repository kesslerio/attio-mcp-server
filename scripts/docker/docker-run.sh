#!/bin/bash

# docker-run.sh - Run Docker container for Attio MCP Server
# Usage: ./docker-run.sh [options]

set -e

# Constants
IMAGE_NAME="attio-mcp-server"
IMAGE_TAG="latest"
CONTAINER_NAME="attio-mcp-server"
PORT=3000
ENV_FILE=".env"

# Parse command line arguments
while (( "$#" )); do
  case "$1" in
    -t|--tag)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        IMAGE_TAG=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    -n|--name)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        CONTAINER_NAME=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    -p|--port)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        PORT=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    -e|--env-file)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        ENV_FILE=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    -h|--help)
      echo "Usage: ./docker-run.sh [options]"
      echo "Options:"
      echo "  -t, --tag       Image tag (default: latest)"
      echo "  -n, --name      Container name (default: attio-mcp-server)"
      echo "  -p, --port      Port to expose (default: 3000)"
      echo "  -e, --env-file  Environment file (default: .env)"
      echo "  -h, --help      Show this help message"
      exit 0
      ;;
    *)
      echo "Error: Unsupported option $1" >&2
      exit 1
      ;;
  esac
done

# Validate environment
if ! docker image inspect "${IMAGE_NAME}:${IMAGE_TAG}" &> /dev/null; then
  echo "Error: Docker image ${IMAGE_NAME}:${IMAGE_TAG} not found" >&2
  echo "Please build the image first using docker-build.sh" >&2
  exit 1
fi

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo "Warning: Environment file $ENV_FILE not found" >&2
  echo "Creating example .env file..."
  
  cat > "$ENV_FILE" << EOF
# Attio API credentials (Required)
ATTIO_API_KEY=

# Server configuration (Optional)
PORT=3000
LOG_LEVEL=info
NODE_ENV=production
EOF
  
  echo "Created $ENV_FILE file with example values"
  echo "Please edit $ENV_FILE and add your Attio API key before running the container"
  exit 1
fi

# Validate API key existence
if ! grep -q "ATTIO_API_KEY=\S" "$ENV_FILE"; then
  echo "Error: ATTIO_API_KEY not set in $ENV_FILE" >&2
  echo "Please add your Attio API key to $ENV_FILE" >&2
  exit 1
fi

# Check if container already exists and remove it
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Container ${CONTAINER_NAME} already exists, removing..."
  docker rm -f "${CONTAINER_NAME}" || {
    echo "Error: Failed to remove existing container ${CONTAINER_NAME}" >&2
    exit 1
  }
fi

# Run the Docker container
echo "Starting Docker container: ${CONTAINER_NAME} from image ${IMAGE_NAME}:${IMAGE_TAG}"
echo "Exposing port: ${PORT}"
echo "Using environment file: ${ENV_FILE}"

docker run -d \
  --name "${CONTAINER_NAME}" \
  -p "${PORT}:${PORT}" \
  --env-file "${ENV_FILE}" \
  --restart unless-stopped \
  --health-cmd "curl -f http://localhost:${PORT}/health || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  "${IMAGE_NAME}:${IMAGE_TAG}" || {
    echo "Error: Failed to start container" >&2
    exit 1
  }

echo "Container ${CONTAINER_NAME} started successfully"
echo "Health check will monitor the container status"
echo "To view logs: docker logs -f ${CONTAINER_NAME}"
echo "To stop container: docker stop ${CONTAINER_NAME}"
