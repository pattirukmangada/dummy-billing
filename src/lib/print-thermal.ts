// src/lib/print-thermal.ts
//
// Print strategy (in order of preference):
//
//  1. WebUSB (English + Telugu*)  →  browser sends ESC/POS bytes directly
//     to printer via USB.  No server.  Works from Hostinger or any URL.
//     Chrome / Edge only.
//
//  2. window.print() popup        →  browser print dialog.
//     Used when: Telugu*, WebUSB not supported (Firefox/Safari), or user
//     cancelled the USB picker.
//     Fixed for macOS: no premature window.close(), uses onafterprint.
//
//  * Telugu via WebUSB would need Telugu fonts loaded into the printer
//    firmware (not standard on TVS 3230 AWB), so Telugu always uses
//    window.print() where the OS renders the font correctly.

import { EscPos, COLS } from './print-escpos'
import { sendToUsb, isWebUsbSupported } from './print-usb'

export type PrintLang = 'en' | 'te'

// ── LABELS ────────────────────────────────────────────────────────────────
const LABELS = {
  en: {
    title:       'NKV Bombay Lemon Traders',
    subTitle:    'Lemon Merchant, Commission Agent & Exporter',
    address:     'Agri Market Yard, Tadipatri, Andhra Pradesh.',
    reportLabel: 'Buyer Report',
    pattiPrefix: 'Patti:',
    subBags:     'Sub Bags',
    subTotal:    'Sub Total',
    totalBags:   'Total Bags',
    totalAmount: 'Total Amount',
    discount:    'Discount 3%',
    finalAmount: 'Final Amount',
    thankYou:    'Thank You!  Visit Again.',
  },
  te: {
    title:       'NKV Bombay Lemon Traders',
    subTitle:    'Lemon Merchant, Commission Agent & Exporter',
    address:     'Agricultural Market Yard, Tadipatri, Andhra Pradesh, India.',
    reportLabel: 'కొనుగోలుదారుల నివేదిక',
    pattiPrefix: 'పట్టి:',
    subBags:     'ఉప సంచులు',
    subTotal:    'ఉప మొత్తం',
    totalBags:   'మొత్తం సంచులు',
    totalAmount: 'మొత్తం మొత్తం',
    discount:    'డిస్కౌంట్ 3%',
    finalAmount: 'చివరి మొత్తం',
    thankYou:    'ధన్యవాదాలు — Visit Again',
  },
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}-${m}-${y}`
}

// ── ESC/POS BUILD (English only) ──────────────────────────────────────────
function buildEscPos(
  buyerName: string,
  rows: any[],
  filters: { from?: string; to?: string }
): Uint8Array {
  const grouped: Record<string, any[]> = {}
  rows.forEach(r => {
    if (!grouped[r.patti_name]) grouped[r.patti_name] = []
    grouped[r.patti_name].push(r)
  })

  let totalBags = 0, totalAmount = 0
  const p = new EscPos()
  p.init()

  p.alignCenter().bold(true).big(true)
  p.line('NKV BOMBAY LEMON').line('TRADERS')
  p.big(false)
  p.line(LABELS.en.subTitle)
  p.line(LABELS.en.address)
  p.bold(false).sep()

  p.alignLeft()
  p.row('Sonu: 7013285158', 'Bujji: 8639826163')
  p.line('       7893287215')
  p.sep()

  p.alignCenter()
  p.line(LABELS.en.reportLabel)
  p.bold(true).line(buyerName).bold(false)
  p.line(`${formatDate(filters.from)} to ${formatDate(filters.to)}`)
  p.sep()

  p.alignLeft()
  Object.entries(grouped).forEach(([patti, items]) => {
    let subBags = 0, subAmount = 0
    p.bold(true).line(`${LABELS.en.pattiPrefix} ${patti}`).bold(false)

    items.forEach(r => {
      const bags = Number(r.bags || 0), rate = Number(r.rate || 0), amount = Number(r.amount || 0)
      subBags += bags; subAmount += amount
      p.row(`${r.item_name}  ${bags}x${rate}`, `Rs.${amount}`)
    })
    totalBags += subBags; totalAmount += subAmount

    p.sep()
    p.row(LABELS.en.subBags, String(subBags))
    p.row(LABELS.en.subTotal, `Rs.${subAmount}`)
    p.sep()
  })

  const discount    = Math.round(totalAmount * 0.03)
  const finalAmount = Math.ceil(totalAmount - discount)

  p.bold(true).row(LABELS.en.totalBags, String(totalBags))
  p.row(LABELS.en.totalAmount, `Rs.${totalAmount}`).bold(false)
  p.row(LABELS.en.discount, `-Rs.${discount}`)
  p.bold(true).row(LABELS.en.finalAmount, `Rs.${finalAmount}`).bold(false)

  p.sep().alignCenter()
  p.line(LABELS.en.thankYou)
  p.line('Developed by RukmanWebSolutions')
  p.feed(4).cut()

  return p.build()
}

// ── WINDOW.PRINT FALLBACK (Mac + Windows safe) ────────────────────────────
function safePrint(win: Window, delayMs = 600): void {
  win.focus()
  setTimeout(() => {
    win.print()
    win.onafterprint = () => { try { win.close() } catch (_) {} }
    // Safari does not always fire onafterprint — safety close after 2 s
    setTimeout(() => { try { if (!win.closed) win.close() } catch (_) {} }, 2000)
  }, delayMs)
}

function printViaPopup(
  buyerName: string,
  rows: any[],
  filters: { from?: string; to?: string },
  lang: PrintLang
): void {
  // Must open the popup synchronously in the click-event handler.
  // On macOS, opening inside an async/await loses the user-gesture context
  // and the popup is silently blocked by the browser.
  const win = window.open('', '_blank', 'width=340,height=640,menubar=no,toolbar=no')
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

  const L = LABELS[lang]

  const grouped: Record<string, any[]> = {}
  rows.forEach(r => {
    if (!grouped[r.patti_name]) grouped[r.patti_name] = []
    grouped[r.patti_name].push(r)
  })

  let totalBags = 0, totalAmount = 0
  let content = `
    <div class="receipt">
      <div class="center bold">${L.title}</div>
      <div class="center small">${L.subTitle}</div>
      <div class="center small">${L.address}</div>
      <div class="line"></div>
      <div class="item">
        <div><div class="bold">Sonu</div><div>7013285158</div><div>7893287215</div></div>
        <div style="text-align:right"><div class="bold">Bujji</div><div>8639826163</div></div>
      </div>
      <div class="line"></div>
      <div class="center small">${L.reportLabel}</div>
      <div class="center bold">${buyerName}</div>
      <div class="center small">${formatDate(filters.from)} - ${formatDate(filters.to)}</div>
      <div class="line"></div>
  `

  Object.entries(grouped).forEach(([patti, items]) => {
    let subBags = 0, subAmount = 0
    content += `<div class="bold">${L.pattiPrefix} ${patti}</div>`
    items.forEach(r => {
      const bags = Number(r.bags || 0), rate = Number(r.rate || 0), amount = Number(r.amount || 0)
      subBags += bags; subAmount += amount
      content += `<div class="item"><span>${r.item_name} ${bags}x${rate}</span><span>Rs.${amount}</span></div>`
    })
    totalBags += subBags; totalAmount += subAmount
    content += `
      <div class="line"></div>
      <div class="item bold"><span>${L.subBags}</span><span>${subBags}</span></div>
      <div class="item"><span>${L.subTotal}</span><span>Rs.${subAmount}</span></div>
      <div class="line"></div>
    `
  })

  const discount    = Math.round(totalAmount * 0.03)
  const finalAmount = Math.ceil(totalAmount - discount)
  content += `
    <div class="item bold"><span>${L.totalBags}</span><span>${totalBags}</span></div>
    <div class="item bold"><span>${L.totalAmount}</span><span>Rs.${totalAmount}</span></div>
    <div class="item"><span>${L.discount}</span><span>-Rs.${discount}</span></div>
    <div class="item bold"><span>${L.finalAmount}</span><span>Rs.${finalAmount}</span></div>
    <div class="line"></div>
    <div class="center small">${L.thankYou}</div>
    <div class="center small" style="font-size:7px;">Developed by RukmanWebSolutions</div>
    </div>
  `

  const fontFamily = lang === 'te'
    ? `'Noto Sans Telugu','Gautami','Vani',monospace`
    : `monospace`

  win.document.write(`
    <html><head>
      <title>Print — ${buyerName}</title>
      ${lang === 'te' ? `
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu&display=swap" rel="stylesheet">
      ` : ''}
      <style>
        @page { size: 80mm auto; margin: 0; }
        body   { margin:0; font-family:${fontFamily}; }
        .receipt { width:72mm; padding:3mm; font-size:10px; }
        .center { text-align:center; }
        .bold   { font-weight:bold; }
        .small  { font-size:8px; }
        .item   { display:flex; justify-content:space-between; white-space:nowrap; font-size:10px; }
        .line   { border-top:1px dashed black; margin:2px 0; }
        @media print { @page { margin:0; } }
      </style>
    </head><body>${content}</body></html>
  `)
  win.document.close()
  safePrint(win, lang === 'te' ? 1200 : 600)
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────
//
// Usage in your component (button onClick must be async):
//
//   import { printBuyerThermal } from '../../lib/print-thermal'
//
//   <button onClick={() => printBuyerThermal(buyerName, rows, filters, lang)}>
//     Print
//   </button>
//
// The function is async but the popup-open for the fallback path happens
// synchronously before any await — so popup-blockers are not triggered.

export async function printBuyerThermal(
  buyerName: string,
  rows: any[],
  filters: { from?: string; to?: string },
  lang: PrintLang = 'en'
): Promise<void> {

  // Telugu → always window.print() (printer firmware has no Telugu fonts)
  if (lang === 'te') {
    printViaPopup(buyerName, rows, filters, lang)
    return
  }

  // English → try WebUSB first ───────────────────────────────────────────
  if (isWebUsbSupported()) {
    const bytes  = buildEscPos(buyerName, rows, filters)
    const result = await sendToUsb(bytes)

    if (result.ok) return   // ✅ Printed silently via USB

    if (result.reason === 'no_device') {
      // User cancelled the USB picker — fall through to window.print()
      console.info('[print] USB picker cancelled — using window.print()')
    } else if (result.reason === 'error') {
      console.warn('[print] USB error:', result.message, '— using window.print()')
    }
    // 'unsupported' is handled below
  }

  // Fallback → window.print() popup (Safari, Firefox, or USB unavailable)
  printViaPopup(buyerName, rows, filters, lang)
}
