#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream, readFileSync } from 'fs';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Read package.json
const pkg = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));

// Check if build directory exists
const buildDir = path.join(rootDir, '.scaffold', 'build');
if (!fs.existsSync(buildDir)) {
  console.error('Build directory not found. Please run "npm run build" first.');
  process.exit(1);
}

// Create dist directory if it doesn't exist
const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Generate filename based on package version
const version = pkg.version;
const addonName = pkg.name;
const filename = `${addonName}-${version}.xpi`;
const outputPath = path.join(distDir, filename);

// Create a file stream
const output = createWriteStream(outputPath);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

// Listen for archive events
output.on('close', () => {
  const sizeKB = (archive.pointer() / 1024).toFixed(2);
  console.log(`✅ Created ${filename} (${sizeKB} KB)`);
  console.log(`📦 Output: ${outputPath}`);
  
  // Also create a copy without version for easy testing
  const latestPath = path.join(distDir, `${addonName}.xpi`);
  fs.copyFileSync(outputPath, latestPath);
  console.log(`📦 Latest: ${latestPath}`);
});

archive.on('warning', (err) => {
  if (err.code === 'ENOENT') {
    console.warn('Warning:', err);
  } else {
    throw err;
  }
});

archive.on('error', (err) => {
  throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Add build directory contents to archive
archive.directory(buildDir, false);

// Finalize the archive
archive.finalize();
