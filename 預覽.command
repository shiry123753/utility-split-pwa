#!/bin/bash
# 一鍵本機預覽：雙擊即可啟動 Vite 開發伺服器並自動開瀏覽器。
# 這個視窗要保持開啟，預覽伺服器才會持續運行。

cd "$(dirname "$0")" || { echo "❌ 找不到專案資料夾"; echo "按任意鍵關閉…"; read -n 1 -s; exit 1; }

echo "🌐 預覽啟動中…看完後按 Ctrl+C 或關閉此視窗即可停止"
echo "📁 專案：$(pwd)"
echo "   啟動後會自動開啟：http://localhost:5173"
echo "   （若下方 Vite 顯示的是別的埠號，請以實際顯示為準）"
echo "════════════════════════════════════"

# 背景等幾秒讓伺服器起來，再用預設瀏覽器打開預覽網址
( sleep 3; open "http://localhost:5173" ) >/dev/null 2>&1 &

# 啟動本機預覽伺服器（前景執行，視窗會保持開啟）
npm run dev
