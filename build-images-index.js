/**
 * build-images-index.js
 * Gipfel Lodge - Image Index Generator
 * Scans assets/images/ recursively and writes js/data/images.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const ASSETS_DIR = path.join(ROOT, 'assets', 'images');
const OUTPUT_FILE = path.join(ROOT, 'js', 'site_js', 'data', 'images.json');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];

function scanImages(dir, baseDir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(scanImages(fullPath, baseDir));
        } else if (IMAGE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
            // Use forward slashes for web paths
            const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
            results.push('assets/images/' + relativePath);
        }
    }
    return results;
}

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const images = scanImages(ASSETS_DIR, ASSETS_DIR);
images.sort();

const output = JSON.stringify({ images, generated: new Date().toISOString() }, null, 2);
fs.writeFileSync(OUTPUT_FILE, output, 'utf8');

console.log(`[images-index] Found ${images.length} images → js/data/images.json`);
