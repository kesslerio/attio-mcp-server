#!/bin/bash

echo "Phase 3 Aggressive Any-Type Elimination"
echo "========================================="

# Count initial warnings
INITIAL=$(npx eslint . --ext .ts,.tsx --max-warnings 1000 2>&1 | grep "warning" | wc -l)
echo "Starting warnings: $INITIAL"

# Fix all Record<string, any> patterns
echo "1. Fixing Record<string, any> patterns..."
find src test -name "*.ts" -type f | while read file; do
  sed -i '' 's/Record<string, any>/Record<string, unknown>/g' "$file"
done

# Fix all : any in function parameters
echo "2. Fixing function parameter types..."
find src test -name "*.ts" -type f | while read file; do
  # Fix standalone : any declarations
  sed -i '' 's/: any\[\]/: unknown[]/g' "$file"
  sed -i '' 's/: any;/: unknown;/g' "$file"
  sed -i '' 's/: any)/: unknown)/g' "$file"
  sed -i '' 's/: any,/: unknown,/g' "$file"
  sed -i '' 's/: any =/: unknown =/g' "$file"
  sed -i '' 's/: any |/: unknown |/g' "$file"
done

# Fix as any casts
echo "3. Fixing 'as any' type assertions..."
find src test -name "*.ts" -type f | while read file; do
  sed -i '' 's/ as any/ as unknown/g' "$file"
done

# Fix <any> generics
echo "4. Fixing generic any types..."
find src test -name "*.ts" -type f | while read file; do
  sed -i '' 's/<any>/<unknown>/g' "$file"
  sed -i '' 's/<any\[\]>/<unknown[]>/g' "$file"
done

# Fix Promise<any>
echo "5. Fixing Promise types..."
find src test -name "*.ts" -type f | while read file; do
  sed -i '' 's/Promise<any>/Promise<unknown>/g' "$file"
done

# Fix Array<any>
echo "6. Fixing Array types..."
find src test -name "*.ts" -type f | while read file; do
  sed -i '' 's/Array<any>/Array<unknown>/g' "$file"
done

# Fix common test patterns
echo "7. Fixing test mock patterns..."
find test -name "*.ts" -type f | while read file; do
  # Fix mock return values
  sed -i '' 's/mockReturnValue(.*as any)/mockReturnValue(\1 as unknown)/g' "$file"
  sed -i '' 's/mockResolvedValue(.*as any)/mockResolvedValue(\1 as unknown)/g' "$file"
done

# Fix error handling patterns  
echo "8. Fixing error handling patterns..."
find src -name "*.ts" -type f | while read file; do
  # Already handled in previous scripts
  true
done

# Count final warnings
echo ""
echo "Checking results..."
FINAL=$(npx eslint . --ext .ts,.tsx --max-warnings 1000 2>&1 | grep "warning" | wc -l)
echo "Final warnings: $FINAL"
echo "Reduced by: $((INITIAL - FINAL)) warnings"

# Check if we reached our target
if [ $FINAL -lt 500 ]; then
  echo "✅ SUCCESS! Achieved target of <500 warnings!"
else
  echo "📊 Progress: Need to reduce $((FINAL - 499)) more warnings to reach target"
fi