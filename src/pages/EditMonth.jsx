import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, setDoc, deleteDoc } from 'firebase/firestore'
import { db, COL } from '../firebase/config'
import { useMonths } from '../hooks/useMonths'
import { FEES, MGMT_FEE, DEFAULT_PAID_BY } from '../data/constants'

// 沒帶月份參數時（新增模式），預設帶出「最新月份的下一個月」
function nextMonth(id) {
  const [y, m] = id.split('-').map(Number)
  const d = new Date(y, m, 1) // m 已是下個月（Date 月份 0-based）
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function EditMonth() {
  const { monthId } = useParams()
  const navigate = useNavigate()
  const { months, loading } = useMonths()
  const [monthInput, setMonthInput] = useState(monthId || '')
  const [values, setValues] = useState(null)
  const [saving, setSaving] = useState(false)

  if (loading) return <p className="hint">載入中…</p>

  const isEdit = !!monthId
  const defaultMonth = monthId || (months[0] ? nextMonth(months[0].id) : '2026-08')
  const month = monthInput || defaultMonth
  // 依實際要儲存的月份查既有資料，新增模式選到已存在的月份時才不會蓋掉 paid/settled
  const existing = months.find((m) => m.id === month) || null

  // 表單初值：編輯帶原值；新增預設帶固定管理費
  const initial = {}
  for (const f of FEES) {
    initial[f.key] = existing?.fees?.[f.key] ?? (f.key === 'mgmt' && !isEdit ? MGMT_FEE : '')
  }
  const form = values || initial

  const setField = (key, v) => setValues({ ...form, [key]: v })

  const save = async () => {
    if (!month) return alert('請選擇月份')
    const fees = {}
    const paidBy = {}
    const settled = {}
    for (const f of FEES) {
      const n = Number(form[f.key])
      if (n > 0) {
        fees[f.key] = n
        paidBy[f.key] = DEFAULT_PAID_BY[f.key] // 記錄這筆錢的收款人
        settled[f.key] = existing?.settled?.[f.key] ?? false // 新費用預設未結清
      }
    }
    setSaving(true)
    try {
      // 整份覆寫（保留 paid），清空的費用才會真的被移除
      await setDoc(doc(db, COL.months, month), { fees, paidBy, settled, paid: existing?.paid || {} })
      navigate('/')
    } catch (e) {
      console.error(e)
      alert('儲存失敗：' + e.message)
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!confirm(`確定要刪除 ${month} 整個月的資料嗎？`)) return
    await deleteDoc(doc(db, COL.months, month))
    navigate('/')
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>{isEdit ? '編輯月份' : '新增月份'}</h2>
      </div>

      <label className="field">
        <span className="kicker">月份</span>
        <input
          type="month"
          value={month}
          disabled={isEdit}
          onChange={(e) => setMonthInput(e.target.value)}
        />
      </label>

      {FEES.map((f) => (
        <label key={f.key} className="field">
          <span className="kicker">
            {f.label}<span className="payer-chip">{DEFAULT_PAID_BY[f.key]}收款</span>
          </span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="0（留空 = 本月無此費用）"
            value={form[f.key]}
            onChange={(e) => setField(f.key, e.target.value)}
          />
        </label>
      ))}

      <button className="btn-primary" onClick={save} disabled={saving}>
        {saving ? '儲存中…' : '儲存'}
      </button>
      {isEdit && (
        <button className="btn-danger" onClick={remove}>刪除此月份</button>
      )}
    </section>
  )
}
