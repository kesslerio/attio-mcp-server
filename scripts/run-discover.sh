#!/bin/bash
# Script to run attribute discovery with increased memory allocation
# and ensure environment variables are loaded

# Path to the .env file
ENV_FILE=".env"

# Function to check if ATTIO_API_KEY is set
check_api_key() {
  if [ -z "$ATTIO_API_KEY" ]; then
    echo "Error: ATTIO_API_KEY environment variable is not set."
    
    if [ -f "$ENV_FILE" ]; then
      echo "Found .env file. Sourcing environment variables..."
      export $(grep -v '^#' $ENV_FILE | xargs)
      
      if [ -z "$ATTIO_API_KEY" ]; then
        echo "Error: ATTIO_API_KEY not found in .env file either."
        echo "Please set ATTIO_API_KEY environment variable or add it to your .env file."
        exit 1
      else
        echo "Successfully loaded ATTIO_API_KEY from .env file."
      fi
    else
      echo "No .env file found at $ENV_FILE."
      echo "Please set ATTIO_API_KEY environment variable or create a .env file with your API key."
      exit 1
    fi
  fi
}

# Check for API key
check_api_key

# Default to 4GB heap size
echo "Running with increased memory allocation (4GB)..."
NODE_OPTIONS="--max-old-space-size=4096" node dist/cli/discover.js "$@"