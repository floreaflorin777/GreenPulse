"""
This file contains the WSGI configuration required to serve up your
Flask application at PythonAnywhere.

It imports your Flask app and serves it using a WSGI handler.
"""

import sys
import os

# Add the path to your Flask app so Python can find it
path = '/home/florinm12/greenhouse_management'
if path not in sys.path:
    sys.path.insert(0, path)

# Import your Flask app
from app import app as application  # noqa

# The application variable is used by the WSGI server to serve the Flask app
# 'application' is the standard name for WSGI applications
