# Image Setup Guide

This guide explains how to fix "unable to render rich display" errors for images in the GitHub README.

## Problem

GitHub sometimes shows "unable to render rich display" errors when:
- Images are in unsupported formats (PNG, GIF, WebP, etc.)
- Images are too large
- Images are embedded incorrectly
- Images use data URIs or base64 encoding

## Solution

Convert all images to **JPEG format** and reference them using standard markdown syntax.

## Quick Start

### 1. Convert Existing Images

If you have images that need conversion:

```bash
# Using Python script (recommended)
python3 scripts/convert_images_to_jpeg.py

# Or using shell script (requires ImageMagick)
./scripts/convert-images-to-jpeg.sh
```

### 2. Add Images to README

Use standard markdown image syntax:

```markdown
![Alt text](images/filename.jpg)
```

Example:
```markdown
![System Architecture Diagram](images/system-architecture.jpg)
```

### 3. Best Practices

- ✅ Use JPEG format (.jpg)
- ✅ Keep file sizes under 1MB when possible
- ✅ Use descriptive filenames
- ✅ Always include alt text
- ✅ Use relative paths from repository root

## Conversion Scripts

### Python Script (Recommended)

**Location**: `scripts/convert_images_to_jpeg.py`

**Requirements**: Pillow (`pip install Pillow`)

**Usage**:
```bash
# Convert all images in project
python3 scripts/convert_images_to_jpeg.py

# Specify custom directories
python3 scripts/convert_images_to_jpeg.py /path/to/input /path/to/output
```

**Features**:
- Automatically finds images in various formats
- Converts to JPEG with quality optimization
- Handles transparency (converts to white background)
- Generates markdown references automatically

### Shell Script

**Location**: `scripts/convert-images-to-jpeg.sh`

**Requirements**: ImageMagick

**Installation**:
```bash
# macOS
brew install imagemagick

# Linux
sudo apt-get install imagemagick
```

**Usage**:
```bash
./scripts/convert-images-to-jpeg.sh [input_dir] [output_dir]
```

## Directory Structure

```
verytippers/
├── images/              # All README images go here
│   ├── README.md        # Image documentation
│   └── .gitkeep        # Ensures directory is tracked
├── scripts/
│   ├── convert_images_to_jpeg.py      # Python conversion script
│   ├── convert-images-to-jpeg.sh     # Shell conversion script
│   └── add_image_to_readme.sh        # Helper to add images
└── README.md            # Main README with image references
```

## Troubleshooting

### "Unable to render rich display" still appears

1. **Check file format**: Ensure image is `.jpg` or `.jpeg`
2. **Check file path**: Use relative paths like `images/filename.jpg`
3. **Check file size**: Large files (>5MB) may not render
4. **Check file exists**: Ensure image is committed to repository
5. **Clear browser cache**: GitHub may cache old versions

### Conversion fails

1. **Install dependencies**:
   ```bash
   pip install Pillow  # For Python script
   brew install imagemagick  # For shell script
   ```

2. **Check file permissions**:
   ```bash
   chmod +x scripts/*.sh
   chmod +x scripts/*.py
   ```

3. **Verify image is valid**: Try opening the image in an image viewer

### Images not showing on GitHub

1. **Check markdown syntax**: Must be `![alt](path)`
2. **Check path**: Must be relative to repository root
3. **Check file extension**: GitHub is case-sensitive
4. **Check file is committed**: Uncommitted files won't show

## Examples

### Adding a New Image

1. Place image in `images/` directory
2. Convert to JPEG if needed:
   ```bash
   python3 scripts/convert_images_to_jpeg.py images images
   ```
3. Add to README:
   ```markdown
   ![Description](images/filename.jpg)
   ```

### Converting Existing Images

If you have images elsewhere in the project:

```bash
# Find all images
find . -type f \( -name "*.png" -o -name "*.gif" -o -name "*.webp" \) \
  ! -path "./node_modules/*" ! -path "./dist/*"

# Convert them
python3 scripts/convert_images_to_jpeg.py . images
```

## Additional Resources

- [GitHub Markdown Image Syntax](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#images)
- [Pillow Documentation](https://pillow.readthedocs.io/)
- [ImageMagick Documentation](https://imagemagick.org/script/command-line-processing.php)

