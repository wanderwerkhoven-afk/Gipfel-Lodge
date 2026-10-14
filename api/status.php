<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
 http_response_code(405);header('Allow: GET');
 echo json_encode(['error'=>['code'=>'METHOD_NOT_ALLOWED','message'=>'Only GET is supported.','resolution'=>'Use GET /api/status.php.']],JSON_UNESCAPED_SLASHES);exit;
}
echo json_encode(['service'=>'Gipfel Lodge','status'=>'online','website'=>'https://gipfellodge.at/'],JSON_UNESCAPED_SLASHES);
