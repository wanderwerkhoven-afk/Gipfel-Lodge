<?php
declare(strict_types=1);
http_response_code(404);
header('Vary: Accept',false);
header('Cache-Control: no-store');
$accept=$_SERVER['HTTP_ACCEPT']??'';
if (stripos($accept,'text/markdown')!==false) {
 header('Content-Type: text/markdown; charset=utf-8');
 echo "# 404 — Seite nicht gefunden\n\nDie angeforderte Ressource existiert nicht. Besuchen Sie [die Sitemap](https://gipfellodge.at/sitemap.xml) oder [llms.txt](https://gipfellodge.at/llms.txt).\n";
} else {
 header('Content-Type: text/html; charset=utf-8');
 echo '<!doctype html><html lang="de"><meta charset="utf-8"><title>404 — Nicht gefunden</title><main><h1>404 — Seite nicht gefunden</h1><p>Die angeforderte Seite existiert nicht.</p><a href="/">Zur Startseite</a></main></html>';
}
