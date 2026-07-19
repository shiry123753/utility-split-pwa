import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db, COL } from '../firebase/config'
import { SEED_MONTHS, seedSettled } from '../data/constants'

// 即時訂閱所有月份資料，依月份新→舊排序。
// 回傳 { months: [{ id, fees, paid, paidBy, settled }], loading }
// 網址帶 ?demo 時改用內建歷史資料（不連 Firestore），方便還沒開規則前先預覽。
export function useMonths() {
  const demo = new URLSearchParams(window.location.search).has('demo')
  const [months, setMonths] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (demo) {
      setMonths(
        Object.entries(SEED_MONTHS)
          .map(([id, fees]) => {
            const settled = {}
            for (const key of Object.keys(fees)) settled[key] = seedSettled(id, key)
            return { id, fees, paid: {}, paidBy: {}, settled }
          })
          .sort((a, b) => b.id.localeCompare(a.id))
      )
      setLoading(false)
      return
    }
    const unsub = onSnapshot(
      collection(db, COL.months),
      (snap) => {
        const list = snap.docs
          .map((d) => ({
            id: d.id,
            fees: d.data().fees || {},
            paid: d.data().paid || {},
            paidBy: d.data().paidBy || {},
            settled: d.data().settled || {},
          }))
          .sort((a, b) => b.id.localeCompare(a.id))
        setMonths(list)
        setLoading(false)
      },
      (err) => {
        console.error('讀取月份資料失敗', err)
        setLoading(false)
      }
    )
    return unsub
  }, [demo])

  return { months, loading, demo }
}
