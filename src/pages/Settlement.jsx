import { useMonths } from '../hooks/useMonths'
import { MEMBERS } from '../data/constants'
import { splitMonth, fmt, monthLabel } from '../utils/split'

// 個人結算：每位成員跨月累計應付 / 已結清 / 未結清，
// 未結清部分並列出要匯給誰、各多少。
export default function Settlement() {
  const { months, loading } = useMonths()
  if (loading) return <p className="hint">載入中…</p>
  if (months.length === 0) return <p className="hint">還沒有資料，請先回首頁匯入。</p>

  const stats = MEMBERS.map((m) => {
    let total = 0
    let collected = 0
    const unpaidToPay = {} // 未結清月份累計:要匯給誰各多少
    let unpaidReceivable = 0
    const unpaidMonths = []
    for (const mo of months) {
      if (mo.id < m.from) continue
      const { toPay, receivable, net } = splitMonth(mo.id, mo.fees, mo.paidBy).members[m.id]
      if (Math.abs(net) < 0.5 && receivable < 0.5) continue
      total += net
      if (mo.paid[m.id]) {
        collected += net
      } else {
        unpaidMonths.push(mo.id)
        for (const [payee, amt] of Object.entries(toPay)) {
          unpaidToPay[payee] = (unpaidToPay[payee] || 0) + amt
        }
        unpaidReceivable += receivable
      }
    }
    return { ...m, total, collected, outstanding: total - collected, unpaidToPay, unpaidReceivable, unpaidMonths }
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
                {s.total < -0.5 ? `應收 $ ${fmt(s.total)}` : `$ ${fmt(s.total)}`}
              </p>
            </div>
            <div>
              <p className="kicker">已結清</p>
              <p className="serif stat">$ {fmt(s.collected)}</p>
            </div>
            <div>
              <p className="kicker">未結清</p>
              <p className={`serif stat${Math.abs(s.outstanding) > 0.5 ? ' bad' : ''}`}>
                {s.outstanding < -0.5 ? `應收 $ ${fmt(s.outstanding)}` : `$ ${fmt(s.outstanding)}`}
              </p>
            </div>
          </div>
          {(Object.keys(s.unpaidToPay).length > 0 || s.unpaidReceivable > 0.5) && (
            <div className="member-transfers settle-transfers">
              {Object.entries(s.unpaidToPay).map(([payee, amt]) => (
                <span key={payee} className="transfer">
                  匯給 {payee} <b className="serif">$ {fmt(amt)}</b>
                </span>
              ))}
              {s.unpaidReceivable > 0.5 && (
                <span className="transfer in">
                  收回代墊 <b className="serif">$ {fmt(s.unpaidReceivable)}</b>
                </span>
              )}
            </div>
          )}
          {s.unpaidMonths.length > 0 && (
            <p className="hint unpaid-list">
              未結清月份：{s.unpaidMonths.slice().reverse().map(monthLabel).join('、')}
            </p>
          )}
        </section>
      ))}
      <p className="hint">
        ※ 水電瓦斯網路由陳億先繳、管理費由賴覺生先繳；「匯給誰」即該筆錢的先墊付者。
        賴覺生的「收回代墊」= 其他人應還他的管理費份額。
      </p>
    </>
  )
}
