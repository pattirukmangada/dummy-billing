// src/lib/print-escpos.ts
// ESC/POS raw printing for TVS 3230 AWB (and any 80mm ESC/POS printer)
// Strategy:
//   English → build ESC/POS bytes → POST to /api/print-raw → PHP sends
//             via TCP socket to printer WiFi IP:9100.  No browser dialog.
//   Telugu  → caller falls back to window.print() (ESC/POS has no Unicode).
//
// The PHP endpoint (PrintController.php) must be reachable on the same
// LAN as the printer.  On Hostinger-only deployment it will fail gracefully
// and the caller should fall back to window.print().

// ── ESC/POS byte constants ────────────────────────────────────────────────
const ESC = 0x1b
const GS  = 0x1d
const LF  = 0x0a

const CMD = {
  INIT:           [ESC, 0x40],           // Reset printer
  ALIGN_LEFT:     [ESC, 0x61, 0x00],
  ALIGN_CENTER:   [ESC, 0x61, 0x01],
  ALIGN_RIGHT:    [ESC, 0x61, 0x02],
  BOLD_ON:        [ESC, 0x45, 0x01],
  BOLD_OFF:       [ESC, 0x45, 0x00],
  DOUBLE_ON:      [ESC, 0x21, 0x10],     // Double height
  DOUBLE_OFF:     [ESC, 0x21, 0x00],
  UNDERLINE_ON:   [ESC, 0x2d, 0x01],
  UNDERLINE_OFF:  [ESC, 0x2d, 0x00],
  CUT_PARTIAL:    [GS,  0x56, 0x41, 0x10], // Feed + partial cut
  FEED_LINES:     (n: number) => [ESC, 0x64, n],
}

// 80 mm printer at standard font = 48 printable columns
const COLS = 48

// ── Builder ───────────────────────────────────────────────────────────────
export class EscPos {
  private buf: number[] = []

  // Control
  init()           { return this.push(CMD.INIT) }
  alignLeft()      { return this.push(CMD.ALIGN_LEFT) }
  alignCenter()    { return this.push(CMD.ALIGN_CENTER) }
  alignRight()     { return this.push(CMD.ALIGN_RIGHT) }
  bold(on: boolean){ return this.push(on ? CMD.BOLD_ON : CMD.BOLD_OFF) }
  big(on: boolean) { return this.push(on ? CMD.DOUBLE_ON : CMD.DOUBLE_OFF) }
  feed(n = 1)      { return this.push(CMD.FEED_LINES(n)) }
  cut()            { return this.push(CMD.CUT_PARTIAL) }

  // Text helpers
  text(s: string) {
    // Only ASCII / Latin-1 — ESC/POS cannot handle Unicode directly
    for (let i = 0; i < s.length; i++) {
      this.buf.push(s.charCodeAt(i) & 0xff)
    }
    return this
  }

  line(s = '') {
    this.text(s)
    this.buf.push(LF)
    return this
  }

  // Dashed separator
  sep() { return this.line('-'.repeat(COLS)) }

  // Left + right on same line, padded to COLS
  row(left: string, right: string, totalCols = COLS) {
    const gap = totalCols - left.length - right.length
    return this.line(left + ' '.repeat(Math.max(1, gap)) + right)
  }

  // Centre a string, padded to COLS
  centerLine(s: string) {
    const pad = Math.max(0, Math.floor((COLS - s.length) / 2))
    return this.line(' '.repeat(pad) + s)
  }

  // Build final Uint8Array
  build(): Uint8Array {
    return new Uint8Array(this.buf)
  }

  private push(cmds: number[]) {
    this.buf.push(...cmds)
    return this
  }
}

// ── WiFi sender ───────────────────────────────────────────────────────────
// Converts bytes to base64 and POSTs to /api/print-raw.
// Returns true on success, false if the endpoint is unreachable.
export async function sendToWifi(
  bytes: Uint8Array,
  apiBase: string
): Promise<boolean> {
  try {
    // base64-encode so it survives JSON transport
    let binary = ''
    bytes.forEach(b => binary += String.fromCharCode(b))
    const b64 = btoa(binary)

    const res = await fetch(`${apiBase}/print-raw`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ data: b64 }),
      // Short timeout — if the printer / local backend is offline we
      // want to fall back to window.print() quickly
      signal:  AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.warn('[ESC/POS]', res.status, err)
      return false
    }
    return true
  } catch (e) {
    console.warn('[ESC/POS] WiFi send failed, falling back to window.print()', e)
    return false
  }
}
