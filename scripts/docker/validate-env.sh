#!/bin/bash

# validate-env.sh - Validate environment configuration for Attio MCP Server
# Usage: ./validate-env.sh [options]

set -e

# Constants
ENV_FILE=".env"
REQUIRED_VARS=("ATTIO_API_KEY")
RECOMMENDED_VARS=("PORT" "LOG_LEVEL" "NODE_ENV")
TEST_API_CONNECTION=false

# Parse command line arguments
while (( "$#" )); do
  case "$1" in
    -e|--env-file)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        ENV_FILE=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    -t|--test-api)
      TEST_API_CONNECTION=true
      shift
      ;;
    -h|--help)
      echo "Usage: ./validate-env.sh [options]"
      echo "Options:"
      echo "  -e, --env-file    Environment file to validate (default: .env)"
      echo "  -t, --test-api    Test API connection with the provided key"
      echo "  -h, --help        Show this help message"
      exit 0
      ;;
    *)
      echo "Error: Unsupported option $1" >&2
      exit 1
      ;;
  esac
done

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: Environment file $ENV_FILE not found" >&2
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
  echo "Please edit $ENV_FILE and add your Attio API key"
  exit 1
fi

# Load environment variables
if command -v dotenv &> /dev/null; then
  # Use dotenv command if available
  eval "$(dotenv -f "$ENV_FILE" list)"
else
  # Fallback to manual parsing
  while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip comments and empty lines
    [[ $key =~ ^#.*$ || -z "$key" ]] && continue
    # Remove leading/trailing whitespace and quotes
    value=$(echo "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/")
    # Export the variable
    export "$key=$value"
  done < "$ENV_FILE"
fi

# Validate required variables
echo "Validating required environment variables..."
VALIDATION_FAILED=false

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "Error: Required variable $var is not set in $ENV_FILE" >&2
    VALIDATION_FAILED=true
  else
    echo "✓ $var is set"
  fi
done

# Check recommended variables
echo -e "\nChecking recommended environment variables..."
for var in "${RECOMMENDED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "Warning: Recommended variable $var is not set in $ENV_FILE" >&2
  else
    echo "✓ $var is set to '${!var}'"
  fi
done

# Check API key format
if [ -n "$ATTIO_API_KEY" ]; then
  # Basic format check (this is a simplistic check, adjust based on actual key format)
  if [[ ! "$ATTIO_API_KEY" =~ ^[A-Za-z0-9_-]{20,}$ ]]; then
    echo -e "\nWarning: ATTIO_API_KEY format looks invalid" >&2
    echo "API keys should be at least 20 characters with letters, numbers, underscores, or hyphens" >&2
    VALIDATION_FAILED=true
  else
    echo -e "\n✓ ATTIO_API_KEY format looks valid"
  fi
fi

# Test API connection if requested
if [ "$TEST_API_CONNECTION" = true ] && [ -n "$ATTIO_API_KEY" ]; then
  echo -e "\nTesting API connection with provided key..."
  
  # Build a simple request to the Attio API
  API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $ATTIO_API_KEY" \
    -H "Content-Type: application/json" \
    "https://api.attio.com/v2/meta" 2>/dev/null || echo "ERROR")
  
  if [ "$API_RESPONSE" = "200" ] || [ "$API_RESPONSE" = "204" ]; then
    echo "✓ API connection successful (HTTP $API_RESPONSE)"
  elif [ "$API_RESPONSE" = "401" ] || [ "$API_RESPONSE" = "403" ]; then
    echo "Error: API authentication failed (HTTP $API_RESPONSE)" >&2
    echo "Please check your API key" >&2
    VALIDATION_FAILED=true
  elif [ "$API_RESPONSE" = "ERROR" ]; then
    echo "Error: Could not connect to API" >&2
    echo "Please check your internet connection" >&2
    VALIDATION_FAILED=true
  else
    echo "Warning: Unexpected API response (HTTP $API_RESPONSE)" >&2
    VALIDATION_FAILED=true
  fi
fi

# Check Docker environment
echo -e "\nChecking Docker environment..."
if ! command -v docker &> /dev/null; then
  echo "Error: Docker is not installed or not in PATH" >&2
  VALIDATION_FAILED=true
else
  DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | cut -d ',' -f1)
  echo "✓ Docker version $DOCKER_VERSION is installed"
  
  # Check if Docker is running
  if ! docker info &> /dev/null; then
    echo "Error: Docker daemon is not running" >&2
    echo "Please start Docker daemon" >&2
    VALIDATION_FAILED=true
  else
    echo "✓ Docker daemon is running"
  fi
  
  # Check if Docker Compose is installed
  if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version | cut -d ' ' -f3 | cut -d ',' -f1)
    echo "✓ Docker Compose version $COMPOSE_VERSION is installed"
  else
    echo "Warning: Docker Compose is not installed (optional)" >&2
  fi
  
  # Check if user has Docker permissions
  if ! docker ps &> /dev/null; then
    echo "Error: Current user doesn't have permission to use Docker" >&2
    echo "You may need to add your user to the docker group:" >&2
    echo "sudo usermod -aG docker $USER" >&2
    VALIDATION_FAILED=true
  else
    echo "✓ Current user has Docker permissions"
  fi
fi

# Final validation result
echo -e "\nEnvironment validation summary:"
if [ "$VALIDATION_FAILED" = true ]; then
  echo "❌ Validation failed. Please fix the issues above before proceeding." >&2
  exit 1
else
  echo "✅ All validation checks passed!"
  exit 0
fi