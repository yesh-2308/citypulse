export function LoadingState({ message = 'Loading data…' }) {
  return (
    <div className="state-loading">
      <div className="spinner" />
      <div style={{ fontSize: 13.5, color: 'var(--color-text-secondary)' }}>{message}</div>
    </div>
  )
}

export function EmptyState({ icon = '📭', title = 'No data', description = 'No records match the current filters.' }) {
  return (
    <div className="state-empty">
      <div className="state-empty-icon">{icon}</div>
      <div className="state-empty-title">{title}</div>
      {description && <div className="state-empty-desc">{description}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-error">
      <div className="state-error-title">⚠ Error Loading Data</div>
      <div className="state-error-msg">{message}</div>
      {onRetry && (
        <button className="btn btn-danger btn-sm" onClick={onRetry} style={{ marginTop: 10 }}>
          Retry
        </button>
      )}
    </div>
  )
}
