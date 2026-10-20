import { getProvenanceClass } from '../utils'

export function ProvenanceBadge({ provenance }) {
  const label = (provenance || 'UNKNOWN').split('(')[0].trim().toUpperCase()
  const cls = getProvenanceClass(label)
  return (
    <span className={`provenance-badge ${cls}`}>{label}</span>
  )
}

export function RiskBadge({ level, score }) {
  if (!level) return null
  const cls = level.toLowerCase()
  return (
    <span className={`risk-badge ${cls}`}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: 'currentColor', display: 'inline-block', flexShrink: 0
      }} />
      {level}{score != null ? ` · ${score}` : ''}
    </span>
  )
}
