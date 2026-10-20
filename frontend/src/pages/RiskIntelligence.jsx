import { useState, useCallback, useEffect } from 'react'
import { api } from '../api'
import { LoadingState, ErrorState, EmptyState } from '../components/States'
import { RiskBadge, ProvenanceBadge } from '../components/Badges'
import RiskBreakdown from '../components/RiskBreakdown'
import { getRiskColor, truncate, formatCoord } from '../utils'
import { Search, Filter, ShieldAlert } from 'lucide-react'

const CATEGORIES = ['All Categories', 'Historical Flood Hotspot', 'Water Stagnation Area', 'Healthcare Facility', 'Drainage Basin / Stream']
const RISK_LEVELS = ['All Levels', 'Critical', 'High', 'Moderate', 'Low']

export default function RiskIntelligence() {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [riskFilter, setRiskFilter] = useState('')

  const fetchLocations = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await api.locations({
        category: catFilter || undefined,
        risk_level: riskFilter || undefined,
        search: search || undefined,
        limit: 200
      })
      setLocations(res.locations || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [catFilter, riskFilter, search])

  useEffect(() => { fetchLocations() }, [fetchLocations])

  const filtered = locations

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-title">Risk Intelligence</div>
          <div className="page-header-subtitle">
            Explainable, factor-based infrastructure vulnerability assessments
          </div>
        </div>
        <div className="page-header-right">
          <ProvenanceBadge provenance="DERIVED" />
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Multi-criteria spatial model</span>
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="card">
          <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                className="input"
                style={{ paddingLeft: 30 }}
                placeholder="Search locations…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input"
              style={{ width: 200 }}
              value={catFilter}
              onChange={e => setCatFilter(e.target.value.replace('All Categories', ''))}
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select
              className="input"
              style={{ width: 150 }}
              value={riskFilter}
              onChange={e => setRiskFilter(e.target.value.replace('All Levels', ''))}
            >
              {RISK_LEVELS.map(r => <option key={r}>{r}</option>)}
            </select>
            <button className="btn btn-secondary btn-sm" onClick={fetchLocations}>
              <Filter size={13} /> Apply
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* Location List */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <ShieldAlert size={16} />
                  Assessed Locations
                </div>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {filtered.length} results · Click a row to view full risk breakdown
                </span>
              </div>
              {loading ? <LoadingState message="Running risk analysis…" /> :
               error ? <ErrorState message={error} onRetry={fetchLocations} /> :
               filtered.length === 0 ? <EmptyState icon="🔍" title="No matching locations" description="Adjust the filters above to see results." /> : (
                <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Location</th>
                        <th>Category</th>
                        <th>Score</th>
                        <th>Level</th>
                        <th>Coordinates</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((loc, i) => (
                        <tr
                          key={i}
                          onClick={() => setSelected(loc)}
                          className={selected?.id === loc.id ? 'selected' : ''}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{truncate(loc.name, 30)}</div>
                          </td>
                          <td style={{ fontSize: 11.5, color: 'var(--color-text-secondary)' }}>
                            {truncate(loc.category, 24)}
                          </td>
                          <td>
                            <span style={{
                              fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                              color: getRiskColor(loc.risk_level)
                            }}>
                              {loc.composite_risk_score}
                            </span>
                          </td>
                          <td><RiskBadge level={loc.risk_level} /></td>
                          <td>
                            <span className="font-mono" style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                              {formatCoord(loc.lat)}, {formatCoord(loc.lon)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Risk Detail Panel */}
          <div style={{ width: 340, flexShrink: 0 }}>
            {selected ? (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Risk Breakdown</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
                </div>
                <div className="card-body">
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                    {selected.category}
                    {selected.zone && ` · Zone ${selected.zone}`}
                    {selected.zone_name && ` (${selected.zone_name})`}
                  </div>
                  <RiskBreakdown result={selected} />
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-body" style={{ textAlign: 'center', padding: 32 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                    Select a Location
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    Click any row in the table to see the full explainable risk breakdown with evidence and factor weights.
                  </div>
                </div>
              </div>
            )}

            {/* Model methodology note */}
            <div className="card" style={{ marginTop: 14 }}>
              <div className="card-header"><div className="card-title" style={{ fontSize: 13 }}>Model Notes</div></div>
              <div className="card-body" style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                <p>Scores are deterministic, heuristic multi-criteria assessments derived from:</p>
                <ul style={{ marginTop: 6, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li>Historical flood hotspot proximity (GCC 2015)</li>
                  <li>Chronic water stagnation density</li>
                  <li>Drain asset condition registry</li>
                  <li>CGWB groundwater depth telemetry</li>
                  <li>IMD precipitation departure records</li>
                  <li>Synthetic terrain gradient (DEMO ONLY)</li>
                </ul>
                <p style={{ marginTop: 8, fontStyle: 'italic' }}>
                  Not a certified engineering or emergency forecast.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
