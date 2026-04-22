// src/lib/print-serial.ts
// Serial print (list of pattis + net amounts) with ESC/POS WiFi path.
// Falls back to window.print() if the /api/print-raw endpoint is unreachable.

import { EscPos, sendToWifi } from './print-escpos'

// ── ESC/POS BUILD ─────────────────────────────────────────────────────────
function buildSerialEscPos(rows: any[]): Uint8Array {
  const total = Math.round(
    rows.reduce((s, r) => s + Number(r.net_amount || 0), 0)
  )

  const p = new EscPos()
  p.init()

  p.alignCenter()
  p.bold(true).big(true).line('NKV BOMBAY').line('LEMON TRADERS').big(false)
  p.line('Serial Print')
  p.bold(false)
  p.sep()

  p.alignLeft()
  rows.forEach(r => {
    const amt = Number(r.net_amount || 0).toFixed(0)
    p.row(`${r.patti_name} #${r.serial_number}`, `Rs.${amt}`)
  })

  p.sep()
  p.bold(true).row('TOTAL', `Rs.${total}`).bold(false)
  p.feed(4)
  p.cut()

  return p.build()
}

// ── WINDOW.PRINT FALLBACK ─────────────────────────────────────────────────
function safePrint(win: Window, delayMs = 600): void {
  win.focus()
  setTimeout(() => {
    win.print()
    win.onafterprint = () => { try { win.close() } catch (_) {} }
    setTimeout(() => { try { if (!win.closed) win.close() } catch (_) {} }, 2000)
  }, delayMs)
}

function printSerialViaPopup(rows: any[]): void {
  const total = Math.round(
    rows.reduce((s, r) => s + Number(r.net_amount || 0), 0)
  )

  let content = `
  <div class="receipt">
    <div class="center bold">NKV BOMBAY LEMON TRADERS</div>
    <div class="center small">Serial Print</div>
    <div class="line"></div>
  `

  rows.forEach(r => {
    content += `
      <div class="item">
        <span>${r.patti_name} #${r.serial_number}</span>
        <span>Rs.${Number(r.net_amount || 0).toFixed(0)}</span>
      </div>
    `
  })

  content += `
    <div class="line"></div>
    <div class="item bold">
      <span>Total</span>
      <span>Rs.${total}</span>
    </div>
  </div>
  `

  const win = window.open('', '_blank', 'width=320,height=600,menubar=no,toolbar=no')
  if (!win) {
    alert(
      'Pop-up blocked!\n\n' +
      'Allow pop-ups for this site:\n' +
      '• Chrome/Edge: click the blocked icon in the address bar\n' +
      '• Safari: Safari → Settings → Websites → Pop-up Windows → Allow\n' +
      '• Firefox: click Options on the blocked bar'
    )
    return
  }

  win.document.write(`
    <html>
      <head>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { margin: 0; font-family: monospace; }
          .receipt { width: 72mm; padding: 3mm; font-size: 10px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .small { font-size: 8px; }
          .item { display: flex; justify-content: space-between; }
          .line { border-top: 1px dashed black; margin: 3px 0; }
          @media print { @page { margin: 0; } }
        </style>
      </head>
      <body>${content}</body>
    </html>
  `)

  win.document.close()
  safePrint(win, 600)
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────
export async function printSerialThermal(rows: any[]): Promise<void> {
  const apiBase = (import.meta.env.VITE_API_BASE as string) || '/api'
  const bytes   = buildSerialEscPos(rows)
  const ok      = await sendToWifi(bytes, apiBase)

  if (!ok) {
    console.info('[print] ESC/POS unavailable — using window.print() fallback')
    printSerialViaPopup(rows)
  }
}
