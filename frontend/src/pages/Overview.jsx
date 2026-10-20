import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'
import {
  AlertTriangle, Activity, Map, Coins, GitBranch, Database,
  TrendingUp, Droplets, Heart, Waves
} from 'lucide-react'
import { api } from '../api'
import { LoadingState, ErrorState } from '../components/States'
import { RiskBadge } from '../components/Badges'
import { getRiskColor, formatNum, truncate } from '../utils'
import MapComponent from '../components/MapComponent'

const RISK_COLORS = {
  Critical: '#DC2626', High: '#EA580C', Moderate: '#EAB308', Low: '#16A34A'
}

export default function Overview() {
  const [kpis, setKpis] = useState(null)
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [k, l] = await Promise.all([
        api.kpis(),
        api.locations({ limit: 12 })
      ])
      setKpis(k)
      setLocations(l.locations || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return (
    <div>
      <PageHeader title="Overview Dashboard" subtitle="Chennai Infrastructure Intelligence — At a Glance" />
      <div className="page-body"><LoadingState message="Loading Chennai infrastructure data…" /></div>
    </div>
  )

  if (error) return (
    <div>
      <PageHeader title="Overview Dashboard" subtitle="Backend connection required" />
      <div className="page-body"><ErrorState message={error} onRetry={fetchData} /></div>
    </div>
  )

  const riskDist = [
    { name: 'Critical', value: kpis.critical_priority_locations, color: RISK_COLORS.Critical },
    { name: 'High', value: kpis.high_priority_locations, color: RISK_COLORS.High },
    { name: 'Moderate', value: kpis.moderate_risk_locations, color: RISK_COLORS.Moderate },
    { name: 'Low', value: kpis.low_risk_locations, color: RISK_COLORS.Low },
  ]

  const categoryData = [
    { name: 'Flood Hotspots', count: kpis.active_hotspots_count },
    { name: 'Stagnation Areas', count: kpis.chronic_stagnation_points_count },
    { name: 'Healthcare', count: kpis.healthcare_facilities_monitored },
    { name: 'GW Wells', count: kpis.groundwater_wells_tracked },
  ]

  return (
    <div>
      <PageHeader title="Overview Dashboard" subtitle="Chennai, Tamil Nadu · Infrastructure Risk Summary" />
      <div className="page-body">

        {/* KPIs */}
        <div className="kpi-grid">
          <KPICard icon={<Activity size={16} />} iconCls="kpi-icon-teal"
            label="Total Infrastructure Features" value={kpis.total_infrastructure_features_loaded?.toLocaleString()} footer="Across all ingested datasets" />
          <KPICard icon={<Map size={16} />} iconCls="kpi-icon-navy"
            label="Locations Assessed" value={kpis.mapped_locations_assessed?.toLocaleString()} footer="With calculated risk scores" />
          <KPICard icon={<AlertTriangle size={16} />} iconCls="kpi-icon-critical"
            label="Critical Priority Locations" value={kpis.critical_priority_locations?.toLocaleString()} footer="Score ≥ 80 / 100" />
          <KPICard icon={<TrendingUp size={16} />} iconCls="kpi-icon-high"
            label="High Priority Locations" value={kpis.high_priority_locations?.toLocaleString()} footer="Score 60–79 / 100" />
          <KPICard icon={<Droplets size={16} />} iconCls="kpi-icon-teal"
            label="Chronic Stagnation Points" value={kpis.chronic_stagnation_points_count?.toLocaleString()} footer="GCC 2015 Observed Survey" />
          <KPICard icon={<Waves size={16} />} iconCls="kpi-icon-navy"
            label="Flood Hotspot Sites" value={kpis.active_hotspots_count?.toLocaleString()} footer="Historical Inundation Records" />
          <KPICard icon={<Heart size={16} />} iconCls="kpi-icon-teal"
            label="Healthcare Facilities" value={kpis.healthcare_facilities_monitored?.toLocaleString()} footer="UCHC + UPHC (GCC Official)" />
          <KPICard icon={<Coins size={16} />} iconCls="kpi-icon-navy"
            label="Baseline Budget" value={`₹${kpis.baseline_budget_available_lakhs} L`} footer="Configured scenario budget" />
        </div>

        {/* Avg Risk + Map Row */}
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title"><GitBranch size={16} />Risk Distribution</div>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Avg score: <strong style={{ color: 'var(--color-text-primary)' }}>{kpis.average_modeled_risk_score}</strong>/100
              </span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={riskDist} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                  <Tooltip formatter={(v) => [v, 'Locations']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {riskDist.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                {riskDist.map(r => (
                  <div key={r.name} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                    borderRadius: 6, background: 'var(--color-bg)', border: '1px solid var(--color-border)'
                  }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, flex: 1 }}>{r.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: r.color }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title"><Database size={16} />Infrastructure Categories</div>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" outerRadius={75}
                    dataKey="count" nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={['#087F8C', '#DC2626', '#7C3AED', '#0284C7'][i % 4]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Map Preview */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Map size={16} />Spatial Overview — Chennai</div>
            <Link to="/map" className="btn btn-secondary btn-sm">Full Map View →</Link>
          </div>
          <div className="card-body" style={{ padding: 0, borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
            <MapComponent height={380} initialLayers={['hotspots', 'stagnation', 'basins']} />
          </div>
        </div>

        {/* Top Priority Locations */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><AlertTriangle size={16} />Highest Priority Candidate Locations</div>
            <Link to="/risk" className="btn btn-secondary btn-sm">Full Analysis →</Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Location Name</th>
                  <th>Category</th>
                  <th>Risk Score</th>
                  <th>Level</th>
                  <th>Primary Driver</th>
                </tr>
              </thead>
              <tbody>
                {locations.slice(0, 10).map((loc, i) => {
                  const topFactor = loc.factors?.[0]?.name || '—'
                  return (
                    <tr key={i}>
                      <td><strong style={{ fontSize: 13 }}>{truncate(loc.name, 32)}</strong></td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{loc.category}</td>
                      <td>
                        <span style={{
                          font: '600 13px JetBrains Mono, monospace',
                          color: getRiskColor(loc.risk_level)
                        }}>
                          {loc.composite_risk_score}
                        </span>
                      </td>
                      <td><RiskBadge level={loc.risk_level} /></td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{truncate(topFactor, 36)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Links */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {[
            { to: '/risk', icon: <AlertTriangle size={20} />, label: 'Risk Intelligence', desc: 'Explainable risk scores across 190+ sites', color: '#EA580C' },
            { to: '/cascade', icon: <GitBranch size={20} />, label: 'Cascade Analysis', desc: 'Drainage → Road → Healthcare failure chains', color: '#0284C7' },
            { to: '/budget', icon: <Coins size={20} />, label: 'Budget Optimizer', desc: 'Maintenance budget allocation engine', color: '#087F8C' },
          ].map(({ to, icon, label, desc, color }) => (
            <Link to={to} key={to} style={{ textDecoration: 'none' }}>
              <div className="card" style={{
                padding: 18, cursor: 'pointer',
                borderLeft: `3px solid ${color}`,
                transition: 'box-shadow 0.2s, transform 0.2s'
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
              >
                <div style={{ color, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{desc}</div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}

function PageHeader({ title, subtitle }) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        <div className="page-header-title">{title}</div>
        <div className="page-header-subtitle">{subtitle}</div>
      </div>
      <div className="page-header-right">
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'right' }}>
          Decision-support prototype<br />
          <span className="font-mono" style={{ fontSize: 10 }}>Not a certified emergency system</span>
        </div>
      </div>
    </div>
  )
}

function KPICard({ label, value, footer, icon, iconCls }) {
  return (
    <div className="kpi-card">
      <div className="kpi-header">
        <div className="kpi-label">{label}</div>
        <div className={`kpi-icon ${iconCls}`}>{icon}</div>
      </div>
      <div className="kpi-value">{value ?? '—'}</div>
      <div className="kpi-footer">{footer}</div>
    </div>
  )
}
