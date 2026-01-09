from flask_frozen import Freezer
from app import app
import os

# Create build directory
if not os.path.exists('build'):
    os.makedirs('build')

freezer = Freezer(app)
app.config['FREEZER_DESTINATION'] = 'build'
app.config['FREEZER_RELATIVE_URLS'] = True

if __name__ == '__main__':
    freezer.freeze() 