import { FEES, MEMBERS, DEFAULT_PAID_BY } from '../data/constants'

// 計算某個月份的分攤結果。
// 回傳 {
//   members: { [id]: { share, toPay, receivable, net } }
//     share      = 該月應分攤總額
//     toPay      = { 先墊付者姓名: 應匯金額 }（明確標出這筆錢要匯給誰）
//     receivable = 自己先墊付的費用中，其他人應還給自己的部分
//     net        = toPay 總和 − receivable（負值代表收回的比要付的多）
//   details: [{ key, label, amount, payer, n, each }]  → 供歷史檢視逐筆列出
// }
export function splitMonth(monthId, fees = {}, paidBy = {}) {
  const active = MEMBERS.filter((m) => monthId >= m.from)
  const members = {}
  for (const m of active) members[m.id] = { share: 0, toPay: {}, receivable: 0, net: 0 }
  const details = []

  for (const fee of FEES) {
    const amt = Number(fees[fee.key]) || 0
    if (amt <= 0) continue
    const splitters = active.filter((m) => m.groups.includes(fee.group))
    if (splitters.length === 0) continue
    const payer = paidBy[fee.key] || DEFAULT_PAID_BY[fee.key]
    const each = amt / splitters.length
    details.push({ key: fee.key, label: fee.label, amount: amt, payer, n: splitters.length, each })

    for (const m of splitters) {
      members[m.id].share += each
      if (m.name === payer) {
        // 自己先墊了整筆，其他人的份之後要還他
        members[m.id].receivable += amt - each
      } else {
        members[m.id].toPay[payer] = (members[m.id].toPay[payer] || 0) + each
      }
    }
  }

  for (const id in members) {
    const v = members[id]
    v.net = Object.values(v.toPay).reduce((a, b) => a + b, 0) - v.receivable
  }
  return { members, details }
}

// 淨額結算：只計「未結清（settled=false）」的費用，把每組成員配對的
// 雙向欠款加總後互相抵銷，回傳最終淨額與算式所需的兩個方向小計。
// 小計先各自四捨五入到整數再相減，讓畫面上的算式數字對得起來。
// 回傳 [{ from, to, net, fromOwes, toOwes }]（from → to 匯 net 元）
export function netSettlement(months) {
  const owe = {} // 'aId>bId' → a 應付 b 的累計金額
  for (const mo of months) {
    const active = MEMBERS.filter((m) => mo.id >= m.from)
    for (const fee of FEES) {
      const amt = Number(mo.fees[fee.key]) || 0
      if (amt <= 0 || mo.settled?.[fee.key]) continue
      const payerName = mo.paidBy?.[fee.key] || DEFAULT_PAID_BY[fee.key]
      const payer = MEMBERS.find((m) => m.name === payerName)
      if (!payer) continue
      const splitters = active.filter((m) => m.groups.includes(fee.group))
      if (splitters.length === 0) continue
      const each = amt / splitters.length
      for (const m of splitters) {
        if (m.id === payer.id) continue
        owe[`${m.id}>${payer.id}`] = (owe[`${m.id}>${payer.id}`] || 0) + each
      }
    }
  }

  const pairs = []
  for (let i = 0; i < MEMBERS.length; i++) {
    for (let j = i + 1; j < MEMBERS.length; j++) {
      const a = MEMBERS[i]
      const b = MEMBERS[j]
      const aToB = Math.round(owe[`${a.id}>${b.id}`] || 0)
      const bToA = Math.round(owe[`${b.id}>${a.id}`] || 0)
      if (aToB === 0 && bToA === 0) continue
      const net = aToB - bToA // 負值代表方向相反
      const [from, to] = net >= 0 ? [a, b] : [b, a]
      pairs.push({
        from,
        to,
        net: Math.abs(net),
        fromOwes: Math.max(aToB, bToA), // 淨欠方原本應付的小計
        toOwes: Math.min(aToB, bToA), // 對方應付的小計（被抵銷掉的部分）
      })
    }
  }
  return pairs.sort((x, y) => y.net - x.net)
}

// 該月費用總額
export function monthTotal(fees = {}) {
  return FEES.reduce((sum, f) => sum + (Number(fees[f.key]) || 0), 0)
}

// 金額顯示：四捨五入到整數 + 千分位
export function fmt(n) {
  return Math.round(Math.abs(n)).toLocaleString('zh-TW')
}

// 月份顯示：2026-07 → 2026.7
export function monthLabel(id) {
  const [y, m] = id.split('-')
  return `${y}.${Number(m)}`
}
