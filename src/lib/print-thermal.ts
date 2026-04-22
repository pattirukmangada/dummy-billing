// // src/lib/print-thermal.ts
// export type PrintLang = 'en' | 'te'

// // ── LABEL SETS ─────────────────────────────────────────────────────────────
// const LABELS = {
//   en: {
//     title:        'NKV Bombay Lemon Traders',
//     subTitle:     'Lemon Merchant, Commission Agent & Exporter',
//     address:      'Agricultural Market Yard, Tadipatri, Andhra Pradesh, India.',
//     reportLabel:  'Buyer Report',
//     pattiPrefix:  'Patti:',
//     subBags:      'Sub Bags',
//     subTotal:     'Sub Total',
//     totalBags:    'Total Bags',
//     totalAmount:  'Total Amount',
//     discount:     'Discount 3%',
//     finalAmount:  'Final Amount',
//     thankYou:     'Thank You',
//     visitAgain:   'Visit Again',
//   },
//   te: {
//     title:        'NKV Bombay Lemon Traders',
//     subTitle:     'Lemon Merchant, Commission Agent & Exporter',
//     address:      'Agricultural Market Yard, Tadipatri, Andhra Pradesh, India.',
//     reportLabel:  'కొనుగోలుదారుల నివేదిక',
//     pattiPrefix:  'పట్టి:',
//     subBags:      'ఉప సంచులు',
//     subTotal:     'ఉప మొత్తం',
//     totalBags:    'మొత్తం సంచులు',
//     totalAmount:  'మొత్తం మొత్తం',
//     discount:     'డిస్కౌంట్ 3%',
//     finalAmount:  'చివరి మొత్తం',
//     thankYou:     'ధన్యవాదాలు',
//     visitAgain:   'Visit Again',
//   },
// }

// // ── DATE FORMAT ─────────────────────────────────────────────────────────────
// function formatDate(dateStr?: string): string {
//   if (!dateStr) return ''
//   const [y, m, d] = dateStr.split('-')
//   return `${d}-${m}-${y}`
// }

// // ── MAIN FUNCTION ───────────────────────────────────────────────────────────
// export function printBuyerThermal(
//   buyerName: string,
//   rows: any[],
//   filters: { from?: string; to?: string },
//   lang: PrintLang = 'en'
// ) {
//   const L = LABELS[lang]

//   // ── Group rows by patti_name ────────────────────────────────────────────
//   const grouped: Record<string, any[]> = {}
//   rows.forEach(r => {
//     if (!grouped[r.patti_name]) grouped[r.patti_name] = []
//     grouped[r.patti_name].push(r)
//   })

//   let totalBags   = 0
//   let totalAmount = 0

//   // ── Header block ───────────────────────────────────────────────────────
//   let content = `
//     <div class="receipt">

//       <div class="center bold">NKV Bombay Lemon Traders</div>
//       <div class="center small">${L.subTitle}</div>
//       <div class="center small">${L.address}</div>

//       <div class="line"></div>

//       <div class="item">
//         <div>
//           <div class="bold">Sonu</div>
//           <div>7013285158</div>
//           <div>7893287215</div>
//         </div>
//         <div style="text-align:right">
//           <div class="bold">Bujji</div>
//           <div>8639826163</div>
//         </div>
//       </div>

//       <div class="line"></div>

//       <div class="center small">${L.reportLabel}</div>
//       <div class="center bold">${buyerName}</div>
//       <div class="center small">${formatDate(filters.from)} - ${formatDate(filters.to)}</div>

//       <div class="line"></div>
//   `

//   // ── Per-patti blocks ───────────────────────────────────────────────────
//   Object.entries(grouped).forEach(([patti, items]) => {
//     let subBags   = 0
//     let subAmount = 0

//     content += `<div class="bold">${L.pattiPrefix} ${patti}</div>`

//     items.forEach(r => {
//       const bags   = Number(r.bags   || 0)
//       const rate   = Number(r.rate   || 0)
//       const amount = Number(r.amount || 0)

//       subBags   += bags
//       subAmount += amount

//       // Date shown only in English mode for cleaner Telugu receipts
//       const datePart = lang === 'en'
//         ? `<span class="muted">${formatDate(r.date)}</span> `
//         : ''

//       content += `
//         <div class="item">
//           <span>${r.item_name}    ${bags} x ${rate}</span>
//           <span>Rs.${amount}</span>
//         </div>
//       `
//     })

//     totalBags   += subBags
//     totalAmount += subAmount

//     content += `
//       <div class="line"></div>
//       <div class="item bold">
//         <span>${L.subBags}</span>
//         <span>${subBags}</span>
//       </div>
//       <div class="item">
//         <span>${L.subTotal}</span>
//         <span>Rs.${subAmount}</span>
//       </div>
//       <div class="line"></div>
//     `
//   })

//   // ── Grand total block ──────────────────────────────────────────────────
//   // const discount    = totalAmount * 0.03
//   // const finalAmount = totalAmount - discount

  
//   // 1️⃣ Discount (fair rounding)
//   const discount = Math.round(totalAmount * 0.03)
  
//   // 2️⃣ Final amount (slight business gain)
//   const finalAmount = Math.ceil(totalAmount - discount)
  

//   content += `
//     <div class="item bold">
//       <span>${L.totalBags}</span>
//       <span>${totalBags}</span>
//     </div>
//     <div class="item bold">
//       <span>${L.totalAmount}</span>
//       <span>Rs.${totalAmount}</span>
//     </div>
//     <div class="item">
//       <span>${L.discount}</span>
//       <span>-Rs.${discount.toFixed(0)}</span>
//     </div>
//     <div class="item bold">
//       <span>${L.finalAmount}</span>
//       <span>Rs.${finalAmount.toFixed(0)}</span>
//     </div>

//     <div class="line"></div>

//     <div class="center small">${L.thankYou}</div>
//     <div class="center small">${L.visitAgain}</div>

//     <div class="line"></div>

//     <div class="center small" style="font-size:7px;">
//       Developed by RukmanWebSolutions
//     </div>

//     </div>
//   `

//   // ── Open print window ──────────────────────────────────────────────────
//   const win = window.open('', '', 'width=320,height=640')
//   if (!win) return

//   // Choose font: Telugu needs a system font that supports Telugu glyphs
//   const fontFamily = lang === 'te'
//     ? `'Noto Sans Telugu', 'Gautami', 'Vani', monospace`
//     : `monospace`

//   win.document.write(`
//     <html>
//       <head>
//         <title>Print — ${buyerName}</title>
//         ${lang === 'te'
//           ? `<link rel="preconnect" href="https://fonts.googleapis.com">
//              <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu&display=swap" rel="stylesheet">`
//           : ''}
//         <style>
//           @page {
//             size: 80mm auto;
//             margin: 0;
//           }

//           body {
//             margin: 0;
//             font-family: ${fontFamily};
//           }

//           .receipt {
//             width: 72mm;
//             padding: 3mm;
//             font-size: 10px;
//           }

//           .center  { text-align: center; }
//           .bold    { font-weight: bold; }
//           .small   { font-size: 8px; }
//           .muted   { color: #555; font-size: 8px; }

//           .item {
//             display: flex;
//             justify-content: space-between;
//             white-space: nowrap;
//             font-size: 10px;
//           }

//           .line {
//             border-top: 1px dashed black;
//             margin: 2px 0;
//           }
//         </style>
//       </head>
//       <body onload="window.print(); window.close();">
//         ${content}
//       </body>
//     </html>
//   `)

//   win.document.close()
// }



// src/lib/print-thermal.ts
//
// Printing strategy:
//   English → ESC/POS raw bytes → POST /api/print-raw → PHP TCP → printer
//             No browser dialog, works on Mac & Windows identically.
//   Telugu  → window.print() popup fallback (ESC/POS cannot render Telugu
//             Unicode without custom firmware fonts loaded into the printer).
//
//   If the /api/print-raw endpoint is unreachable (e.g. running on Hostinger
//   where the server cannot reach the local LAN printer), it automatically
//   falls back to window.print() for English as well.

import { EscPos, sendToWifi } from './print-escpos'

export type PrintLang = 'en' | 'te'

// ── LABEL SETS ─────────────────────────────────────────────────────────────
const LABELS = {
  en: {
    title:        'NKV Bombay Lemon Traders',
    subTitle:     'Lemon Merchant, Commission Agent & Exporter',
    address:      'Agri Market Yard, Tadipatri, Andhra Pradesh.',
    reportLabel:  'Buyer Report',
    pattiPrefix:  'Patti:',
    subBags:      'Sub Bags',
    subTotal:     'Sub Total',
    totalBags:    'Total Bags',
    totalAmount:  'Total Amount',
    discount:     'Discount 3%',
    finalAmount:  'Final Amount',
    thankYou:     'Thank You!  Visit Again.',
  },
  te: {
    title:        'NKV Bombay Lemon Traders',
    subTitle:     'Lemon Merchant, Commission Agent & Exporter',
    address:      'Agricultural Market Yard, Tadipatri, Andhra Pradesh, India.',
    reportLabel:  'కొనుగోలుదారుల నివేదిక',
    pattiPrefix:  'పట్టి:',
    subBags:      'ఉప సంచులు',
    subTotal:     'ఉప మొత్తం',
    totalBags:    'మొత్తం సంచులు',
    totalAmount:  'మొత్తం మొత్తం',
    discount:     'డిస్కౌంట్ 3%',
    finalAmount:  'చివరి మొత్తం',
    thankYou:     'ధన్యవాదాలు — Visit Again',
  },
}

// ── DATE FORMAT ─────────────────────────────────────────────────────────────
function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}-${m}-${y}`
}

// ── ESC/POS BUILD ────────────────────────────────────────────────────────────
function buildEscPosReceipt(
  buyerName: string,
  rows: any[],
  filters: { from?: string; to?: string }
): Uint8Array {
  const L = LABELS['en']  // ESC/POS is English only

  // Group by patti
  const grouped: Record<string, any[]> = {}
  rows.forEach(r => {
    if (!grouped[r.patti_name]) grouped[r.patti_name] = []
    grouped[r.patti_name].push(r)
  })

  let totalBags   = 0
  let totalAmount = 0

  const p = new EscPos()
  p.init()

  // ── Header ───────────────────────────────────────────────────────────────
  p.alignCenter()
  p.bold(true).big(true)
  p.line('NKV BOMBAY LEMON')
  p.line('TRADERS')
  p.big(false)
  p.line(L.subTitle)
  p.line(L.address)
  p.bold(false)
  p.sep()

  // Contacts
  p.alignLeft()
  p.row('Sonu: 7013285158', 'Bujji: 8639826163')
  p.line('       7893287215')
  p.sep()

  // Report title
  p.alignCenter()
  p.line(L.reportLabel)
  p.bold(true).line(buyerName).bold(false)
  p.line(`${formatDate(filters.from)} to ${formatDate(filters.to)}`)
  p.sep()

  // ── Per-patti sections ────────────────────────────────────────────────────
  p.alignLeft()
  Object.entries(grouped).forEach(([patti, items]) => {
    let subBags   = 0
    let subAmount = 0

    p.bold(true).line(`${L.pattiPrefix} ${patti}`).bold(false)

    items.forEach(r => {
      const bags   = Number(r.bags   || 0)
      const rate   = Number(r.rate   || 0)
      const amount = Number(r.amount || 0)
      subBags   += bags
      subAmount += amount

      const left  = `${r.item_name}  ${bags}x${rate}`
      const right = `Rs.${amount}`
      p.row(left, right)
    })

    totalBags   += subBags
    totalAmount += subAmount

    p.sep()
    p.row(L.subBags,  String(subBags))
    p.row(L.subTotal, `Rs.${subAmount}`)
    p.sep()
  })

  // ── Grand total ───────────────────────────────────────────────────────────
  const discount    = Math.round(totalAmount * 0.03)
  const finalAmount = Math.ceil(totalAmount - discount)

  p.bold(true)
  p.row(L.totalBags,   String(totalBags))
  p.row(L.totalAmount, `Rs.${totalAmount}`)
  p.bold(false)
  p.row(L.discount,    `-Rs.${discount}`)
  p.bold(true)
  p.row(L.finalAmount, `Rs.${finalAmount}`)
  p.bold(false)

  p.sep()
  p.alignCenter()
  p.line(L.thankYou)
  p.line('Developed by RukmanWebSolutions')
  p.feed(4)
  p.cut()

  return p.build()
}

// ── WINDOW.PRINT FALLBACK ─────────────────────────────────────────────────
// Used when:  (a) lang === 'te'  or  (b) ESC/POS WiFi send failed.
// Fixes the Mac popup-close-before-print bug from the old version.

function safePrint(win: Window, delayMs = 600): void {
  win.focus()
  setTimeout(() => {
    win.print()
    win.onafterprint = () => { try { win.close() } catch (_) {} }
    setTimeout(() => { try { if (!win.closed) win.close() } catch (_) {} }, 2000)
  }, delayMs)
}

function printViaPopup(
  buyerName: string,
  rows: any[],
  filters: { from?: string; to?: string },
  lang: PrintLang
): void {
  // Must open popup synchronously (direct click-event context).
  // On Mac, opening inside a Promise drops the user-gesture and is blocked.
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

  let totalBags   = 0
  let totalAmount = 0

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
    let subBags   = 0
    let subAmount = 0
    content += `<div class="bold">${L.pattiPrefix} ${patti}</div>`
    items.forEach(r => {
      const bags   = Number(r.bags   || 0)
      const rate   = Number(r.rate   || 0)
      const amount = Number(r.amount || 0)
      subBags   += bags
      subAmount += amount
      content += `<div class="item"><span>${r.item_name} ${bags}x${rate}</span><span>Rs.${amount}</span></div>`
    })
    totalBags   += subBags
    totalAmount += subAmount
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
    ? `'Noto Sans Telugu', 'Gautami', 'Vani', monospace`
    : `monospace`

  win.document.write(`
    <html>
      <head>
        <title>Print — ${buyerName}</title>
        ${lang === 'te'
          ? `<link rel="preconnect" href="https://fonts.googleapis.com">
             <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu&display=swap" rel="stylesheet">`
          : ''}
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { margin: 0; font-family: ${fontFamily}; }
          .receipt { width: 72mm; padding: 3mm; font-size: 10px; }
          .center { text-align: center; }
          .bold   { font-weight: bold; }
          .small  { font-size: 8px; }
          .item   { display: flex; justify-content: space-between; white-space: nowrap; font-size: 10px; }
          .line   { border-top: 1px dashed black; margin: 2px 0; }
          @media print { @page { margin: 0; } }
        </style>
      </head>
      <body>${content}</body>
    </html>
  `)
  win.document.close()
  safePrint(win, lang === 'te' ? 1200 : 600)
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────
export async function printBuyerThermal(
  buyerName: string,
  rows: any[],
  filters: { from?: string; to?: string },
  lang: PrintLang = 'en'
): Promise<void> {

  // Telugu always uses window.print() — ESC/POS can't render Telugu Unicode
  if (lang === 'te') {
    printViaPopup(buyerName, rows, filters, lang)
    return
  }

  // English: try ESC/POS WiFi first ─────────────────────────────────────────
  const apiBase = (import.meta.env.VITE_API_BASE as string) || '/api'
  const bytes   = buildEscPosReceipt(buyerName, rows, filters)
  const ok      = await sendToWifi(bytes, apiBase)

  if (!ok) {
    // Backend unreachable (Hostinger cloud, printer offline) → popup
    console.info('[print] ESC/POS unavailable — using window.print() fallback')
    printViaPopup(buyerName, rows, filters, lang)
  }
  // else: silent success — printer already printed
}
