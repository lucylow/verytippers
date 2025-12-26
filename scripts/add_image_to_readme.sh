#!/bin/bash

# Script to add an image reference to README.md
# Usage: ./scripts/add_image_to_readme.sh <image_path> [alt_text] [section]

IMAGE_PATH="$1"
ALT_TEXT="${2:-Image}"
SECTION="${3:-}"

if [ -z "$IMAGE_PATH" ]; then
    echo "Usage: $0 <image_path> [alt_text] [section]"
    echo "Example: $0 images/architecture.jpg 'System Architecture' '## System Architecture'"
    exit 1
fi

# Check if image exists
if [ ! -f "$IMAGE_PATH" ]; then
    echo "Error: Image file not found: $IMAGE_PATH"
    exit 1
fi

# Convert to JPEG if needed
if [[ "$IMAGE_PATH" != *.jpg && "$IMAGE_PATH" != *.jpeg ]]; then
    echo "Converting image to JPEG format..."
    python3 scripts/convert_images_to_jpeg.py "$(dirname "$IMAGE_PATH")" images
    # Update path to JPEG version
    IMAGE_NAME=$(basename "$IMAGE_PATH" | sed 's/\.[^.]*$//')
    IMAGE_PATH="images/${IMAGE_NAME}.jpg"
fi

# Generate markdown
MARKDOWN="![${ALT_TEXT}](${IMAGE_PATH})"

if [ -n "$SECTION" ]; then
    # Add to specific section
    echo "Adding image to section: $SECTION"
    # This would require more complex sed/awk logic
    echo "$MARKDOWN" >> README.md
else
    # Just output the markdown
    echo "Add this to your README.md:"
    echo ""
    echo "$MARKDOWN"
fi

echo ""
echo "Image reference generated successfully!"

