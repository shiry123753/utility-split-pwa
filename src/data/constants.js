// ── 家庭成員與分攤規則 ──────────────────────────────────────────
// 陳億（爸爸）為出資人：實際支付水費、電費、瓦斯費、網路費，不參與分攤。
// 賴覺生每月自付管理費 5818 元，但這筆費用納入分攤計算（先代墊，再向其他人收回）。
//
// 分攤群組：
//   base3   → 管理費、網路費：永遠由 賴覺生、陳麒伊、王子維 三人平分
//   utility → 水費、電費、瓦斯費：2026-05 前三人平分；2026-05 起賴唯中加入四人平分

export const PAYER_NAME = '陳億'
export const MGMT_FEE = 5818

export const FEES = [
  { key: 'water', label: '水費', group: 'utility' },
  { key: 'electricity', label: '電費', group: 'utility' },
  { key: 'gas', label: '瓦斯費', group: 'utility' },
  { key: 'internet', label: '網路費', group: 'base3' },
  { key: 'mgmt', label: '管理費', group: 'base3' },
]

// 每筆費用預設的先墊付者（= 這筆錢要匯給誰）。
// Firestore 文件的 paidBy 欄位若缺漏（舊資料），一律以此為準。
export const DEFAULT_PAID_BY = {
  water: '陳億',
  electricity: '陳億',
  gas: '陳億',
  internet: '陳億',
  mgmt: '賴覺生',
}

export const MEMBERS = [
  { id: 'jue', name: '賴覺生', from: '2025-03', groups: ['base3', 'utility'], prepaysMgmt: true },
  { id: 'chi', name: '陳麒伊', from: '2025-03', groups: ['base3', 'utility'] },
  { id: 'tzu', name: '王子維', from: '2025-03', groups: ['base3', 'utility'] },
  { id: 'wei', name: '賴唯中', from: '2026-05', groups: ['utility'] },
]

// ── 歷史資料（首次使用時一鍵匯入 Firestore）────────────────────
export const SEED_MONTHS = {
  '2025-03': { mgmt: 5818 },
  '2025-04': { electricity: 568, mgmt: 5818 },
  '2025-05': { water: 282, mgmt: 5818 },
  '2025-06': { internet: 4200, mgmt: 5818, electricity: 740 },
  '2025-07': { water: 295 },
  '2025-08': { mgmt: 5818, electricity: 1417 },
  '2025-09': { water: 309, mgmt: 5818 },
  '2025-10': { mgmt: 5818, gas: 385, electricity: 1895 },
  '2025-11': { water: 308, mgmt: 5818 },
  '2025-12': { mgmt: 5818, electricity: 1895 },
  '2026-01': { water: 484, mgmt: 5818 },
  '2026-02': { mgmt: 5818, electricity: 913, gas: 708 },
  '2026-03': { mgmt: 5818, water: 308 },
  '2026-04': { mgmt: 5818, gas: 514, electricity: 771 },
  '2026-05': { mgmt: 5818, water: 308, gas: 589 },
  '2026-06': { mgmt: 5818, electricity: 1295, internet: 4200 },
  '2026-07': { water: 350, mgmt: 5818 },
}
