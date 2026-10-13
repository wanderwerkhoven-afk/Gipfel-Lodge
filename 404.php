<?php
http_response_code(404);
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, follow');
if (stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'text/markdown') !== false) {
  header('Content-Type: text/markdown; charset=utf-8');
  echo "# 404 — Not Found\n\nThis resource does not exist. Find public pages at https://gipfellodge.at/sitemap.xml and https://gipfellodge.at/llms.txt.\n";
  exit;
}
header('Content-Type: text/html; charset=utf-8');
echo '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>404 | Gipfel Lodge</title></head><body><main style="max-width:40rem;margin:10vh auto;padding:2rem;font-family:system-ui"><h1>404 – Seite nicht gefunden</h1><p>Diese Seite existiert nicht. Bitte kehren Sie zur Gipfel Lodge zurück.</p><a href="/">Zur Startseite</a></main></body></html>';
