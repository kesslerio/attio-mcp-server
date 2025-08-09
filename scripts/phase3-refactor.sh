#!/bin/bash

# Phase 3 ESLint Warning Reduction Script
# Systematically replaces common any-type patterns

echo "Starting Phase 3 any-type elimination..."

# Count initial warnings
INITIAL=$(npx eslint . --ext .ts,.tsx --max-warnings 1000 2>&1 | grep "warning" | wc -l)
echo "Initial warnings: $INITIAL"

# Pattern 1: Replace formatResult: (result: any) with proper types
echo "Fixing formatResult functions..."
find src/handlers/tool-configs -name "*.ts" -exec sed -i.bak \
  's/formatResult: (result: any)/formatResult: (result: Record<string, unknown>)/g' {} \;

find src/handlers/tool-configs -name "*.ts" -exec sed -i.bak \
  's/formatResult: (notes: any)/formatResult: (notes: Record<string, unknown>)/g' {} \;

find src/handlers/tool-configs -name "*.ts" -exec sed -i.bak \
  's/formatResult: (note: any)/formatResult: (note: Record<string, unknown>)/g' {} \;

# Pattern 2: Replace callback parameters 
echo "Fixing callback parameters..."
find src/handlers/tool-configs -name "*.ts" -exec sed -i.bak \
  's/(company: any)/(company: Record<string, unknown>)/g' {} \;

find src/handlers/tool-configs -name "*.ts" -exec sed -i.bak \
  's/(person: any)/(person: Record<string, unknown>)/g' {} \;

find src/handlers/tool-configs -name "*.ts" -exec sed -i.bak \
  's/(item: any)/(item: Record<string, unknown>)/g' {} \;

find src/handlers/tool-configs -name "*.ts" -exec sed -i.bak \
  's/(note: any)/(note: Record<string, unknown>)/g' {} \;

find src/handlers/tool-configs -name "*.ts" -exec sed -i.bak \
  's/(list: any)/(list: Record<string, unknown>)/g' {} \;

find src/handlers/tool-configs -name "*.ts" -exec sed -i.bak \
  's/(prompt: any)/(prompt: Record<string, unknown>)/g' {} \;

# Pattern 3: Fix array callbacks
echo "Fixing array method callbacks..."
find src/handlers/tool-configs -name "*.ts" -exec sed -i.bak \
  's/\.map((.*: any)/.map((\1: Record<string, unknown>)/g' {} \;

find src/handlers/tool-configs -name "*.ts" -exec sed -i.bak \
  's/\.filter((.*: any)/.filter((\1: Record<string, unknown>)/g' {} \;

find src/handlers/tool-configs -name "*.ts" -exec sed -i.bak \
  's/\.find((.*: any)/.find((\1: Record<string, unknown>)/g' {} \;

# Pattern 4: Fix Record<string, any>
echo "Fixing Record types..."
find src -name "*.ts" -exec sed -i.bak \
  's/Record<string, any>/Record<string, unknown>/g' {} \;

# Pattern 5: Fix error handling
echo "Fixing error types in catch blocks..."
find src -name "*.ts" -exec sed -i.bak \
  's/catch (error: any)/catch (error: unknown)/g' {} \;

find src -name "*.ts" -exec sed -i.bak \
  's/catch (e: any)/catch (e: unknown)/g' {} \;

# Pattern 6: Fix test mocks
echo "Fixing test mock types..."
find test -name "*.ts" -exec sed -i.bak \
  's/: any = {/: Record<string, unknown> = {/g' {} \;

find test -name "*.ts" -exec sed -i.bak \
  's/as any/as unknown/g' {} \;

# Clean up backup files
echo "Cleaning up backup files..."
find . -name "*.bak" -delete

# Count final warnings
echo "Running build to check for errors..."
npm run build 2>&1 | tail -10

echo "Checking new warning count..."
FINAL=$(npx eslint . --ext .ts,.tsx --max-warnings 1000 2>&1 | grep "warning" | wc -l)
echo "Final warnings: $FINAL"
echo "Reduced by: $((INITIAL - FINAL)) warnings"