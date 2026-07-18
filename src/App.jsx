import { Routes, Route, NavLink } from 'react-router-dom'
import Brush from './components/Brush'
import Dashboard from './pages/Dashboard'
import Settlement from './pages/Settlement'
import EditMonth from './pages/EditMonth'

export default function App() {
  return (
    <div className="app">
      <header className="brand-header">
        <div>
          <Brush />
          <h1>UTILITY<span className="h1-zh">水電分攤</span></h1>
        </div>
        <div className="sig">
          <span className="barcode" aria-hidden="true" />
          <span className="capsule">2026</span>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settle" element={<Settlement />} />
        <Route path="/edit" element={<EditMonth />} />
        <Route path="/edit/:monthId" element={<EditMonth />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>

      <nav className="tabbar">
        <div className="tabbar-inner">
          <NavLink to="/" end>首頁</NavLink>
          <NavLink to="/settle">結算</NavLink>
          <NavLink to="/edit">記帳</NavLink>
        </div>
      </nav>
    </div>
  )
}
