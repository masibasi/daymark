#!/bin/bash
cd "$(dirname "$0")"
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for f in r*.svg; do n=${f%.svg}; num=$(echo $n | sed -E 's/^r([0-9]+).*/\1/')
 "$CH" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=1024,1024 --screenshot="$PWD/png/full-$num.png" "file://$PWD/$f" >/dev/null 2>&1
done
ls png
