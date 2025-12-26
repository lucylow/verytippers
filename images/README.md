# Images Directory

This directory contains images used in the GitHub README and documentation.

## Image Format Requirements

All images in this directory should be in **JPEG format** (.jpg) for maximum GitHub compatibility and to avoid "unable to render rich display" errors.

## Converting Images to JPEG

### Using Python Script (Recommended)

```bash
# Install Pillow if needed
pip install Pillow

# Convert all images in the project to JPEG
python3 scripts/convert_images_to_jpeg.py

# Or specify custom directories
python3 scripts/convert_images_to_jpeg.py /path/to/images /path/to/output
```

### Using Shell Script

```bash
# Requires ImageMagick
brew install imagemagick  # macOS
# or
sudo apt-get install imagemagick  # Linux

# Convert images
./scripts/convert-images-to-jpeg.sh
```

## Adding Images to README

When adding images to the README, use the following markdown syntax:

```markdown
![Alt text](images/filename.jpg)
```

Example:
```markdown
![System Architecture](images/system-architecture.jpg)
```

## Best Practices

1. **Use JPEG format** - GitHub renders JPEG images reliably
2. **Optimize file size** - Keep images under 1MB when possible
3. **Use descriptive filenames** - e.g., `system-architecture.jpg` not `img1.jpg`
4. **Add alt text** - Always include descriptive alt text for accessibility
5. **Use relative paths** - Reference images using relative paths from the repository root

## Troubleshooting

If you see "unable to render rich display" errors on GitHub:

1. Ensure the image is in JPEG format
2. Check that the file path is correct
3. Verify the image file size is reasonable (< 5MB)
4. Make sure the image is committed to the repository
5. Use relative paths, not absolute paths

