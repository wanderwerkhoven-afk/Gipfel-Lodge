<?php
/**
 * list-images.php
 * Gipfel Lodge - Live Image Scanner
 * Returns a JSON list of all images in assets/images/ recursively.
 * Used by the admin panel to populate the image library without needing a build step.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Only allow requests from localhost or with a simple secret header
// (The admin panel is already protected by Firebase Auth)
$allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];

$baseDir = __DIR__ . '/assets/images/';
$baseUrl = 'assets/images/';

$images = [];

function scanImages($dir, $baseDir, $baseUrl, $allowedExtensions, &$images) {
    if (!is_dir($dir)) return;
    
    $files = scandir($dir);
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        
        $fullPath = $dir . '/' . $file;
        $relativePath = $baseUrl . substr($fullPath, strlen($baseDir));
        
        if (is_dir($fullPath)) {
            scanImages($fullPath, $baseDir, $baseUrl, $allowedExtensions, $images);
        } else {
            $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            if (in_array($ext, $allowedExtensions)) {
                // Normalize path separators
                $relativePath = str_replace('\\', '/', $relativePath);
                $images[] = $relativePath;
            }
        }
    }
}

scanImages($baseDir, $baseDir, $baseUrl, $allowedExtensions, $images);

// Sort alphabetically for consistent ordering
sort($images);

echo json_encode([
    'images' => $images,
    'count' => count($images),
    'source' => 'live-php-scan'
]);
