#!/bin/bash

# docker-cleanup.sh - Clean up Docker resources for Attio MCP Server
# Usage: ./docker-cleanup.sh [options]

set -e

# Constants
IMAGE_NAME="attio-mcp-server"
CONTAINER_NAME="attio-mcp-server"
REMOVE_IMAGES=false

# Parse command line arguments
while (( "$#" )); do
  case "$1" in
    -a|--all)
      REMOVE_IMAGES=true
      shift
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
    -i|--image)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        IMAGE_NAME=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    -h|--help)
      echo "Usage: ./docker-cleanup.sh [options]"
      echo "Options:"
      echo "  -a, --all      Remove all images in addition to containers"
      echo "  -n, --name     Container name (default: attio-mcp-server)"
      echo "  -i, --image    Image name (default: attio-mcp-server)"
      echo "  -h, --help     Show this help message"
      exit 0
      ;;
    *)
      echo "Error: Unsupported option $1" >&2
      exit 1
      ;;
  esac
done

# Function to handle errors
handle_error() {
  local exit_code=$1
  local error_msg=$2
  
  if [ $exit_code -ne 0 ]; then
    echo "Warning: $error_msg (exit code: $exit_code)" >&2
    return 0  # Continue execution
  fi
  return 0
}

# Stop and remove container
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Stopping container ${CONTAINER_NAME}..."
  docker stop "${CONTAINER_NAME}" || handle_error $? "Failed to stop container ${CONTAINER_NAME}"
  
  echo "Removing container ${CONTAINER_NAME}..."
  docker rm "${CONTAINER_NAME}" || handle_error $? "Failed to remove container ${CONTAINER_NAME}"
else
  echo "Container ${CONTAINER_NAME} not found, skipping"
fi

# Remove images if requested
if [ "$REMOVE_IMAGES" = true ]; then
  echo "Removing Docker images for ${IMAGE_NAME}..."
  docker images --format '{{.Repository}}:{{.Tag}}' | grep "^${IMAGE_NAME}" | xargs -r docker rmi || handle_error $? "Failed to remove some images"
fi

echo "Cleanup completed successfully"
