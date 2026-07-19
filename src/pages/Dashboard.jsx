import { useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, updateDoc, writeBatch } from 'firebase/firestore'
import { db, COL } from '../firebase/config'
import { useMonths } from '../hooks/useMonths'
import { MEMBERS, DEFAULT_PAID_BY, SEED_MONTHS, seedSettled } from '../data/constants'
import { splitMonth, monthTotal, fmt, monthLabel, netSettlement } from '../utils/split'

// 點擊切換某筆費用的結清狀態（demo 模式不寫入）
async function toggleSettled(monthId, feeKey, cur, demo) {
  if (demo) return
  await updateDoc(doc(db, COL.months, monthId), { [`settled.${feeKey}`]: !cur })
}

// 未結清 / 已結清 標籤（可點擊切換）
function SettledChip({ mo, feeKey, demo }) {
  const on = !!mo.settled[feeKey]
  return (
    <button
      className={`settled-chip${on ? ' on' : ''}`}
      onClick={() => toggleSettled(mo.id, feeKey, on, demo)}
    >
      {on ? '已結清' : '未結清'}
    </button>
  )
}

export default function Dashboard() {
  const { months, loading, demo } = useMonths()
  const [view, setView] = useState('month') // month = 單月檢視, history = 全部歷史
  const [selected, setSelected] = useState(null)
  const [seeding, setSeeding] = useState(false)

  if (loading) return <p className="hint">載入中…</p>

  // 首次使用：一鍵匯入歷史資料（含每筆費用的先墊付者 paidBy）
  if (months.length === 0) {
    const importSeed = async () => {
      setSeeding(true)
      try {
        const batch = writeBatch(db)
        for (const [id, fees] of Object.entries(SEED_MONTHS)) {
          const paidBy = {}
          const settled = {}
          for (const key of Object.keys(fees)) {
            paidBy[key] = DEFAULT_PAID_BY[key]
            settled[key] = seedSettled(id, key)
          }
          batch.set(doc(db, COL.months, id), { fees, paid: {}, paidBy, settled })
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

  // 目前未結清總金額（所有月份中 settled=false 的費用加總）
  let outstanding = 0
  let outstandingCount = 0
  for (const mo of months) {
    for (const [key, amt] of Object.entries(mo.fees)) {
      if (!mo.settled[key] && Number(amt) > 0) {
        outstanding += Number(amt)
        outstandingCount++
      }
    }
  }

  return (
    <>
      {demo && <p className="hint demo-note">※ 展示模式（?demo）：顯示內建歷史資料，不會寫入資料庫</p>}

      {/* 未結清總額 */}
      {outstandingCount > 0 && (
        <section className="card outstanding-card">
          <div>
            <p className="kicker">OUTSTANDING · 尚未收齊</p>
            <p className="outstanding-note">共 {outstandingCount} 筆費用未分攤結清</p>
          </div>
          <span className="serif outstanding-amt">$ {fmt(outstanding)}</span>
        </section>
      )}

      {/* 檢視切換 */}
      <div className="tabs">
        <button className={`tab${view === 'month' ? ' active' : ''}`} onClick={() => setView('month')}>
          單月檢視
        </button>
        <button className={`tab${view === 'history' ? ' active' : ''}`} onClick={() => setView('history')}>
          全部歷史
        </button>
      </div>

      {view === 'month' ? (
        <MonthView
          months={months}
          selected={selected}
          setSelected={setSelected}
          demo={demo}
        />
      ) : (
        <HistoryView
          months={months}
          openMonth={(id) => { setSelected(id); setView('month') }}
          demo={demo}
        />
      )}
    </>
  )
}

// ── 單月檢視：費用明細 + 每人應付（誰要匯給誰）──────────────────
function MonthView({ months, selected, setSelected, demo }) {
  const current = months.find((m) => m.id === selected) || months[0]
  const { members, details } = splitMonth(current.id, current.fees, current.paidBy)
  const activeMembers = MEMBERS.filter((m) => current.id >= m.from)

  const togglePaid = async (memberId) => {
    if (demo) return
    const next = !current.paid[memberId]
    await updateDoc(doc(db, COL.months, current.id), { [`paid.${memberId}`]: next })
  }

  return (
    <>
      <div className="month-row">
        <p className="kicker">MONTH · 月份</p>
        <select value={current.id} onChange={(e) => setSelected(e.target.value)}>
          {months.map((m) => (
            <option key={m.id} value={m.id}>{monthLabel(m.id)}</option>
          ))}
        </select>
      </div>

      {/* 當月費用明細（含先墊付者） */}
      <section className="card">
        <div className="card-head">
          <h2>{monthLabel(current.id)} 費用</h2>
          <Link to={`/edit/${current.id}`} className="edit-link">編輯</Link>
        </div>
        {details.length === 0 && <p className="hint">本月尚未輸入任何費用</p>}
        {details.map((d) => (
          <div key={d.key} className={`fee-row${current.settled[d.key] ? ' done' : ''}`}>
            <span className="fee-label">
              {d.label}
              <span className="payer-chip">{d.payer}收款</span>
              <SettledChip mo={current} feeKey={d.key} demo={demo} />
            </span>
            <span className="serif">$ {fmt(d.amount)}</span>
          </div>
        ))}
        <div className="fee-row total">
          <span>合計</span>
          <span className="serif">$ {fmt(monthTotal(current.fees))}</span>
        </div>
      </section>

      {/* 本月淨額結算：當月配對互抵後的最終匯款 */}
      <NetBlock months={[current]} title="NET · 本月淨額結算（僅計未結清）" />

      {/* 每人應付：明確列出要匯給誰 */}
      <p className="kicker section-label">SPLIT · 每人應付</p>
      {activeMembers.map((m) => {
        const { toPay, receivable } = members[m.id]
        const isPaid = !!current.paid[m.id]
        const transfers = Object.entries(toPay).filter(([, amt]) => amt > 0.5)
        return (
          <div key={m.id} className={`member-row${isPaid ? ' paid' : ''}`}>
            <div className="member-top">
              <span className="member-name">{m.name}</span>
              <button className={`paid-btn${isPaid ? ' on' : ''}`} onClick={() => togglePaid(m.id)}>
                {isPaid ? '已結清' : '未結清'}
              </button>
            </div>
            <div className="member-transfers">
              {transfers.length === 0 && receivable < 0.5 && (
                <span className="transfer none">本月無需付款</span>
              )}
              {transfers.map(([payee, amt]) => (
                <span key={payee} className="transfer">
                  匯給 {payee} <b className="serif">$ {fmt(amt)}</b>
                </span>
              ))}
              {receivable > 0.5 && (
                <span className="transfer in">
                  收回代墊 <b className="serif">$ {fmt(receivable)}</b>
                </span>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}

// ── 淨額結算:成員配對互抵未結清往來，只看最終誰匯給誰 ──────────
// 單月檢視傳當月一個月、全部歷史傳所有月份，計算共用同一套 netSettlement。
function NetBlock({ months, title }) {
  const pairs = netSettlement(months)
  if (pairs.length === 0) return null
  return (
    <section className="card net-block">
      <p className="kicker">{title}</p>
      {pairs.map((p) => (
        <div key={`${p.from.id}-${p.to.id}`} className="net-row">
          <div className="net-main">
            <span className="net-dir">
              {p.from.name} <span className="net-arrow">→</span> {p.to.name}
            </span>
            <b className="serif net-amt">$ {fmt(p.net)}</b>
          </div>
          <p className="net-formula">
            {p.toOwes > 0
              ? `${p.from.name}應付${p.to.name} $${fmt(p.fromOwes)} − ${p.to.name}應付${p.from.name} $${fmt(p.toOwes)} = $${fmt(p.net)}`
              : `${p.from.name}應付${p.to.name} $${fmt(p.fromOwes)}（無互欠可抵銷）`}
          </p>
        </div>
      ))}
      <p className="hint">※ 把某筆費用標成已結清後，這裡會即時重算。</p>
    </section>
  )
}

// ── 全部歷史檢視:所有月份逐筆列出，方便對帳 ─────────────────────
function HistoryView({ months, openMonth, demo }) {
  return (
    <>
      <NetBlock months={months} title="NET · 淨額結算（全部未結清）" />
      <p className="hint history-hint">
        2025.3 起的完整紀錄，每筆含金額、收款人、分攤人數與每人應付；紅字＝還沒收齊。
        點月份可跳到單月檢視、點標籤可切換結清狀態。
      </p>
      {months.map((mo) => {
        const { details } = splitMonth(mo.id, mo.fees, mo.paidBy)
        return (
          <section key={mo.id} className="card history-card">
            <button className="history-head" onClick={() => openMonth(mo.id)}>
              <h2>{monthLabel(mo.id)}</h2>
              <span className="serif history-total">$ {fmt(monthTotal(mo.fees))}</span>
            </button>
            {details.length === 0 && <p className="hint">（無費用）</p>}
            {details.map((d) => (
              <div key={d.key} className={`history-row${mo.settled[d.key] ? ' done' : ''}`}>
                <div className="history-line1">
                  <span className="fee-label">
                    {d.label}
                    <SettledChip mo={mo} feeKey={d.key} demo={demo} />
                  </span>
                  <span className="serif">$ {fmt(d.amount)}</span>
                </div>
                <div className="history-line2">
                  <span className="payer-chip">{d.payer}收款</span>
                  <span>÷{d.n} 人 → 每人 <b className="serif">$ {fmt(d.each)}</b></span>
                </div>
              </div>
            ))}
          </section>
        )
      })}
    </>
  )
}
