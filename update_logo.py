image.png#!/usr/bin/env python3
"""
Script to help update the RusseyKeo Computer logo for invoices
"""

import os
import shutil
from pathlib import Path

def update_logo():
    """Update the logo for invoices"""
    
    print("🏢 RusseyKeo Computer Logo Updater")
    print("=" * 40)
    
    # Define paths
    brand_folder = Path("static/images/brand")
    target_logo = brand_folder / "russeyKeo-logo.png"
    fallback_logo = Path("static/icons/logo.png")
    
    # Create brand folder if it doesn't exist
    brand_folder.mkdir(parents=True, exist_ok=True)
    
    print(f"📁 Brand folder: {brand_folder}")
    print(f"🎯 Target logo path: {target_logo}")
    
    # Check if custom logo exists
    if target_logo.exists():
        print("✅ Custom RusseyKeo logo found!")
        print(f"📏 File size: {target_logo.stat().st_size} bytes")
        
        # Test if it's a valid image (basic check)
        if target_logo.suffix.lower() in ['.png', '.jpg', '.jpeg']:
            print("✅ Valid image format detected")
        else:
            print("⚠️  Warning: File extension should be .png for best results")
            
    else:
        print("❌ Custom logo not found")
        print(f"📝 Please save your logo as: {target_logo}")
        print("\n📋 Instructions:")
        print("1. Save your RusseyKeo Computer logo as 'russeyKeo-logo.png'")
        print("2. Copy it to the 'static/images/brand/' folder")
        print("3. Run this script again to verify")
        
        # Ask if user wants to copy from another location
        print("\n🔍 Looking for logo files in current directory...")
        current_dir = Path(".")
        logo_files = list(current_dir.glob("*logo*")) + list(current_dir.glob("*Logo*"))
        
        if logo_files:
            print("📁 Found potential logo files:")
            for i, file in enumerate(logo_files, 1):
                print(f"  {i}. {file}")
            
            try:
                choice = input(f"\nEnter number (1-{len(logo_files)}) to copy as logo, or press Enter to skip: ")
                if choice.strip() and choice.isdigit():
                    choice_idx = int(choice) - 1
                    if 0 <= choice_idx < len(logo_files):
                        source_file = logo_files[choice_idx]
                        shutil.copy2(source_file, target_logo)
                        print(f"✅ Copied {source_file} to {target_logo}")
                    else:
                        print("❌ Invalid choice")
            except (ValueError, KeyboardInterrupt):
                print("⏭️  Skipped")
    
    # Check fallback logo
    if fallback_logo.exists():
        print(f"🔄 Fallback logo available: {fallback_logo}")
    else:
        print(f"⚠️  Warning: Fallback logo not found: {fallback_logo}")
    
    print("\n🌐 Test your logo:")
    print("1. Open: http://localhost:5000/staff/orders")
    print("2. Click 'View Invoice' on any order")
    print("3. Check if your logo appears correctly")
    
    print(f"\n📄 Logo will be used in:")
    print("- Customer invoices")
    print("- Pre-order receipts")
    print("- All printed documents")

if __name__ == "__main__":
    update_logo()
