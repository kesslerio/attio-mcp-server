#!/bin/bash
# Script to run attribute discovery with increased memory allocation

# Default to 4GB heap size
NODE_OPTIONS="--max-old-space-size=4096" node dist/cli/discover.js "$@"