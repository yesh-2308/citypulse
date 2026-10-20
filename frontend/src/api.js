const API_BASE = '/api'

async function request(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
      throw new Error(err.detail || `Request failed: ${res.status}`)
    }
    return await res.json()
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Backend server unavailable. Please ensure the FastAPI server is running on port 8000.')
    }
    throw err
  }
}

export const api = {
  health: () => request('/health'),
  dataStatus: () => request('/data-status'),
  kpis: () => request('/kpis'),

  locations: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString()
    return request(`/locations${qs ? '?' + qs : ''}`)
  },
  locationById: (id) => request(`/locations/${id}`),
  groundwater: () => request('/groundwater'),
  quality: () => request('/quality'),
  resources: () => request('/resources'),
  rainfall: () => request('/rainfall'),

  layer: (name) => request(`/layers/${name}`),

  analyzeRisk: (body) => request('/risk/analyze', { method: 'POST', body: JSON.stringify(body) }),
  simulateCascade: (body) => request('/cascade/simulate', { method: 'POST', body: JSON.stringify(body) }),
  optimizeBudget: (body) => request('/budget/optimize', { method: 'POST', body: JSON.stringify(body) }),
  runScenario: (body) => request('/scenarios/run', { method: 'POST', body: JSON.stringify(body) }),
}
