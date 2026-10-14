<?php
declare(strict_types=1);
http_response_code(404);header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');
echo json_encode(['error'=>['code'=>'API_ENDPOINT_NOT_FOUND','message'=>'The requested public API endpoint does not exist.','resolution'=>'Consult https://gipfellodge.at/openapi.json for supported endpoints.']],JSON_UNESCAPED_SLASHES);
