import os
import re

def add_navigation_to_heatmap(file_path):
    """Add navigation to a heatmap HTML file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if navigation already exists
        if 'heatmap_nav.html' in content or 'GreenGrids Logo' in content:
            print(f"Navigation already exists in {file_path}")
            return
        
        # Find the <body> tag and add navigation after it
        body_pattern = r'(<body[^>]*>)'
        
        # Navigation HTML to insert
        nav_html = '''<!-- Navigation Header -->
<header class="fixed w-full z-50 py-4 bg-white shadow-lg">
    <div class="container mx-auto px-6 flex justify-between items-center">
        <div class="flex items-center">
            <a href="/" class="block">
                <img src="/static/img/gglogo.webp" alt="GreenGrids Logo" class="h-16 w-auto">
            </a>
        </div>
        <nav class="hidden md:block">
            <ul class="flex space-x-6">
                <li>
                    <a href="/" class="text-dark-green hover:text-primary-green font-medium transition-colors">
                        HOME
                    </a>
                </li>
                <li>
                    <a href="/map" class="text-dark-green hover:text-primary-green font-medium transition-colors">
                        GREEN GRID
                    </a>
                </li>
                <li>
                    <a href="/emissions" class="text-dark-green hover:text-primary-green font-medium transition-colors">
                        EMISSIONS
                    </a>
                </li>
                <li>
                    <a href="/dashboard" class="text-dark-green hover:text-primary-green font-medium transition-colors">
                        DASHBOARD
                    </a>
                </li>
                <li>
                    <a href="/funding" class="text-dark-green hover:text-primary-green font-medium transition-colors">
                        FUNDING
                    </a>
                </li>
                <li>
                    <a href="/news" class="text-dark-green hover:text-primary-green font-medium transition-colors">
                        NEWS
                    </a>
                </li>
                <li>
                    <a href="/contact" class="text-dark-green hover:text-primary-green font-medium transition-colors">
                        CONTACT
                    </a>
                </li>
            </ul>
        </nav>
        <button class="md:hidden text-dark-green">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
        </button>
    </div>
</header>

<!-- Add some top margin to account for fixed header -->
<div class="h-20"></div>'''
        
        # Replace the body tag with body tag + navigation
        new_content = re.sub(body_pattern, r'\1\n' + nav_html, content)
        
        # Write the updated content back to the file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"Navigation added to {file_path}")
        
    except Exception as e:
        print(f"Error adding navigation to {file_path}: {e}")

def main():
    # List of heatmap files to update
    heatmap_files = [
        'templates/bengaluru_after_heatmap.html',
        'templates/bengaluru_canopy_height_heatmap.html'
    ]
    
    for file_path in heatmap_files:
        if os.path.exists(file_path):
            add_navigation_to_heatmap(file_path)
        else:
            print(f"File not found: {file_path}")

if __name__ == "__main__":
    main()