#!/bin/bash

# Script to convert images to JPEG format for GitHub README
# Usage: ./scripts/convert-images-to-jpeg.sh [input_directory] [output_directory]

INPUT_DIR="${1:-.}"
OUTPUT_DIR="${2:-images}"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install imagemagick
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y imagemagick
    else
        echo "Please install ImageMagick manually"
        exit 1
    fi
fi

# Find and convert images
find "$INPUT_DIR" -type f \( -iname "*.png" -o -iname "*.gif" -o -iname "*.webp" -o -iname "*.bmp" -o -iname "*.tiff" \) ! -path "./node_modules/*" ! -path "./dist/*" ! -path "./.git/*" | while read -r img; do
    # Get filename without extension
    filename=$(basename "$img")
    name="${filename%.*}"
    
    # Convert to JPEG
    output_path="$OUTPUT_DIR/${name}.jpg"
    echo "Converting $img to $output_path"
    convert "$img" -quality 85 -strip "$output_path"
done

echo "Conversion complete! Images saved to $OUTPUT_DIR"

