#!/bin/bash

# Script to fix catch blocks to use error: unknown typing
# Safe because it only adds type annotation, doesn't change logic

echo "Fixing catch blocks in TypeScript files..."

# Find all TypeScript files with untyped catch blocks
FILES=$(find src -type f -name "*.ts" -exec grep -l "catch (error)" {} \;)
FILES_TEST=$(find test -type f -name "*.ts" -exec grep -l "catch (error)" {} \;)

# Count files to fix
COUNT=$(echo "$FILES" | wc -l)
COUNT_TEST=$(echo "$FILES_TEST" | wc -l)

echo "Found $COUNT source files and $COUNT_TEST test files to fix"

# Fix source files
for file in $FILES; do
  if [ -f "$file" ]; then
    # Use sed to replace catch (error) with catch (error: unknown)
    sed -i '' 's/catch (error)/catch (error: unknown)/g' "$file"
    echo "Fixed: $file"
  fi
done

# Fix test files
for file in $FILES_TEST; do
  if [ -f "$file" ]; then
    # Use sed to replace catch (error) with catch (error: unknown)
    sed -i '' 's/catch (error)/catch (error: unknown)/g' "$file"
    echo "Fixed: $file"
  fi
done

echo "Completed fixing catch blocks"

# Test TypeScript compilation
echo "Testing TypeScript compilation..."
npm run typecheck

if [ $? -eq 0 ]; then
  echo "✅ TypeScript compilation successful!"
else
  echo "❌ TypeScript compilation failed. Please review changes."
  exit 1
fi