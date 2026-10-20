import { useState, useCallback, useEffect } from 'react'
import { api } from '../api'
import { LoadingState, ErrorState } from '../components/States'
import { formatLakhs, truncate } from '../utils'
import { Coins, CheckCircle, XCircle, TrendingUp, BarChart2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function BudgetOptimizer() {
  const [budget, setBudget] = useState(50)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const runOptimizer = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await api.optimizeBudget({ total_budget_lakhs: budget, strategy: 'optimal_cost_benefit' })
      setResult(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [budget])

  useEffect(() => { runOptimizer() }, [runOptimizer])

  const plan = result?.optimal_plan
  const baseline = result?.naive_baseline_comparison

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-title">Budget Optimizer</div>
          <div className="page-header-subtitle">
            Cost-benefit knapsack maintenance prioritization · Compares against risk-first baseline
          </div>
        </div>
        <div className="page-header-right">
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>ESTIMATED costs · Transparent planning model</span>
        </div>
      </div>

      <div className="page-body">
        {/* Budget Input */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Coins size={16} />Budget Configuration</div>
          </div>
          <div className="card-body">
            <div style={{ maxWidth: 500 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Total Available Maintenance Budget:{' '}
                <span style={{ color: 'var(--color-teal)', fontFamily: 'JetBrains Mono, monospace' }}>
                  ₹{budget} Lakhs
                </span>
              </label>
              <input
                type="range" className="range-slider w-full"
                min="10" max="200" step="5"
                value={budget}
                onChange={e => setBudget(parseInt(e.target.value))}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                <span>₹10 L</span><span>₹50 L</span><span>₹100 L</span><span>₹200 L</span>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Intervention costs are transparent planning estimates (civil maintenance benchmarks). Not official tender pricing.
              </div>
            </div>
          </div>
        </div>

        {loading && <LoadingState message="Optimizing maintenance budget allocation…" />}
        {error && <ErrorState message={error} onRetry={runOptimizer} />}

        {result && !loading && (
          <>
            {/* Comparison KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card" style={{ borderLeft: '3px solid var(--color-teal)' }}>
                <div className="card-header">
                  <div className="card-title"><TrendingUp size={16} color="var(--color-teal)" />CityPulse Optimal Plan</div>
                </div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      { label: 'Interventions Selected', value: plan.selected_count },
                      { label: 'Total Cost', value: formatLakhs(plan.total_cost_lakhs) },
                      { label: 'Budget Remaining', value: formatLakhs(plan.remaining_budget_lakhs) },
                      { label: 'Aggregate Benefit', value: plan.total_estimated_benefit.toFixed(1) + ' pts' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(8,127,140,0.05)', border: '1px solid rgba(8,127,140,0.12)' }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-navy)' }}>{value}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                      Budget utilization
                    </div>
                    <div className="budget-bar-track">
                      <div
                        className="budget-bar-fill"
                        style={{ width: `${Math.min(100, (plan.total_cost_lakhs / budget) * 100)}%` }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>
                      {((plan.total_cost_lakhs / budget) * 100).toFixed(0)}% of ₹{budget}L utilized
                    </div>
                  </div>
                </div>
              </div>

              <div className="card" style={{ borderLeft: '3px solid var(--color-border)' }}>
                <div className="card-header">
                  <div className="card-title"><BarChart2 size={16} />Risk-First Baseline</div>
                </div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      { label: 'Interventions Selected', value: baseline.selected_count },
                      { label: 'Total Cost', value: formatLakhs(baseline.total_cost_lakhs) },
                      { label: 'Budget Remaining', value: formatLakhs(baseline.remaining_budget_lakhs) },
                      { label: 'Aggregate Benefit', value: baseline.total_estimated_benefit.toFixed(1) + ' pts' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-secondary)' }}>{value}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, padding: '10px 12px', background: plan.total_estimated_benefit >= baseline.total_estimated_benefit ? 'var(--color-risk-low-bg)' : 'var(--color-risk-high-bg)', borderRadius: 6, border: `1px solid ${plan.total_estimated_benefit >= baseline.total_estimated_benefit ? 'var(--color-risk-low-border)' : 'var(--color-risk-high-border)'}` }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: plan.total_estimated_benefit >= baseline.total_estimated_benefit ? 'var(--color-risk-low)' : 'var(--color-risk-high)' }}>
                      CityPulse plan: +{baseline.benefit_gain_pct_over_baseline}% more benefit
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 3 }}>{baseline.assessment}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefit comparison chart */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Plan Comparison — Benefit vs Cost</div>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { name: 'Optimal (CityPulse)', benefit: plan.total_estimated_benefit, cost: plan.total_cost_lakhs, fill: '#087F8C' },
                    { name: 'Baseline (Risk-First)', benefit: baseline.total_estimated_benefit, cost: baseline.total_cost_lakhs, fill: '#94A3B8' }
                  ]} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11.5 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="benefit" name="Aggregate Benefit" radius={[4, 4, 0, 0]}>
                      {[{ fill: '#087F8C' }, { fill: '#94A3B8' }].map((e, i) => (
                        <Cell key={i} fill={e.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Selected Interventions Table */}
            <div className="card">
              <div className="card-header">
                <div className="card-title"><CheckCircle size={16} color="var(--color-risk-low)" />Selected Interventions</div>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{plan.selected_count} actions · Total: {formatLakhs(plan.total_cost_lakhs)}</span>
              </div>
              <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Intervention</th>
                      <th>Category</th>
                      <th>Cost (Lakhs)</th>
                      <th>Benefit Score</th>
                      <th>Cost-Benefit</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.selected_interventions.map((intv, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{truncate(intv.title, 44)}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{truncate(intv.selection_reason, 52)}</div>
                        </td>
                        <td style={{ fontSize: 12 }}>{intv.category}</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, fontWeight: 600, color: 'var(--color-navy)' }}>
                          {formatLakhs(intv.cost_lakhs)}
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5 }}>{intv.estimated_benefit_score.toFixed(1)}</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, color: 'var(--color-teal)' }}>{intv.cost_benefit_ratio}</td>
                        <td style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{intv.confidence}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rejected Interventions */}
            {plan.rejected_interventions?.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title"><XCircle size={16} color="var(--color-text-muted)" />Excluded Interventions (Budget Exceeded)</div>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{plan.rejected_count} items beyond budget</span>
                </div>
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr><th>Intervention</th><th>Cost</th><th>Reason</th></tr>
                    </thead>
                    <tbody>
                      {plan.rejected_interventions.slice(0, 8).map((intv, i) => (
                        <tr key={i} style={{ opacity: 0.6 }}>
                          <td style={{ fontSize: 12 }}>{truncate(intv.title, 44)}</td>
                          <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{formatLakhs(intv.cost_lakhs)}</td>
                          <td style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{truncate(intv.rejection_reason, 48)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ padding: '12px 14px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              ⓘ {result.disclaimer}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
