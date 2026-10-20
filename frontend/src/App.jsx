import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Map, ShieldAlert, GitBranch, Coins, Sliders, Database, Settings as SettingsIcon
} from 'lucide-react'
import Overview from './pages/Overview'
import InfrastructureMap from './pages/InfrastructureMap'
import RiskIntelligence from './pages/RiskIntelligence'
import CascadeAnalysis from './pages/CascadeAnalysis'
import BudgetOptimizer from './pages/BudgetOptimizer'
import WhatIfSimulator from './pages/WhatIfSimulator'
import DataMethodology from './pages/DataMethodology'

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
  { to: '/map', label: 'Infrastructure Map', icon: Map },
  { to: '/risk', label: 'Risk Intelligence', icon: ShieldAlert },
  { to: '/cascade', label: 'Cascade Analysis', icon: GitBranch },
  { to: '/budget', label: 'Budget Optimizer', icon: Coins },
  { to: '/simulator', label: 'What-If Simulator', icon: Sliders },
  { to: '/data', label: 'Data & Methodology', icon: Database },
]

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-brand-logo">
              <div className="sidebar-brand-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/>
                  <line x1="12" y1="22" x2="12" y2="15.5"/>
                  <line x1="22" y1="8.5" x2="12" y2="15.5"/>
                  <line x1="2" y1="8.5" x2="12" y2="15.5"/>
                </svg>
              </div>
              <div>
                <div className="sidebar-brand-title">CityPulse 1</div>
                <div className="sidebar-brand-subtitle">Infrastructure Intelligence</div>
              </div>
            </div>
          </div>

          <div className="sidebar-geo-badge">
            <div className="sidebar-geo-dot" />
            <span>Chennai, Tamil Nadu · India</span>
          </div>

          <nav className="sidebar-nav">
            <div className="sidebar-section-label">Platform</div>
            {NAV.map(({ to, label, icon: Icon, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                title={label}
              >
                <Icon className="nav-item-icon" size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-data-status">
              <div className="sidebar-data-dot" />
              <span>Decision-support prototype</span>
            </div>
          </div>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/map" element={<InfrastructureMap />} />
            <Route path="/risk" element={<RiskIntelligence />} />
            <Route path="/cascade" element={<CascadeAnalysis />} />
            <Route path="/budget" element={<BudgetOptimizer />} />
            <Route path="/simulator" element={<WhatIfSimulator />} />
            <Route path="/data" element={<DataMethodology />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
