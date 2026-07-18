import { FEES, MEMBERS } from '../data/constants'

// 計算某個月份每位成員的分攤結果。
// 回傳 { [memberId]: { share, net } }：
//   share = 該月應分攤總額（各費用 ÷ 該費用當月分攤人數）
//   net   = 實際應付金額；賴覺生因已自付管理費，net = share − 管理費
//           （net 為負代表其他人收齊後應把錢還給他）
export function splitMonth(monthId, fees = {}) {
  const active = MEMBERS.filter((m) => monthId >= m.from)
  const result = {}
  for (const m of active) result[m.id] = { share: 0, net: 0 }

  for (const fee of FEES) {
    const amt = Number(fees[fee.key]) || 0
    if (amt <= 0) continue
    const payers = active.filter((m) => m.groups.includes(fee.group))
    if (payers.length === 0) continue
    const each = amt / payers.length
    for (const m of payers) result[m.id].share += each
  }

  for (const m of active) {
    const prepaid = m.prepaysMgmt ? Number(fees.mgmt) || 0 : 0
    result[m.id].net = result[m.id].share - prepaid
  }
  return result
}

// 該月費用總額
export function monthTotal(fees = {}) {
  return FEES.reduce((sum, f) => sum + (Number(fees[f.key]) || 0), 0)
}

// 金額顯示：四捨五入到整數 + 千分位
export function fmt(n) {
  return Math.round(Math.abs(n)).toLocaleString('zh-TW')
}
