// src/lib/print-serial.ts
// Serial print via direct WebUSB ESC/POS. Chrome/Edge only.

import { EscPos } from './print-escpos'
import { sendToUsb, isWebUsbSupported } from './print-usb'

function buildEscPos(rows: any[]): Uint8Array {
  const total = Math.round(
    rows.reduce((s, r) => s + Number(r.net_amount || 0), 0)
  )

  const p = new EscPos()
  p.init()
  p.alignCenter().bold(true).big(true)
  p.line('NKV BOMBAY').line('LEMON TRADERS')
  p.big(false).line('Serial Print').bold(false)
  p.sep()
  p.alignLeft()

  rows.forEach(r => {
    p.row(
      `${r.patti_name} #${r.serial_number}`,
      `Rs.${Number(r.net_amount || 0).toFixed(0)}`
    )
  })

  p.sep()
  p.bold(true).row('TOTAL', `Rs.${total}`).bold(false)
  p.feed(4).cut()
  return p.build()
}

function showError(message: string): void {
  alert(`Print Error\n\n${message}`)
}

// Returns true on success, false on failure (error already shown).
export async function printSerialThermal(rows: any[]): Promise<boolean> {
  if (!isWebUsbSupported()) {
    showError(
      'Direct USB printing requires Chrome or Edge.\n\n' +
      'Safari does not support WebUSB.\n' +
      'Please open this website in Chrome to print directly to the thermal printer.'
    )
    return false
  }

  const bytes  = buildEscPos(rows)
  const result = await sendToUsb(bytes)

  if (!result.ok) {
    if (result.reason !== 'no_device') showError(result.message)
    return false
  }

  return true
}
