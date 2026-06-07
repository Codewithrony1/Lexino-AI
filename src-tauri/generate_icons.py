import os
from PIL import Image

def generate_icons():
    source_path = os.path.join("..", "website", "public", "logo", "Lexino_AI_Logo-removebg-preview.png")
    dest_dir = "icons"
    os.makedirs(dest_dir, exist_ok=True)

    print(f"Reading source logo from: {source_path}")
    logo = Image.open(source_path)

    # Center the 516x484 logo inside a 512x512 square transparent canvas
    canvas_size = 512
    square_img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    
    # Calculate offset
    offset_x = (canvas_size - logo.width) // 2
    offset_y = (canvas_size - logo.height) // 2
    
    square_img.paste(logo, (offset_x, offset_y), logo)

    # 1. Save main icon.png
    square_img.save(os.path.join(dest_dir, "icon.png"), "PNG")
    print("Saved icon.png")

    # 2. Save individual sizes
    sizes = {
        "32x32.png": 32,
        "128x128.png": 128,
        "128x128@2x.png": 256
    }
    
    for filename, size in sizes.items():
        resized = square_img.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(os.path.join(dest_dir, filename), "PNG")
        print(f"Saved {filename} ({size}x{size})")

    # 3. Save multi-size icon.ico for Windows
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    ico_path = os.path.join(dest_dir, "icon.ico")
    square_img.save(ico_path, format="ICO", sizes=ico_sizes)
    print("Saved icon.ico with multi-sizes")

    # 4. Dummy icon.icns (a copy of png or simple file to satisfy macOS compilers if they run, though not needed for Windows build)
    icns_path = os.path.join(dest_dir, "icon.icns")
    square_img.resize((256, 256)).save(icns_path, "PNG")
    print("Saved icon.icns placeholder")

if __name__ == "__main__":
    generate_icons()
