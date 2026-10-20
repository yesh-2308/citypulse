export function getRiskColor(level) {
  const map = {
    'Critical': '#DC2626',
    'High': '#EA580C',
    'Moderate': '#EAB308',
    'Low': '#16A34A',
  }
  return map[level] || '#64748B'
}

export function getRiskClass(level) {
  const map = {
    'Critical': 'critical',
    'High': 'high',
    'Moderate': 'moderate',
    'Low': 'low',
  }
  return map[level] || ''
}

export function getProvenanceClass(prov) {
  const map = {
    'OBSERVED': 'observed',
    'DERIVED': 'derived',
    'ESTIMATED': 'estimated',
    'SIMULATED': 'simulated',
    'ASSUMED': 'estimated',
  }
  const key = (prov || '').split('(')[0].trim().toUpperCase()
  return map[key] || 'observed'
}

export function getFactorColor(score) {
  if (score >= 75) return 'var(--color-risk-critical)'
  if (score >= 55) return 'var(--color-risk-high)'
  if (score >= 35) return 'var(--color-risk-moderate)'
  return 'var(--color-risk-low)'
}

export function formatCoord(num) {
  return typeof num === 'number' ? num.toFixed(5) : '—'
}

export function formatNum(n, decimals = 1) {
  if (n == null || n === '') return '—'
  return typeof n === 'number' ? n.toFixed(decimals) : n
}

export function formatLakhs(n) {
  if (n == null) return '—'
  return `₹${Number(n).toFixed(2)} L`
}

export function truncate(str, n = 36) {
  if (!str) return '—'
  return str.length > n ? str.slice(0, n) + '…' : str
}
