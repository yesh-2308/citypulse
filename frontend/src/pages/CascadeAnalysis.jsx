import { useState, useCallback } from 'react'
import { api } from '../api'
import { LoadingState, ErrorState } from '../components/States'
import { GitBranch, AlertTriangle, Droplets, Truck, Heart, RotateCcw, ChevronRight } from 'lucide-react'

const STAGE_ICONS = {
  1: <AlertTriangle size={18} />,
  2: <Droplets size={18} />,
  3: <Truck size={18} />,
  4: <Heart size={18} />,
}

const STAGE_COLORS = {
  1: '#EA580C',
  2: '#EAB308',
  3: '#64748B',
  4: '#7C3AED',
}

export default function CascadeAnalysis() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [rainfall, setRainfall] = useState(1.25)
  const [blockage, setBlockage] = useState(50)

  const runSimulation = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await api.simulateCascade({
        rainfall_severity: rainfall,
        drain_blockage_pct: blockage,
        trigger_feature_id: null
      })
      setResult(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [rainfall, blockage])

  const reset = () => {
    setResult(null); setError(null)
    setRainfall(1.25); setBlockage(50)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-title">Cascade Analysis</div>
          <div className="page-header-subtitle">
            Drainage Disruption → Stagnation → Road Inundation → Healthcare Access Delay
          </div>
        </div>
        <div className="page-header-right">
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>SIMULATED · Deterministic dependency model</span>
        </div>
      </div>

      <div className="page-body">
        {/* Controls */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><GitBranch size={16} />Scenario Configuration</div>
            {result && (
              <button className="btn btn-ghost btn-sm" onClick={reset}>
                <RotateCcw size={13} /> Reset
              </button>
            )}
          </div>
          <div className="card-body">
            <div className="grid-2">
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: 6 }}>
                  Rainfall Intensity Multiplier: <span style={{ color: 'var(--color-teal)', fontFamily: 'JetBrains Mono, monospace' }}>{rainfall}×</span>
                </label>
                <input
                  type="range" className="range-slider w-full"
                  min="1.0" max="2.0" step="0.25"
                  value={rainfall}
                  onChange={e => setRainfall(parseFloat(e.target.value))}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  <span>1.0× Normal</span><span>1.25× Moderate</span><span>1.5× Severe</span><span>2.0× Extreme</span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: 6 }}>
                  Drain Blockage Rate: <span style={{ color: 'var(--color-risk-high)', fontFamily: 'JetBrains Mono, monospace' }}>{blockage}%</span>
                </label>
                <input
                  type="range" className="range-slider w-full"
                  min="0" max="100" step="10"
                  value={blockage}
                  onChange={e => setBlockage(parseInt(e.target.value))}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  <span>0% Clear</span><span>50% Partial</span><span>100% Full Blockage</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={runSimulation} disabled={loading}>
                {loading ? '⏳ Simulating…' : '▶ Run Cascade Simulation'}
              </button>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Model: Deterministic geospatial dependency chain. Results are illustrative potential consequences only.
              </span>
            </div>
          </div>
        </div>

        {error && <ErrorState message={error} onRetry={runSimulation} />}

        {loading && <LoadingState message="Running cascading failure simulation…" />}

        {result && !loading && (
          <>
            {/* Cascade Chain Visualization */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Cascading Failure Chain</div>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Impact radius: {result.scenario_parameters.computed_impact_radius_km} km
                </span>
              </div>
              <div className="card-body">
                <div className="cascade-flow">
                  {result.stages.map((stage, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'stretch', flex: 1 }}>
                      <div className={`cascade-node ${i === 0 ? 'trigger' : ''}`}
                        style={{ borderColor: STAGE_COLORS[stage.stage] }}>
                        <div className="cascade-stage-label">Stage {stage.stage}</div>
                        <div style={{ color: STAGE_COLORS[stage.stage], marginBottom: 6 }}>
                          {STAGE_ICONS[stage.stage]}
                        </div>
                        <div className="cascade-node-title">{stage.stage_name}</div>
                        {stage.affected_count != null && (
                          <div className="cascade-stat" style={{ color: STAGE_COLORS[stage.stage] }}>
                            {stage.affected_count}
                          </div>
                        )}
                        {stage.status && (
                          <div className="cascade-detail" style={{ fontWeight: 600, color: STAGE_COLORS[stage.stage] }}>
                            {stage.status}
                          </div>
                        )}
                        {stage.details && (
                          <div className="cascade-detail" style={{ marginTop: 4 }}>{stage.details}</div>
                        )}
                        {stage.affected_count != null && (
                          <div className="cascade-detail" style={{ marginTop: 4 }}>
                            {stage.affected_count} {stage.stage_name.toLowerCase()} within impact radius
                          </div>
                        )}
                      </div>
                      {i < result.stages.length - 1 && (
                        <div className="cascade-arrow">
                          <ChevronRight size={20} color="var(--color-text-muted)" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Graph Edges */}
                <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--color-bg)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  {result.graph.edges.map((edge, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                      fontSize: 12, color: edge.active ? 'var(--color-text-primary)' : 'var(--color-text-muted)'
                    }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: edge.active ? 'var(--color-teal)' : 'var(--color-border)',
                        flexShrink: 0
                      }} />
                      <span style={{ fontWeight: 600 }}>{edge.from.replace('node_', '').toUpperCase()}</span>
                      <ChevronRight size={13} />
                      <span style={{ fontWeight: 600 }}>{edge.to.replace('node_', '').toUpperCase()}</span>
                      <span style={{ color: 'var(--color-text-secondary)', marginLeft: 4 }}>· {edge.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Simulation Summary</div>
              </div>
              <div className="card-body">
                <div style={{ fontSize: 13.5, color: 'var(--color-text-primary)', lineHeight: 1.7, marginBottom: 12 }}>
                  {result.summary}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                  {[
                    { label: 'Rainfall Multiplier', value: `${result.scenario_parameters.rainfall_severity_multiplier}×` },
                    { label: 'Drain Blockage', value: `${result.scenario_parameters.drain_blockage_pct}%` },
                    { label: 'Impact Radius', value: `${result.scenario_parameters.computed_impact_radius_km} km` },
                    { label: 'Overflow Rate', value: `~${result.scenario_parameters.modeled_overflow_discharge_m3_hr} m³/hr` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{
                      padding: '10px 12px', borderRadius: 8, background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)', textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-navy)', marginBottom: 4 }}>{value}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Affected healthcare details */}
                {result.stages[3]?.items?.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      Affected Healthcare Facilities
                    </div>
                    {result.stages[3].items.slice(0, 6).map((hc, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 12px', marginBottom: 6,
                        background: 'var(--color-risk-critical-bg)',
                        border: '1px solid var(--color-risk-critical-border)',
                        borderRadius: 6, fontSize: 12
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{hc.name}</div>
                          <div style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>{hc.zone_name} · {hc.distance_from_trigger_km} km from trigger</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                          <div style={{ fontWeight: 700, color: 'var(--color-risk-critical)', fontSize: 13 }}>
                            +{hc.estimated_transit_delay_mins} min
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-risk-critical)' }}>{hc.access_status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 14, padding: '10px 13px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 6, fontSize: 11.5, color: '#5B21B6', lineHeight: 1.5 }}>
                  ⚠ {result.disclaimer}
                </div>
              </div>
            </div>
          </>
        )}

        {!result && !loading && !error && (
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                Ready to Simulate
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
                Configure the rainfall intensity and drain blockage parameters above,
                then click <strong>"Run Cascade Simulation"</strong> to see how a
                drainage disruption could propagate through Chennai's urban infrastructure.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
