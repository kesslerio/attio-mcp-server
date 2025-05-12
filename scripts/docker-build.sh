#!/bin/bash
#
# Script to build the Attio MCP Server Docker image
#

# Default values
IMAGE_NAME="attio-mcp-server"
IMAGE_TAG="latest"
DOCKERFILE="Dockerfile"
BUILD_CONTEXT="."

# Function to display usage
show_usage() {
  echo "Usage: $0 [options]"
  echo "Options:"
  echo "  --name NAME         Set the image name (default: attio-mcp-server)"
  echo "  --tag TAG           Set the image tag (default: latest)"
  echo "  --dockerfile FILE   Specify a custom Dockerfile (default: Dockerfile)"
  echo "  --context PATH      Specify a custom build context (default: .)"
  echo "  --help              Display this help message and exit"
  echo ""
  echo "Example:"
  echo "  $0 --name my-attio-mcp --tag v1.0.0"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"

  case $key in
    --name)
      IMAGE_NAME="$2"
      shift
      shift
      ;;
    --tag)
      IMAGE_TAG="$2"
      shift
      shift
      ;;
    --dockerfile)
      DOCKERFILE="$2"
      shift
      shift
      ;;
    --context)
      BUILD_CONTEXT="$2"
      shift
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

# Print build information
echo "Building Docker image with the following configuration:"
echo "  Image Name: ${IMAGE_NAME}"
echo "  Image Tag: ${IMAGE_TAG}"
echo "  Dockerfile: ${DOCKERFILE}"
echo "  Build Context: ${BUILD_CONTEXT}"
echo ""

# Validate that Docker is installed
if ! command -v docker &> /dev/null; then
  echo "Error: Docker is not installed or not in your PATH."
  echo "Please install Docker and try again."
  exit 1
fi

# Build the Docker image
echo "Building Docker image..."
docker build \
  -t "${IMAGE_NAME}:${IMAGE_TAG}" \
  -f "${DOCKERFILE}" \
  "${BUILD_CONTEXT}"

# Check if the build was successful
if [ $? -eq 0 ]; then
  echo ""
  echo "Build successful!"
  echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
  echo ""
  echo "You can run the container with:"
  echo "  docker run -p 3000:3000 -e ATTIO_API_KEY=your_api_key ${IMAGE_NAME}:${IMAGE_TAG}"
  echo ""
  echo "Or using docker-compose:"
  echo "  docker-compose up -d"
else
  echo ""
  echo "Build failed!"
  exit 1
fi