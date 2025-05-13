#!/bin/bash
#
# Script to run the Attio MCP Server Docker container
#

# Default values
IMAGE_NAME="attio-mcp-server"
IMAGE_TAG="latest"
CONTAINER_NAME="attio-mcp-server"
PORT="3000"
ENV_FILE=".env"

# Function to display usage
show_usage() {
  echo "Usage: $0 [options]"
  echo "Options:"
  echo "  --name NAME         Set the container name (default: attio-mcp-server)"
  echo "  --image NAME        Set the image name (default: attio-mcp-server)"
  echo "  --tag TAG           Set the image tag (default: latest)"
  echo "  --port PORT         Set the exposed port (default: 3000)"
  echo "  --env-file FILE     Specify an environment file (default: .env)"
  echo "  --detach            Run container in detached mode"
  echo "  --help              Display this help message and exit"
  echo ""
  echo "Example:"
  echo "  $0 --name my-attio-server --port 8080 --detach"
}

# Parse command line arguments
DETACHED=""
while [[ $# -gt 0 ]]; do
  key="$1"

  case $key in
    --name)
      CONTAINER_NAME="$2"
      shift
      shift
      ;;
    --image)
      IMAGE_NAME="$2"
      shift
      shift
      ;;
    --tag)
      IMAGE_TAG="$2"
      shift
      shift
      ;;
    --port)
      PORT="$2"
      shift
      shift
      ;;
    --env-file)
      ENV_FILE="$2"
      shift
      shift
      ;;
    --detach)
      DETACHED="--detach"
      shift
      ;;
    --help)
      show_usage
      exit 0
      ;;
    *)
      echo "Error: Unknown option $1"
      show_usage
      exit 1
      ;;
  esac
done

# Print run information
echo "Running Docker container with the following configuration:"
echo "  Container Name: ${CONTAINER_NAME}"
echo "  Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "  Port: ${PORT}"
echo "  Environment File: ${ENV_FILE}"
echo "  Detached: ${DETACHED:-no}"
echo ""

# Validate that Docker is installed
if ! command -v docker &> /dev/null; then
  echo "Error: Docker is not installed or not in your PATH."
  echo "Please install Docker and try again."
  exit 1
fi

# Check if the environment file exists
if [ ! -f "${ENV_FILE}" ]; then
  echo "Warning: Environment file ${ENV_FILE} not found."
  echo "Creating a template .env file..."
  
  cat > "${ENV_FILE}" << EOL
# Attio API Key (Required)
ATTIO_API_KEY=your_api_key_here

# Attio Workspace ID (Optional)
# ATTIO_WORKSPACE_ID=your_workspace_id_here

# Node Environment (Optional, defaults to production)
# NODE_ENV=production
EOL
  
  echo "Created ${ENV_FILE}. Please edit it to add your API key."
  echo "Press Enter to continue, or Ctrl+C to abort and edit the file..."
  read
fi

# Check if a container with the same name already exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "A container named '${CONTAINER_NAME}' already exists."
  echo "Stopping and removing the existing container..."
  docker stop "${CONTAINER_NAME}" > /dev/null
  docker rm "${CONTAINER_NAME}" > /dev/null
fi

# Run the Docker container
echo "Starting Docker container..."
docker run ${DETACHED} \
  --name "${CONTAINER_NAME}" \
  -p "${PORT}:3000" \
  --env-file "${ENV_FILE}" \
  --restart unless-stopped \
  "${IMAGE_NAME}:${IMAGE_TAG}"

# Check if the run was successful (only if not detached)
if [ -z "${DETACHED}" ]; then
  if [ $? -eq 0 ]; then
    echo ""
    echo "Container exited successfully."
  else
    echo ""
    echo "Container exited with an error!"
    exit 1
  fi
else
  echo ""
  echo "Container started in detached mode."
  echo "You can view the logs with:"
  echo "  docker logs ${CONTAINER_NAME}"
  echo ""
  echo "To stop the container:"
  echo "  docker stop ${CONTAINER_NAME}"
  echo ""
  echo "To access the API:"
  echo "  http://localhost:${PORT}"
fi