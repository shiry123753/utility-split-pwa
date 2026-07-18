import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db, COL } from '../firebase/config'

// 即時訂閱所有月份資料，依月份新→舊排序。
// 回傳 { months: [{ id, fees, paid }], loading }
export function useMonths() {
  const [months, setMonths] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, COL.months),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, fees: d.data().fees || {}, paid: d.data().paid || {} }))
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
  }, [])

  return { months, loading }
}
