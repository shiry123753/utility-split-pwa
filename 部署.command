#!/bin/bash
# 一鍵部署到正式站（main 分支）
# 流程：先在本機 build 測試 → 通過才 commit & push；
#       build 失敗就中止，不會把壞掉的程式碼推上線。
# 雙擊即可執行，不用開終端機打指令。

cd "$(dirname "$0")" || { echo "❌ 找不到專案資料夾"; echo "按任意鍵關閉…"; read -n 1 -s; exit 1; }

echo "🚀 正式部署（main）"
echo "📁 專案：$(pwd)"
echo "════════════════════════════════════"

# 清掉可能殘留的鎖檔，避免 git 卡住
rm -f .git/index.lock 2>/dev/null

# 確保在 main 分支
git checkout main 2>/dev/null

# ① 先建置測試；失敗就中止（不 commit、不 push）
echo ""
echo "🔨 建置測試中（npm run build）…請稍候"
if ! npm run build; then
  echo ""
  echo "❌ build 失敗！已中止 —— 沒有 commit、也沒有 push。"
  echo "   請看上面的錯誤訊息，修正後再執行一次。"
  echo ""
  echo "按任意鍵關閉視窗…"
  read -n 1 -s
  exit 1
fi
echo "✅ build 成功"

# ② 加入所有修改
git add -A

# 沒有任何修改就優雅跳過 commit
if git diff --cached --quiet; then
  echo "ℹ️  沒有新的修改，略過 commit"
else
  git commit -m "update"
fi

# ③ 推送到 main
echo ""
echo "⏫ 推送到 main 分支…"
if git push origin main; then
  echo ""
  echo "✅ 已推送，Vercel 會自動開始部署"
  echo "   正式網址：https://utility-split-pwa.vercel.app"
else
  echo ""
  echo "❌ 推送失敗，請看上面的錯誤訊息"
  echo "   （常見原因：還沒 git 登入，或有衝突需要先處理）"
fi

echo ""
echo "────────────────────────────────────"
echo "按任意鍵關閉視窗…"
read -n 1 -s
