import { useState, useCallback } from 'react'
import { api } from '../api'
import { LoadingState, ErrorState } from '../components/States'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import { Sliders, RotateCcw } from 'lucide-react'

const SCENARIOS = [
  { key: 'NORMAL', label: 'Normal Baseline', desc: 'Standard seasonal monsoon rainfall' },
  { key: 'MODERATE_MONSOON', label: 'Moderate Surge (+25%)', desc: 'Moderate monsoon depression' },
  { key: 'SEVERE_MONSOON', label: 'Severe Cyclone (+50%)', desc: 'Intensive coastal depression rainfall' },
  { key: 'EXTREME_CLOUDBURST', label: 'Extreme Inundation (+100%)', desc: '2015/2023 peak flooding intensity' },
]

export default function WhatIfSimulator() {
  const [scenarioKey, setScenarioKey] = useState('SEVERE_MONSOON')
  const [budget, setBudget] = useState(50)
  const [blockage, setBlockage] = useState(30)
  const [interventions, setInterventions] = useState(6)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await api.runScenario({
        scenario_key: scenarioKey,
        budget_lakhs: budget,
        drain_blockage_pct: blockage,
        implemented_interventions_count: interventions
      })
      setResult(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [scenarioKey, budget, blockage, interventions])

  const reset = () => {
    setResult(null); setError(null)
    setScenarioKey('SEVERE_MONSOON'); setBudget(50); setBlockage(30); setInterventions(6)
  }

  const baseline = result?.baseline
  const simulated = result?.simulated_outcome
  const comparison = result?.comparison_summary
  const meta = result?.scenario_metadata

  const riskDistData = baseline && simulated ? [
    { level: 'Critical', baseline: baseline.risk_distribution.critical, simulated: simulated.risk_distribution.critical },
    { level: 'High', baseline: baseline.risk_distribution.high, simulated: simulated.risk_distribution.high },
    { level: 'Moderate', baseline: baseline.risk_distribution.moderate, simulated: simulated.risk_distribution.moderate },
    { level: 'Low', baseline: baseline.risk_distribution.low, simulated: simulated.risk_distribution.low },
  ] : []

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-title">What-If Simulator</div>
          <div className="page-header-subtitle">
            Parametric scenario comparison — Baseline vs Simulated risk and consequence outcomes
          </div>
        </div>
        <div className="page-header-right">
          {result && (
            <button className="btn btn-ghost btn-sm" onClick={reset}>
              <RotateCcw size={13} /> Reset Scenario
            </button>
          )}
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>SIMULATED outcomes</span>
        </div>
      </div>

      <div className="page-body">
        {/* Scenario Controls */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Sliders size={16} />Scenario Parameters</div>
          </div>
          <div className="card-body">
            {/* Scenario Selector */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Rainfall Scenario</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {SCENARIOS.map(s => (
                  <button
                    key={s.key}
                    onClick={() => setScenarioKey(s.key)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `1.5px solid ${scenarioKey === s.key ? 'var(--color-teal)' : 'var(--color-border)'}`,
                      background: scenarioKey === s.key ? 'rgba(8,127,140,0.06)' : 'var(--color-surface)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: scenarioKey === s.key ? 'var(--color-teal)' : 'var(--color-text-primary)', marginBottom: 4 }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid-3" style={{ gap: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Budget: <span style={{ color: 'var(--color-teal)', fontFamily: 'monospace' }}>₹{budget}L</span>
                </label>
                <input type="range" className="range-slider w-full" min="10" max="200" step="5" value={budget} onChange={e => setBudget(+e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Drain Blockage: <span style={{ color: 'var(--color-risk-high)', fontFamily: 'monospace' }}>{blockage}%</span>
                </label>
                <input type="range" className="range-slider w-full" min="0" max="100" step="10" value={blockage} onChange={e => setBlockage(+e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Funded Interventions: <span style={{ color: 'var(--color-risk-low)', fontFamily: 'monospace' }}>{interventions}</span>
                </label>
                <input type="range" className="range-slider w-full" min="0" max="20" step="1" value={interventions} onChange={e => setInterventions(+e.target.value)} />
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={run} disabled={loading}>
                {loading ? '⏳ Running…' : '▶ Run Scenario Comparison'}
              </button>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Compares simulated parametric outcomes against the observed baseline
              </span>
            </div>
          </div>
        </div>

        {error && <ErrorState message={error} onRetry={run} />}
        {loading && <LoadingState message="Running scenario simulation…" />}

        {result && !loading && (
          <>
            {/* Side-by-side comparison */}
            <div className="scenario-comparison">
              <div className="scenario-panel baseline">
                <div className="scenario-panel-title">Observed Baseline</div>
                <div className="scenario-panel-value">{baseline.average_risk_score}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14 }}>Average risk score / 100</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries(baseline.risk_distribution).map(([lvl, cnt]) => (
                    <div key={lvl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ textTransform: 'capitalize' }}>{lvl}</span>
                      <strong>{cnt}</strong>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Est. consequence exposure: ₹{baseline.estimated_consequence_exposure_lakhs}L
                </div>
              </div>

              <div className="scenario-panel simulated">
                <div className="scenario-panel-title">{simulated.label}</div>
                <div className="scenario-panel-value">{simulated.average_risk_score}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span
                    className={`scenario-delta ${simulated.risk_score_delta > 0 ? 'up' : (simulated.risk_score_delta < 0 ? 'down' : 'neutral')}`}
                  >
                    {simulated.risk_score_delta > 0 ? '▲' : '▼'} {Math.abs(simulated.risk_score_delta).toFixed(1)} pts
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>vs baseline</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries(simulated.risk_distribution).map(([lvl, cnt]) => {
                    const base = baseline.risk_distribution[lvl]
                    const delta = cnt - base
                    return (
                      <div key={lvl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ textTransform: 'capitalize' }}>{lvl}</span>
                        <span>
                          <strong>{cnt}</strong>
                          {delta !== 0 && (
                            <span style={{ fontSize: 11, color: delta > 0 ? 'var(--color-risk-high)' : 'var(--color-risk-low)', marginLeft: 6 }}>
                              ({delta > 0 ? '+' : ''}{delta})
                            </span>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Est. consequence exposure: ₹{simulated.estimated_consequence_exposure_lakhs}L
                  {simulated.exposure_delta_lakhs !== 0 && (
                    <span style={{ color: simulated.exposure_delta_lakhs > 0 ? 'var(--color-risk-high)' : 'var(--color-risk-low)', marginLeft: 6 }}>
                      ({simulated.exposure_delta_lakhs > 0 ? '+' : ''}₹{simulated.exposure_delta_lakhs}L)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Risk distribution comparison chart */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Risk Distribution Comparison</div>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={riskDistData} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
                    <XAxis dataKey="level" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="baseline" name="Baseline" fill="var(--color-navy)" opacity={0.6} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="simulated" name="Simulated" fill="var(--color-teal)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Assessment */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Scenario Assessment</div>
              </div>
              <div className="card-body">
                <div style={{ padding: '14px 16px', background: 'var(--color-bg)', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 13, lineHeight: 1.7, color: 'var(--color-text-primary)', marginBottom: 12 }}>
                  {comparison.assessment}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-teal)', fontWeight: 600, marginBottom: 6 }}>
                  🎯 {simulated.interventions_efficacy}
                </div>
                <div style={{ marginTop: 14, fontSize: 12, color: 'var(--color-text-muted)', padding: '8px 12px', background: 'rgba(124,58,237,0.05)', borderRadius: 6, border: '1px solid rgba(124,58,237,0.12)' }}>
                  ⚠ {result.disclaimer}
                </div>
              </div>
            </div>

            {/* Scenario metadata */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
              {[
                { label: 'Rainfall', value: `${meta.rainfall_multiplier}×` },
                { label: 'Blockage', value: `${meta.drain_blockage_pct}%` },
                { label: 'Budget', value: `₹${meta.allocated_budget_lakhs}L` },
                { label: 'Interventions', value: meta.implemented_interventions },
                { label: 'Direction', value: comparison.risk_direction },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--color-surface)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-navy)', marginBottom: 3, fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{label}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {!result && !loading && !error && (
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>⚙️</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Configure & Run a Scenario</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
                Select a rainfall scenario, adjust the parameters, and run the simulation to compare
                outcomes against the observed baseline.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
