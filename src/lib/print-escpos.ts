// src/lib/print-escpos.ts
// ESC/POS byte builder — shared by print-thermal.ts and print-serial.ts.
// No server required. Bytes are sent straight from the browser via WebUSB.

const ESC = 0x1b
const GS  = 0x1d
const LF  = 0x0a

export const CMD = {
  INIT:         [ESC, 0x40],
  ALIGN_LEFT:   [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT:  [ESC, 0x61, 0x02],
  BOLD_ON:      [ESC, 0x45, 0x01],
  BOLD_OFF:     [ESC, 0x45, 0x00],
  DOUBLE_ON:    [ESC, 0x21, 0x10],   // double-height
  DOUBLE_OFF:   [ESC, 0x21, 0x00],
  FEED:         (n: number) => [ESC, 0x64, n],
  CUT:          [GS,  0x56, 0x41, 0x10],  // feed + partial cut
}

// 80 mm printer at standard font = 48 printable columns
export const COLS = 48

export class EscPos {
  private buf: number[] = []

  init()            { return this.push(CMD.INIT) }
  alignLeft()       { return this.push(CMD.ALIGN_LEFT) }
  alignCenter()     { return this.push(CMD.ALIGN_CENTER) }
  bold(on: boolean) { return this.push(on ? CMD.BOLD_ON  : CMD.BOLD_OFF) }
  big(on: boolean)  { return this.push(on ? CMD.DOUBLE_ON : CMD.DOUBLE_OFF) }
  feed(n = 1)       { return this.push(CMD.FEED(n)) }
  cut()             { return this.push(CMD.CUT) }

  text(s: string) {
    for (let i = 0; i < s.length; i++) this.buf.push(s.charCodeAt(i) & 0xff)
    return this
  }
  line(s = '') { return this.text(s).push([LF]) }
  sep()        { return this.line('-'.repeat(COLS)) }

  /** Left-aligned text + right-aligned text on the same line */
  row(left: string, right: string, cols = COLS) {
    const gap = cols - left.length - right.length
    return this.line(left + ' '.repeat(Math.max(1, gap)) + right)
  }

  build(): Uint8Array {
    return new Uint8Array(this.buf)
  }

  private push(cmds: number[]) {
    this.buf.push(...cmds)
    return this
  }
}
