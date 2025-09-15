#!/bin/bash
echo "Starting build process..."
npm install --production
echo "Installing sqlite3 from source..."
npm install sqlite3 --build-from-source
echo "Build completed successfully"