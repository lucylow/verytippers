#!/usr/bin/env python3
"""
Convert images to JPEG format for GitHub README compatibility.
This script finds images in various formats and converts them to JPEG.
"""

import os
import sys
from pathlib import Path
from PIL import Image

def convert_to_jpeg(input_path: Path, output_dir: Path, quality: int = 85) -> Path:
    """Convert an image to JPEG format."""
    try:
        # Open image
        img = Image.open(input_path)
        
        # Convert RGBA to RGB if necessary (JPEG doesn't support transparency)
        if img.mode in ('RGBA', 'LA', 'P'):
            # Create white background
            rgb_img = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            rgb_img.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
            img = rgb_img
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Generate output filename
        output_filename = input_path.stem + '.jpg'
        output_path = output_dir / output_filename
        
        # Save as JPEG
        img.save(output_path, 'JPEG', quality=quality, optimize=True)
        
        print(f"✓ Converted: {input_path.name} → {output_path.name}")
        return output_path
    except Exception as e:
        print(f"✗ Error converting {input_path.name}: {e}")
        return None

def find_images(directory: Path, exclude_dirs: set = None) -> list:
    """Find all image files in directory."""
    if exclude_dirs is None:
        exclude_dirs = {'node_modules', 'dist', '.git', '__pycache__', '.next'}
    
    image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff', '.tif', '.svg'}
    images = []
    
    for root, dirs, files in os.walk(directory):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for file in files:
            file_path = Path(root) / file
            if file_path.suffix.lower() in image_extensions:
                # Skip if already JPEG
                if file_path.suffix.lower() not in {'.jpg', '.jpeg'}:
                    images.append(file_path)
    
    return images

def main():
    """Main function."""
    # Default paths
    project_root = Path(__file__).parent.parent
    input_dir = project_root
    output_dir = project_root / 'images'
    
    # Parse command line arguments
    if len(sys.argv) > 1:
        input_dir = Path(sys.argv[1])
    if len(sys.argv) > 2:
        output_dir = Path(sys.argv[2])
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Searching for images in: {input_dir}")
    print(f"Output directory: {output_dir}\n")
    
    # Find images
    images = find_images(input_dir)
    
    if not images:
        print("No images found to convert.")
        return
    
    print(f"Found {len(images)} image(s) to convert:\n")
    
    # Convert images
    converted = []
    for img_path in images:
        output_path = convert_to_jpeg(img_path, output_dir)
        if output_path:
            converted.append((img_path, output_path))
    
    print(f"\n✓ Conversion complete! {len(converted)} image(s) converted.")
    print(f"Images saved to: {output_dir}")
    
    # Generate markdown references
    if converted:
        print("\n---\nMarkdown image references:\n")
        for original, jpeg_path in converted:
            rel_path = jpeg_path.relative_to(project_root)
            print(f"![{jpeg_path.stem}]({rel_path})")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nConversion cancelled by user.")
        sys.exit(1)
    except ImportError:
        print("Error: PIL (Pillow) is required. Install it with: pip install Pillow")
        sys.exit(1)

