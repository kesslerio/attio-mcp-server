#!/bin/bash

# Script to update all imports from people.js to people/index.js

# Find all TypeScript files that import from people.js
files=$(grep -l "from.*objects/people\.js\|from.*objects/people\"|import.*objects/people" --include="*.ts" -r src/ 2>/dev/null)

echo "Files that need updating:"
echo "$files"

# Update each file
for file in $files; do
  # Skip the people.ts file itself
  if [[ $file == *"src/objects/people.ts"* ]]; then
    continue
  fi
  
  echo "Updating: $file"
  
  # Replace people.js with people/index.js
  sed -i '' 's|from "../objects/people\.js"|from "../objects/people/index.js"|g' "$file"
  sed -i '' 's|from "./people\.js"|from "./people/index.js"|g' "$file"
  sed -i '' 's|from "\.\.\/\.\.\/objects/people\.js"|from "../../objects/people/index.js"|g' "$file"
done

echo "Import updates complete!"