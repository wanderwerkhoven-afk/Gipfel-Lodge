<?php
declare(strict_types=1);
header('Content-Type: text/markdown; charset=utf-8');
header('Vary: Accept',false);
header('Cache-Control: public, max-age=300');
readfile(__DIR__.'/index.md');
