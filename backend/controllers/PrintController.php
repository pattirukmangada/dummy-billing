<?php
// backend/controllers/PrintController.php
// Receives base64-encoded ESC/POS bytes from the frontend and forwards
// them to the thermal printer via a raw TCP socket (WiFi mode, port 9100).
//
// Configuration (set in backend/.env or server environment):
//   PRINTER_IP    — printer's WiFi IP address   (default: 192.168.1.200)
//   PRINTER_PORT  — raw TCP port                 (default: 9100)
//   PRINTER_TIMEOUT — connection timeout seconds (default: 4)
//
// How to find the printer IP:
//   1. Print the self-test page (hold FEED on power-on) — IP printed on slip.
//   2. Or check your router's DHCP table for "TVS" device.
//   Tip: assign a static IP in the router so it never changes.

function handlePrintRaw(): void
{
    // ── Read config ──────────────────────────────────────────────────────
    $printerIp      = $_ENV['PRINTER_IP']      ?? getenv('PRINTER_IP')      ?: '192.168.1.200';
    $printerPort    = (int)($_ENV['PRINTER_PORT']    ?? getenv('PRINTER_PORT')    ?: 9100);
    $printerTimeout = (int)($_ENV['PRINTER_TIMEOUT'] ?? getenv('PRINTER_TIMEOUT') ?: 4);

    // ── Parse request body ────────────────────────────────────────────────
    $body = json_decode(file_get_contents('php://input'), true);

    if (empty($body['data'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing field: data (base64 ESC/POS bytes)']);
        return;
    }

    $rawBytes = base64_decode($body['data'], strict: true);
    if ($rawBytes === false) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid base64 in field: data']);
        return;
    }

    // ── Open TCP socket to printer ────────────────────────────────────────
    $errno  = 0;
    $errstr = '';

    $socket = @fsockopen($printerIp, $printerPort, $errno, $errstr, $printerTimeout);

    if ($socket === false) {
        http_response_code(503);
        echo json_encode([
            'error'  => "Cannot connect to printer at {$printerIp}:{$printerPort}",
            'detail' => $errstr,
            'tip'    => 'Check: (1) printer is powered on & WiFi connected, '
                      . '(2) PRINTER_IP in .env matches the printer IP, '
                      . '(3) this server is on the same LAN as the printer.',
        ]);
        return;
    }

    // ── Send raw ESC/POS bytes ────────────────────────────────────────────
    $written = fwrite($socket, $rawBytes);
    fclose($socket);

    if ($written === false || $written < strlen($rawBytes)) {
        http_response_code(500);
        echo json_encode(['error' => 'Partial write to printer socket']);
        return;
    }

    // ── Success ───────────────────────────────────────────────────────────
    echo json_encode([
        'success' => true,
        'bytes'   => $written,
    ]);
}
