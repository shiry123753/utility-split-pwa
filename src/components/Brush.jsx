// 品牌手刷 m 筆觸（brushmark.svg）
export default function Brush({ className = 'brush' }) {
  return (
    <svg className={className} viewBox="0 0 168 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 27 Q22 7 36 25 Q50 43 64 23 Q78 5 92 25 Q106 43 120 23 Q134 7 148 27"
        stroke="#6E665B"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx="156" cy="27" r="4.5" fill="#1A1714" />
    </svg>
  )
}
