#!/bin/bash

# docker-build.sh - Build Docker image for Attio MCP Server
# Usage: ./docker-build.sh [options]

set -e

# Constants
DOCKER_TIMEOUT=600  # 10 minutes timeout for Docker operations
IMAGE_NAME="attio-mcp-server"
IMAGE_TAG="latest"

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
        IMAGE_NAME=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    --timeout)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        DOCKER_TIMEOUT=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    -h|--help)
      echo "Usage: ./docker-build.sh [options]"
      echo "Options:"
      echo "  -t, --tag      Image tag (default: latest)"
      echo "  -n, --name     Image name (default: attio-mcp-server)"
      echo "  --timeout      Docker operation timeout in seconds (default: 600)"
      echo "  -h, --help     Show this help message"
      exit 0
      ;;
    *)
      echo "Error: Unsupported option $1" >&2
      exit 1
      ;;
  esac
done

# Validate build environment
if [ ! -f "Dockerfile" ]; then
  echo "Error: Dockerfile not found in current directory" >&2
  echo "Please run this script from the project root directory" >&2
  exit 1
fi

# Function to execute command with timeout
execute_with_timeout() {
  local cmd="$1"
  local timeout="$2"
  local message="$3"
  
  echo "$message"
  
  # Use timeout command if available
  if command -v timeout &> /dev/null; then
    timeout "$timeout" bash -c "$cmd" || {
      local exit_code=$?
      if [ $exit_code -eq 124 ]; then
        echo "Error: Command timed out after ${timeout} seconds" >&2
        return 1
      else
        echo "Error: Command failed with exit code $exit_code" >&2
        return $exit_code
      fi
    }
  else
    # Fallback if timeout command is not available
    bash -c "$cmd" || {
      local exit_code=$?
      echo "Error: Command failed with exit code $exit_code" >&2
      return $exit_code
    }
  fi
}

# Build the Docker image
echo "Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "Timeout set to: ${DOCKER_TIMEOUT} seconds"

execute_with_timeout "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ." "$DOCKER_TIMEOUT" "Starting Docker build..." || {
  echo "Error: Docker build failed" >&2
  echo "Please check the Docker error output above for details" >&2
  exit 1
}

echo "Successfully built Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"
