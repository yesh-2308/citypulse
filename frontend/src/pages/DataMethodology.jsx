import { useEffect, useState, useCallback } from 'react'
import { api } from '../api'
import { LoadingState, ErrorState } from '../components/States'
import { ProvenanceBadge } from '../components/Badges'
import { Database, CheckCircle, AlertCircle, XCircle } from 'lucide-react'

const STATUS_ICONS = {
  VALID: <CheckCircle size={14} color="var(--color-risk-low)" />,
  MISSING: <XCircle size={14} color="var(--color-risk-critical)" />,
  ERROR: <AlertCircle size={14} color="var(--color-risk-high)" />
}

export default function DataMethodology() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await api.dataStatus()
      setStatus(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-title">Data & Methodology</div>
          <div className="page-header-subtitle">Dataset provenance, record counts, limitations, and analytical transparency</div>
        </div>
      </div>

      <div className="page-body">
        {/* Synthetic Terrain Warning */}
        <div className="terrain-warning">
          <span style={{ fontSize: 18 }}>⚠</span>
          <div>
            <strong>Synthetic Terrain Notice:</strong> The terrain/elevation layer used in this platform is synthetic demonstration data only
            (10,416 grid points, 250m spacing, Chennai extent 12.95–13.20°N, 80.10–80.32°E).
            It was not measured in the field and has not been validated against a real DEM.
            Do not use it for real flood engineering, emergency planning, or hydrological analysis.
            Replace with an authoritative DEM before any real-world application.
          </div>
        </div>

        {/* Data Status Overview */}
        {loading ? <LoadingState message="Loading data pipeline status…" /> :
         error ? <ErrorState message={error} onRetry={fetchStatus} /> :
         status && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {[
                { label: 'Datasets Registered', value: status.summary.total_datasets_registered, icon: <Database size={16} />, cls: 'kpi-icon-navy' },
                { label: 'Observed Datasets', value: status.summary.observed_datasets_count, icon: <CheckCircle size={16} />, cls: 'kpi-icon-teal' },
                { label: 'Simulated / Estimated', value: status.summary.estimated_datasets_count + status.summary.simulated_datasets_count, icon: <AlertCircle size={16} />, cls: 'kpi-icon-high' },
              ].map(({ label, value, icon, cls }) => (
                <div key={label} className="kpi-card">
                  <div className="kpi-header">
                    <div className="kpi-label">{label}</div>
                    <div className={`kpi-icon ${cls}`}>{icon}</div>
                  </div>
                  <div className="kpi-value">{value}</div>
                </div>
              ))}
            </div>

            {/* Dataset Cards */}
            <div className="card">
              <div className="card-header">
                <div className="card-title"><Database size={16} />Dataset Registry</div>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Dataset</th>
                      <th>Status</th>
                      <th>Records</th>
                      <th>Provenance</th>
                      <th>Source</th>
                      <th>Format</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(status.datasets).map(([key, ds]) => (
                      <tr key={key}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 12.5 }}>{key.replace(/_/g, ' ')}</div>
                          {ds.description && (
                            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                              {ds.description}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                            {STATUS_ICONS[ds.status] || STATUS_ICONS.ERROR}
                            {ds.status}
                          </div>
                          {ds.error && <div style={{ fontSize: 11, color: 'var(--color-risk-high)', marginTop: 2 }}>{ds.error}</div>}
                        </td>
                        <td>
                          <span className="font-mono" style={{ fontSize: 12.5, fontWeight: 600 }}>
                            {ds.count?.toLocaleString() || ds.displayed_sample_count?.toLocaleString() || '—'}
                          </span>
                          {ds.displayed_sample_count && ds.count !== ds.displayed_sample_count && (
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                              {ds.count.toLocaleString()} total · {ds.displayed_sample_count.toLocaleString()} displayed
                            </div>
                          )}
                        </td>
                        <td>
                          <ProvenanceBadge provenance={ds.provenance} />
                          {ds.validation_status && (
                            <div style={{ fontSize: 10, marginTop: 3, color: 'var(--color-healthcare)', fontWeight: 600 }}>
                              {ds.validation_status}
                            </div>
                          )}
                          {ds.coordinates_status && (
                            <div style={{ fontSize: 10, marginTop: 3, color: 'var(--color-risk-moderate)' }}>
                              {ds.coordinates_status.split('(')[0].trim()}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 11.5, color: 'var(--color-text-secondary)' }}>{ds.source || '—'}</td>
                        <td style={{ fontSize: 11.5, color: 'var(--color-text-secondary)' }}>{ds.format || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Methodology */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Analytical Methodology</div>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {[
                    {
                      title: 'Risk Scoring Engine',
                      points: [
                        'Deterministic multi-criteria spatial model',
                        '6 evidence categories with configurable weights',
                        'Normalized factor scores (0–100 each)',
                        'Composite weighted average with documented assumptions',
                        'Reproducible results from identical inputs',
                        'Provenance tag per factor (OBSERVED / ESTIMATED / SIMULATED)'
                      ]
                    },
                    {
                      title: 'Cascade Analysis',
                      points: [
                        'Explicit dependency graph: Drainage → Stagnation → Roads → Healthcare',
                        'Impact radius proportional to rainfall severity × blockage rate',
                        'Haversine-based proximity detection per stage',
                        'Deterministic overflow discharge model (m³/hr)',
                        'Transit delay estimation for healthcare access corridors',
                        'Labelled "Simulated Consequence" not confirmed hydraulic flow'
                      ]
                    },
                    {
                      title: 'Budget Optimizer',
                      points: [
                        '0/1 Knapsack with cost-benefit ratio priority',
                        'Sorted by benefit/cost descending (greedy approximation)',
                        'Budget constraint strictly enforced',
                        'Compared against naive risk-first greedy baseline',
                        'Costs labeled as planning estimates, not official tender pricing',
                        'Aggregate benefit is modeled score reduction, not guaranteed outcome'
                      ]
                    },
                    {
                      title: 'Scenario Simulation',
                      points: [
                        'Parametric shifts applied to baseline risk distribution',
                        'Risk surge: (multiplier-1) × 28 + (blockage/100) × 18',
                        'Intervention relief: min(30, count × 3.2) points',
                        'Net shift = surge − relief',
                        'Exposure estimate from critical/high count × unit cost factors',
                        'Source datasets are never mutated by scenario runs'
                      ]
                    }
                  ].map(({ title, points }) => (
                    <div key={title}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 10 }}>{title}</div>
                      <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {points.map((p, i) => (
                          <li key={i} style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Known Limitations */}
            <div className="card" style={{ borderLeft: '3px solid var(--color-risk-moderate)' }}>
              <div className="card-header">
                <div className="card-title"><AlertCircle size={16} color="var(--color-risk-moderate)" />Known Limitations</div>
              </div>
              <div className="card-body">
                <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    'This is a decision-support prototype and NOT a certified emergency management system.',
                    'Healthcare facility coordinates are estimated from Corporation Zone/Division centroids. Official addresses are observed but GPS coordinates are NOT in the source data.',
                    'Synthetic terrain elevation is smooth-gradient demo data only. Not validated against SRTM, CartoSAT, or any other real DEM. Do not use for drainage engineering.',
                    'Stormwater drain and road datasets are sampled (every 8th / 25th feature) for MapLibre rendering performance. Full dataset record counts are reported accurately.',
                    'GCC 2015 flood hotspot and water stagnation datasets reflect historical surveys. Current conditions may differ.',
                    'Risk scores use heuristic weights that are not calibrated against independent field validation data.',
                    'Budget estimates are municipal civil benchmark approximations, not verified government tender pricing.',
                    'Cascade simulation uses proximity-based threshold rules, not hydrodynamic or network-flow modeling.',
                    'CGWB groundwater data covers 16 monitoring wells, providing limited spatial interpolation coverage across Chennai.',
                    'IMD rainfall records cover a limited observation window and do not represent a full climatological baseline.'
                  ].map((item, i) => (
                    <li key={i} style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
