<?php
declare(strict_types=1);
// Stateless, read-only MCP Streamable HTTP JSON-RPC endpoint.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$httpMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($httpMethod !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    echo json_encode(['error'=>['code'=>'METHOD_NOT_ALLOWED','message'=>'Send MCP JSON-RPC using POST.']]);
    exit;
}
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== explode(':', $_SERVER['HTTP_HOST'] ?? '')[0]) {
    http_response_code(403);
    echo json_encode(['error'=>['code'=>'ORIGIN_DENIED','message'=>'Cross-origin requests denied.']]);
    exit;
}
$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > 65536) {
    http_response_code(413);
    exit;
}
$r = json_decode($raw, true);
if (!is_array($r) || array_is_list($r) || ($r['jsonrpc'] ?? null) !== '2.0' || !is_string($r['method'] ?? null)) {
    http_response_code(400);
    echo json_encode(['jsonrpc'=>'2.0','id'=>null,'error'=>['code'=>-32600,'message'=>'Invalid Request']]);
    exit;
}
$id = $r['id'] ?? null;
if ($id === null) { http_response_code(202); exit; }
$defs = [
    ['name'=>'get_lodge_info','description'=>'Read public Gipfel Lodge accommodation facts','inputSchema'=>['type'=>'object','properties'=>(object)[]]],
    ['name'=>'get_location_info','description'=>'Read public Gipfel Lodge location facts','inputSchema'=>['type'=>'object','properties'=>(object)[]]],
    ['name'=>'get_booking_link','description'=>'Read official booking link; no availability or booking operations','inputSchema'=>['type'=>'object','properties'=>(object)[]]]
];
$facts = [
    'get_lodge_info'=>'Gipfel Lodge in Eben im Pongau, Austria: approximately 135 square metres, four bedrooms, three bathrooms, private sauna, up to ten guests.',
    'get_location_info'=>'Gipfel Lodge is located in Eben im Pongau, Salzburgerland, near Flachau and Ski amadé.',
    'get_booking_link'=>'Official booking entry point: https://gipfellodge.at/#booking . Verify availability and prices on the booking website.'
];
$error = null;
$result = null;
switch ($r['method']) {
    case 'initialize':
        $requested = $r['params']['protocolVersion'] ?? '2025-03-26';
        $version = in_array($requested, ['2025-03-26','2025-06-18','2025-11-25'], true) ? $requested : '2025-03-26';
        header('MCP-Protocol-Version: '.$version);
        $result = ['protocolVersion'=>$version,'capabilities'=>['tools'=>['listChanged'=>false]],'serverInfo'=>['name'=>'gipfel-lodge-public','version'=>'1.0.0']];
        break;
    case 'ping': $result = (object)[]; break;
    case 'tools/list': $result = ['tools'=>$defs]; break;
    case 'tools/call':
        $name = $r['params']['name'] ?? '';
        if (!is_string($name) || !isset($facts[$name])) $error = ['code'=>-32602,'message'=>'Unknown tool'];
        else $result = ['content'=>[['type'=>'text','text'=>$facts[$name]]],'isError'=>false];
        break;
    default: $error = ['code'=>-32601,'message'=>'Method not found'];
}
echo json_encode(['jsonrpc'=>'2.0','id'=>$id] + ($error ? ['error'=>$error] : ['result'=>$result]),JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
