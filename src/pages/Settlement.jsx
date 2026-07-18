import { useMonths } from '../hooks/useMonths'
import { MEMBERS } from '../data/constants'
import { splitMonth, fmt } from '../utils/split'

function monthLabel(id) {
  const [y, m] = id.split('-')
  return `${y}.${Number(m)}`
}

// 個人結算：每位成員跨月累計應付 / 已收 / 未收
export default function Settlement() {
  const { months, loading } = useMonths()
  if (loading) return <p className="hint">載入中…</p>
  if (months.length === 0) return <p className="hint">還沒有資料，請先回首頁匯入。</p>

  const stats = MEMBERS.map((m) => {
    let total = 0
    let collected = 0
    const unpaidMonths = []
    for (const mo of months) {
      if (mo.id < m.from) continue
      const { net } = splitMonth(mo.id, mo.fees)[m.id]
      if (Math.abs(net) < 0.5) continue
      total += net
      if (mo.paid[m.id]) collected += net
      else unpaidMonths.push(mo.id)
    }
    return { ...m, total, collected, outstanding: total - collected, unpaidMonths }
  })

  return (
    <>
      <p className="kicker section-label">SETTLEMENT · 累計結算</p>
      {stats.map((s) => (
        <section key={s.id} className="card member-card">
          <div className="card-head">
            <h2>{s.name}</h2>
            <span className="hint">{s.from.replace('-', '.')} 起</span>
          </div>
          <div className="stat-grid">
            <div>
              <p className="kicker">累計應付</p>
              <p className={`serif stat${s.total < -0.5 ? ' owed' : ''}`}>
                {s.total < -0.5 ? `應退 $ ${fmt(s.total)}` : `$ ${fmt(s.total)}`}
              </p>
            </div>
            <div>
              <p className="kicker">已結清</p>
              <p className="serif stat">$ {fmt(s.collected)}</p>
            </div>
            <div>
              <p className="kicker">未結清</p>
              <p className={`serif stat${Math.abs(s.outstanding) > 0.5 ? ' bad' : ''}`}>
                {s.outstanding < -0.5 ? `應退 $ ${fmt(s.outstanding)}` : `$ ${fmt(s.outstanding)}`}
              </p>
            </div>
          </div>
          {s.unpaidMonths.length > 0 && (
            <p className="hint unpaid-list">
              未結清月份：{s.unpaidMonths.slice().reverse().map(monthLabel).join('、')}
            </p>
          )}
        </section>
      ))}
      <p className="hint">
        ※ 賴覺生每月自付管理費 5,818 元，其應付金額已扣除代墊款；「應退」代表收齊後須退還給他。
      </p>
    </>
  )
}
