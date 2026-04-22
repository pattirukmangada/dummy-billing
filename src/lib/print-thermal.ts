// src/lib/print-thermal.ts
// Direct ESC/POS thermal printing via WebUSB.
// No window.print() fallback — if WebUSB is unavailable, shows a clear
// error message telling the user to open Chrome.

import { EscPos } from './print-escpos'
import { sendToUsb, isWebUsbSupported } from './print-usb'

export type PrintLang = 'en' | 'te'

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

// ── ESC/POS receipt builder ────────────────────────────────────────────────
function buildReceipt(
  buyerName: string,
  rows: any[],
  filters: { from?: string; to?: string },
  lang: PrintLang
): Uint8Array {
  // Telugu text cannot be rendered by ESC/POS (no Unicode support in firmware).
  // We print the English labels + transliterated values for Telugu mode.
  const L = LABELS[lang === 'te' ? 'en' : 'en']  // always English for ESC/POS

  const grouped: Record<string, any[]> = {}
  rows.forEach(r => {
    if (!grouped[r.patti_name]) grouped[r.patti_name] = []
    grouped[r.patti_name].push(r)
  })

  let totalBags = 0, totalAmount = 0
  const p = new EscPos()
  p.init()

  // Header
  p.alignCenter().bold(true).big(true)
  p.line('NKV BOMBAY LEMON').line('TRADERS')
  p.big(false)
  p.line(L.subTitle)
  p.line(L.address)
  p.bold(false).sep()

  // Contacts
  p.alignLeft()
  p.row('Sonu: 7013285158', 'Bujji: 8639826163')
  p.line('       7893287215')
  p.sep()

  // Report info
  p.alignCenter()
  p.line(L.reportLabel)
  p.bold(true).line(buyerName).bold(false)
  p.line(`${formatDate(filters.from)} to ${formatDate(filters.to)}`)
  p.sep()

  // Per-patti sections
  p.alignLeft()
  Object.entries(grouped).forEach(([patti, items]) => {
    let subBags = 0, subAmount = 0
    p.bold(true).line(`${L.pattiPrefix} ${patti}`).bold(false)

    items.forEach(r => {
      const bags = Number(r.bags || 0)
      const rate = Number(r.rate || 0)
      const amount = Number(r.amount || 0)
      subBags += bags; subAmount += amount
      p.row(`${r.item_name}  ${bags}x${rate}`, `Rs.${amount}`)
    })
    totalBags += subBags; totalAmount += subAmount

    p.sep()
    p.row(L.subBags, String(subBags))
    p.row(L.subTotal, `Rs.${subAmount}`)
    p.sep()
  })

  // Grand total
  const discount    = Math.round(totalAmount * 0.03)
  const finalAmount = Math.ceil(totalAmount - discount)

  p.bold(true).row(L.totalBags, String(totalBags))
  p.row(L.totalAmount, `Rs.${totalAmount}`).bold(false)
  p.row(L.discount, `-Rs.${discount}`)
  p.bold(true).row(L.finalAmount, `Rs.${finalAmount}`).bold(false)

  p.sep().alignCenter()
  p.line(L.thankYou)
  p.line('Developed by RukmanWebSolutions')
  p.feed(4).cut()

  return p.build()
}

// ── Show error to user ────────────────────────────────────────────────────
function showError(message: string): void {
  // Uses a simple alert so no UI dependency is needed.
  // You can replace this with your own toast/modal if preferred.
  alert(`Print Error\n\n${message}`)
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────
// Usage in your component:
//
//   <button onClick={() => printBuyerThermal(buyerName, rows, filters, lang)}>
//     Print
//   </button>
//
// Returns true if print succeeded, false if it failed (error already shown).

export async function printBuyerThermal(
  buyerName: string,
  rows: any[],
  filters: { from?: string; to?: string },
  lang: PrintLang = 'en'
): Promise<boolean> {

  if (!isWebUsbSupported()) {
    showError(
      'Direct USB printing requires Chrome or Edge.\n\n' +
      'Safari does not support WebUSB.\n' +
      'Please open this website in Chrome to print directly to the thermal printer.'
    )
    return false
  }

  const bytes  = buildReceipt(buyerName, rows, filters, lang)
  const result = await sendToUsb(bytes)

  if (!result.ok) {
    if (result.reason !== 'no_device') {
      // 'no_device' = user cancelled picker — silent, no alert needed
      showError(result.message)
    }
    return false
  }

  return true
}
