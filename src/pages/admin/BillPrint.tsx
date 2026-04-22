import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { api, Bill, formatCurrency, formatDate } from '../../lib/api'
import logo from '../../assets/nkv-logo.png'

/* ───────── TYPES ───────── */
type ExpenseKey = 'commission' | 'cooli' | 'chariti' | 'transport'

/* ───────── LABELS ───────── */
const EN = {
  title: 'NKV Bombay Lemon Traders',
  sub: 'Lemon Merchant · Commission Agent · Exporter',
  address: 'Agricultural Market Yard, Tadipatri, Andhra Pradesh, India.',
  contact1: 'SONU',
  contact2: 'BUJJI',
  item: 'Item', bags: 'Bags', rate: 'Rate', total: 'Total',
  commission: 'Commission', cooli: 'Cooli', chariti: 'Chariti',
  transport: 'Transport', totalExp: 'Total Expensives',patti_name: 'Patti Name', date: 'Date', serial_number: 'Serial Number',
}

const TE = {
  title: 'NKV Bombay Lemon Traders',
  sub: 'లెమన్ వ్యాపారి',
  address: 'వ్యవసాయ మార్కెట్ యార్డ్, తాడిపత్రి, ఆంధ్ర ప్రదేశ్, ఇండియా.',
  contact1: 'సోను',
  contact2: 'బుజ్జి',
  item: 'వస్తువు', bags: 'బస్తాలు', rate: 'రేటు', total: 'మొత్తం',
  commission: 'కమీషన్', cooli: 'కూలీ', chariti: 'చారిటీ',
  transport: 'రవాణా', totalExp: 'మొత్తం ఖర్చులు',patti_name: 'పట్టి పేరు', date: 'తేదీ', serial_number: 'సీరియల్ నంబర్',
}

/* ───────── MAIN COMPONENT ───────── */
export default function BillPrint() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const lang = searchParams.get('lang') || 'en'
  const L = lang === 'te' ? TE : EN

  const [bill, setBill] = useState<Bill | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const billId = Number(id)

    if (!id || Number.isNaN(billId)) {
      setBill(null)
      setError('Invalid bill id.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    api.getBill(billId)
      .then((data) => {
        setBill(data)
      })
      .catch((err: unknown) => {
        setBill(null)
        setError(err instanceof Error ? err.message : 'Failed to load bill.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    if (!bill) return

    // macOS requires window.focus() before window.print().
    // 800ms gives the logo image time to load fully on Mac.
    const timer = window.setTimeout(() => { window.focus(); window.print() }, 800)
    return () => window.clearTimeout(timer)
  }, [bill])

  if (loading) {
    return <div className="p-4 text-center text-sm text-gray-500">Loading bill...</div>
  }

  if (error) {
    return <div className="p-4 text-center text-sm text-red-600">{error}</div>
  }

  if (!bill) {
    return <div className="p-4 text-center text-sm text-gray-500">Bill not found.</div>
  }

  /* ───────── CALCULATIONS ───────── */
  const expenseKeys: ExpenseKey[] = ['commission','cooli','chariti','transport']
  const items = bill.items ?? []

  const totalExp = expenseKeys.reduce(
    (sum, k) => sum + Number(bill[k] || 0),
    0
  )

  const net = Number((bill.total_amount - totalExp).toFixed(2))

  return (
    <div className="p-4">
      <div className="border p-2 mx-auto relative" style={{ width: '72mm' }}>

        {/* ───── WATERMARK ───── */}
        <div className="absolute inset-0 flex justify-center items-center opacity-10 pointer-events-none">
          <img src={logo} alt="" className="w-28 rotate-[-20deg]" />
        </div>

        {/* ───── HEADER ───── */}
        <div className="text-center border-b pb-2">

          <img src={logo} alt="NKV logo" className="w-16 mx-auto mb-1" />

          <div className="font-bold">{L.title}</div>
          <div className="text-[10px]">{L.sub}</div>
          <div className="text-[9px] mt-1">{L.address}</div>

          {/* CONTACT GRID */}
          <div className="grid grid-cols-2 text-[10px] mt-1">
            <div>
              <div className="font-semibold">{L.contact1}</div>
              <div>7013285158</div>
              <div>7893287215</div>
            </div>
            <div>
              <div className="font-semibold">{L.contact2}</div>
              <div>8639826163</div>
            </div>
          </div>
        </div>

        <table className="w-full text-[10px] mt-2">
          <tbody>
            <tr>
              <td><span className="font-semibold">{L.patti_name}:</span> {bill.patti_name}</td>
              <td className="text-right"><span className="font-semibold">{L.date}:</span> {formatDate(bill.date)}</td>
            </tr>
            <tr>
              <td><span className="font-semibold">{L.serial_number}:</span> {bill.serial_number}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        {/* ───── TABLE ───── */}
        <table className="w-full text-[10px] mt-2">
          <thead>
            <tr className="border-b">
              <th>No</th>
              <th>{L.item}</th>
              <th className="text-right">{L.bags}</th>
              <th className="text-right">{L.rate}</th>
              <th className="text-right">{L.total}</th>
            </tr>
          </thead>

          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{it.item_name}</td>
                <td className="text-right">{it.bags}</td>
                <td className="text-right tabular-nums">
                  {formatCurrency(it.rate)}
                </td>
                <td className="text-right font-semibold tabular-nums">
                  {formatCurrency(it.total ?? it.bags * it.rate)}
                </td>
              </tr>
            ))}

            {/* TOTAL ROW */}
            <tr className="border-t">
              <td></td>
              <td className="font-bold">Total</td>
              <td className="text-right font-bold">{bill.total_bags}</td>
              <td></td>
              <td className="text-right font-bold tabular-nums">
                {formatCurrency(bill.total_amount)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="border-t my-2"></div>

        {/* ───── EXPENSES ───── */}
        {expenseKeys.map((k) => (
          Number(bill[k]) > 0 && (
            <div key={k} className="flex justify-between text-[11px]">
              <span>(-) {L[k]}</span>
              <span className="tabular-nums">
                {formatCurrency(bill[k])}
              </span>
            </div>
          )
        ))}

        {/* TOTAL EXP */}
        <div className="border-t mt-1 flex justify-between font-semibold">
          <span>(-) {L.totalExp}</span>
          <span className="tabular-nums">
            {formatCurrency(totalExp)}
          </span>
        </div>

        <div className="border mb-1"></div>

        {/* ───── FINAL BILL ───── */}
        <div className="text-center font-bold mt-2">
          {lang === 'te' ? 'తుది బిల్లు' : 'FINAL BILL'}
        </div>

        <div className="border mb-1"></div>

        <div className="border p-2 text-[11px]">

          <div className="flex justify-between">
            <span>Total Amount</span>
            <span className="tabular-nums">
              {formatCurrency(bill.total_amount)}
            </span>
          </div>

          <div className="flex justify-between">
            <span>(-) Expensives</span>
            <span className="tabular-nums">
              {formatCurrency(totalExp)}
            </span>
          </div>

          <div className="border-t my-1"></div>

          <div className="flex justify-between font-bold text-[13px]">
            <span>Final Amount</span>
            <span className="tabular-nums">
              {formatCurrency(net)}
            </span>
          </div>

        </div>

        {/* FOOTER */}
          <div className="text-center text-[10px] mt-4 pt-2 border-t border-gray-300 text-gray-500">
            Developed by Rukmanwebsolutions
            <div className="mt-1 inline-block text-gray-700 font-semibold relative">
            </div>
          </div>
      </div>
    </div>
  )
}
