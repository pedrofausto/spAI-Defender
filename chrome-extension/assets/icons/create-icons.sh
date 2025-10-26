#!/bin/bash
# Script to create placeholder icons using ImageMagick
# Run this if you have ImageMagick installed: sudo apt-get install imagemagick

sizes=(16 32 48 128)
for size in "${sizes[@]}"; do
  convert -size ${size}x${size} xc:none \
    -fill "#4285F4" -draw "circle $(($size/2)),$(($size/2)) $(($size/2)),$((size*3/8))" \
    -fill white -gravity center -pointsize $((size/3)) -annotate +0+0 "AI" \
    icon${size}.png 2>/dev/null || echo "ImageMagick not installed. Please create icons manually."
done
