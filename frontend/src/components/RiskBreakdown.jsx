import { getFactorColor } from '../utils'
import { ProvenanceBadge } from './Badges'

export default function RiskBreakdown({ result }) {
  if (!result) return null

  const { composite_risk_score, risk_level, explanation_summary, factors, validation_note } = result

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header score */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)'
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          border: `3px solid ${riskBorderColor(risk_level)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: riskBorderColor(risk_level) }}>
            {Math.round(composite_risk_score)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {risk_level} Risk
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 3, lineHeight: 1.4 }}>
            {explanation_summary}
          </div>
        </div>
      </div>

      {/* Factor bars */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', marginBottom: 12 }}>
          Contributing Factors
        </div>
        <div className="factor-bar-container">
          {(factors || []).map((f, i) => (
            <div key={i} className="factor-item">
              <div className="factor-header">
                <span className="factor-name">{f.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11 }} className="text-muted">
                    w={((f.weight || 0) * 100).toFixed(0)}%
                  </span>
                  <span className="factor-score" style={{ color: getFactorColor(f.score) }}>
                    {f.score}/100
                  </span>
                </div>
              </div>
              <div className="factor-bar-track">
                <div
                  className="factor-bar-fill"
                  style={{ width: `${f.score}%`, background: getFactorColor(f.score) }}
                />
              </div>
              <div className="factor-explanation">{f.explanation}</div>
              <div style={{ marginTop: 3 }}>
                <ProvenanceBadge provenance={f.evidence_type} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Validation note */}
      {validation_note && (
        <div style={{
          fontSize: 11.5, color: 'var(--color-text-muted)',
          borderTop: '1px solid var(--color-divider)', paddingTop: 10, lineHeight: 1.5
        }}>
          ⓘ {validation_note}
        </div>
      )}
    </div>
  )
}

function riskBorderColor(level) {
  const m = { Critical: '#DC2626', High: '#EA580C', Moderate: '#EAB308', Low: '#16A34A' }
  return m[level] || '#64748B'
}
