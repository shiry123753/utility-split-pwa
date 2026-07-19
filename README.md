# 水電分攤 PWA

家庭水電費分攤結算工具。React + Vite + Firebase Firestore + vite-plugin-pwa，部署在 Vercel。

## 分攤規則

- **陳億（爸爸）**：實際支付水費、電費、瓦斯費、網路費，不參與分攤（出資人）。
- **賴覺生**：每月自付管理費 5,818 元，這筆納入分攤計算（等於代墊，收齊後其他人的份要還他）。
- **管理費、網路費**：永遠由賴覺生、陳麒伊、王子維三人平分。
- **水費 / 電費 / 瓦斯費**：2026.5 前三人平分；2026.5 起賴唯中加入，四人平分（他不分攤管理費與網路費）。

規則寫在 `src/data/constants.js`（成員、起始月、分攤群組），計算邏輯在 `src/utils/split.js`。

## 日常使用

- 雙擊 **預覽.command** → 本機預覽（http://localhost:5173）
- 雙擊 **部署.command** → build 成功才 commit + push main，Vercel 自動部署
- 每月收到帳單後，到「記帳」分頁輸入金額；首頁可切換月份、標記已結清/未結清
- 首頁有兩種檢視：「單月檢視」看當月明細與每人要匯給誰；「全部歷史」逐月逐筆列出
  金額、先繳的人、分攤人數、每人應付，方便對帳
- 「結算」分頁看每人累計應付 / 已結清 / 未結清（未結清有匯給誰的明細）
- 網址加 `?demo` 可用內建歷史資料展示，不讀寫資料庫

## Firebase

與釜山 PWA 共用 Firebase 專案 `korea-trip-13c7a`，collection 用 `utility_` 前綴隔離：

- `utility_months/{YYYY-MM}`：
  - `fees`: `{ water, electricity, gas, internet, mgmt }` 各項金額
  - `paidBy`: `{ 費用key: 收款人姓名 }`（水電瓦斯網路=陳麒伊〔陳億實繳，帳記她名下〕、
    管理費=賴覺生；缺漏時程式以預設值補）
  - `settled`: `{ 費用key: true/false }` 該筆費用是否已跟大家收齊（點頁面上的標籤可切換）
  - `paid`: `{ jue, chi, tzu, wei }` 各成員該月是否結清

Firestore 規則需要開放 `utility_months`（比照 `money_*` 的做法）：

```
match /utility_months/{doc} {
  allow read, write: if true;
}
```

首次開啟網頁時按「匯入歷史資料」，會把 2025.3 – 2026.7 的帳單一次寫入。

## Vercel 部署設定（一次性）

1. Vercel → Add New Project → 匯入 GitHub repo `shiry123753/utility-split-pwa`
2. Framework Preset 選 **Vite**
3. Environment Variables 加入六個 `VITE_FIREBASE_*`（值同 `.env`，與記帳專案相同）
4. Deploy 後網址：https://utility-split-pwa.vercel.app
