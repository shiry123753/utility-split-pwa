import { useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, updateDoc, writeBatch } from 'firebase/firestore'
import { db, COL } from '../firebase/config'
import { useMonths } from '../hooks/useMonths'
import { FEES, MEMBERS, PAYER_NAME, SEED_MONTHS } from '../data/constants'
import { splitMonth, monthTotal, fmt } from '../utils/split'

function monthLabel(id) {
  const [y, m] = id.split('-')
  return `${y}.${Number(m)}`
}

export default function Dashboard() {
  const { months, loading } = useMonths()
  const [selected, setSelected] = useState(null)
  const [seeding, setSeeding] = useState(false)

  if (loading) return <p className="hint">載入中…</p>

  // 首次使用：一鍵匯入歷史資料
  if (months.length === 0) {
    const importSeed = async () => {
      setSeeding(true)
      try {
        const batch = writeBatch(db)
        for (const [id, fees] of Object.entries(SEED_MONTHS)) {
          batch.set(doc(db, COL.months, id), { fees, paid: {} })
        }
        await batch.commit()
      } catch (e) {
        console.error(e)
        alert('匯入失敗：' + e.message)
        setSeeding(false)
      }
    }
    return (
      <section className="card empty-card">
        <p className="kicker">FIRST RUN</p>
        <h2>還沒有資料</h2>
        <p className="hint">一鍵匯入 2025.3 – 2026.7 的歷史帳單，之後每月再手動新增。</p>
        <button className="btn-primary" onClick={importSeed} disabled={seeding}>
          {seeding ? '匯入中…' : '匯入歷史資料'}
        </button>
      </section>
    )
  }

  const current = months.find((m) => m.id === selected) || months[0]
  const split = splitMonth(current.id, current.fees)
  const activeMembers = MEMBERS.filter((m) => current.id >= m.from)
  const nUtility = activeMembers.filter((m) => m.groups.includes('utility')).length

  const togglePaid = async (memberId) => {
    const next = !current.paid[memberId]
    await updateDoc(doc(db, COL.months, current.id), { [`paid.${memberId}`]: next })
  }

  const feeRows = FEES.filter((f) => Number(current.fees[f.key]) > 0)

  return (
    <>
      {/* 月份選擇 */}
      <div className="month-row">
        <p className="kicker">MONTH · 月份</p>
        <select value={current.id} onChange={(e) => setSelected(e.target.value)}>
          {months.map((m) => (
            <option key={m.id} value={m.id}>{monthLabel(m.id)}</option>
          ))}
        </select>
      </div>

      {/* 當月費用 */}
      <section className="card">
        <div className="card-head">
          <h2>{monthLabel(current.id)} 費用</h2>
          <Link to={`/edit/${current.id}`} className="edit-link">編輯</Link>
        </div>
        {feeRows.length === 0 && <p className="hint">本月尚未輸入任何費用</p>}
        {feeRows.map((f) => (
          <div key={f.key} className="fee-row">
            <span>{f.label}</span>
            <span className="serif">$ {fmt(current.fees[f.key])}</span>
          </div>
        ))}
        <div className="fee-row total">
          <span>合計</span>
          <span className="serif">$ {fmt(monthTotal(current.fees))}</span>
        </div>
        <p className="hint">
          管理費・網路費由三人平分；水電瓦斯由 {nUtility} 人平分（{PAYER_NAME}為出資人不分攤）
        </p>
      </section>

      {/* 每人應付 + 收款狀態 */}
      <p className="kicker section-label">SPLIT · 每人應付</p>
      {activeMembers.map((m) => {
        const { net } = split[m.id]
        const isPaid = !!current.paid[m.id]
        const owed = net < -0.5 // 賴覺生代墊管理費後，多數月份是應收回
        return (
          <div key={m.id} className={`member-row${isPaid ? ' paid' : ''}`}>
            <div>
              <span className="member-name">{m.name}</span>
              {m.prepaysMgmt && Number(current.fees.mgmt) > 0 && (
                <span className="member-note">已代墊管理費 $ {fmt(current.fees.mgmt)}</span>
              )}
            </div>
            <div className="member-right">
              <span className={`serif amount${owed ? ' owed' : ''}`}>
                {owed ? `應退 $ ${fmt(net)}` : `$ ${fmt(net)}`}
              </span>
              <button className={`paid-btn${isPaid ? ' on' : ''}`} onClick={() => togglePaid(m.id)}>
                {isPaid ? (owed ? '已退款' : '已收款') : (owed ? '未退款' : '未收款')}
              </button>
            </div>
          </div>
        )
      })}
    </>
  )
}
