import { useState } from 'react'
import MapComponent from '../components/MapComponent'
import { ProvenanceBadge, RiskBadge } from '../components/Badges'
import { formatCoord, truncate } from '../utils'
import { X, Info } from 'lucide-react'

export default function InfrastructureMap() {
  const [selectedFeature, setSelectedFeature] = useState(null)

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-title">Infrastructure Map</div>
          <div className="page-header-subtitle">
            Chennai GIS Layers — Toggle layers using the controls on the map
          </div>
        </div>
        <div className="page-header-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
            <Info size={14} />
            Click any feature to view details
          </div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* Map */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <MapComponent
              height={580}
              initialLayers={['hotspots', 'stagnation', 'basins', 'drains', 'healthcare', 'groundwater']}
              onFeatureSelect={setSelectedFeature}
            />

            <div className="terrain-warning" style={{ marginTop: 10 }}>
              <span>⚠</span>
              <span><strong>Synthetic Terrain Notice:</strong> Any terrain or elevation layer displayed is synthetic demonstration data only — not validated against a real DEM. Road and stormwater drain datasets are sampled from the full dataset (10,257 drains / 34,042 road segments) for responsive map rendering.</span>
            </div>
          </div>

          {/* Side panel */}
          <div style={{ width: 300, flexShrink: 0 }}>
            {selectedFeature ? (
              <div className="card">
                <div className="card-header" style={{ justifyContent: 'space-between' }}>
                  <div className="card-title">
                    <Info size={15} />
                    Feature Details
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSelectedFeature(null)}
                    style={{ padding: '2px 6px' }}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                      {selectedFeature.name || selectedFeature.location || selectedFeature.subbasin || 'Unnamed Feature'}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {selectedFeature._layer && (
                        <span style={{
                          fontSize: 10.5, padding: '2px 7px', borderRadius: 4,
                          background: 'rgba(8,127,140,0.1)', color: 'var(--color-teal)',
                          fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em'
                        }}>
                          {selectedFeature._layer.replace(/_/g, ' ')}
                        </span>
                      )}
                      {selectedFeature.provenance && (
                        <ProvenanceBadge provenance={selectedFeature.provenance} />
                      )}
                    </div>
                  </div>

                  {(selectedFeature.lat || selectedFeature.lon) && (
                    <div style={{ padding: '8px 10px', background: 'var(--color-bg)', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Coordinates</div>
                      <div className="font-mono" style={{ fontSize: 12, color: 'var(--color-text-primary)' }}>
                        {formatCoord(selectedFeature.lat)}°N, {formatCoord(selectedFeature.lon)}°E
                      </div>
                    </div>
                  )}

                  {/* Dynamic attributes */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 6 }}>
                      Available Attributes
                    </div>
                    {Object.entries(selectedFeature)
                      .filter(([k, v]) => !['_layer', 'properties', 'coordinates'].includes(k) && v != null && typeof v !== 'object' && String(v).trim())
                      .slice(0, 12)
                      .map(([k, v]) => (
                        <div key={k} style={{
                          display: 'flex', justifyContent: 'space-between', gap: 8,
                          padding: '5px 0', borderBottom: '1px solid var(--color-divider)',
                          fontSize: 12
                        }}>
                          <span style={{ color: 'var(--color-text-secondary)', flexShrink: 0, minWidth: 80 }}>
                            {k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </span>
                          <span style={{ color: 'var(--color-text-primary)', textAlign: 'right', fontWeight: 500 }}>
                            {truncate(String(v), 32)}
                          </span>
                        </div>
                      ))
                    }
                  </div>

                  {selectedFeature.source && (
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', paddingTop: 6, borderTop: '1px solid var(--color-divider)', lineHeight: 1.4 }}>
                      Source: {selectedFeature.source}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-body" style={{ textAlign: 'center', padding: 32 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🗺️</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                    Select a Map Feature
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    Click any point or line on the map to view its available attributes, data provenance, and source information.
                  </div>
                </div>
              </div>
            )}

            {/* Layer Legend */}
            <div className="card" style={{ marginTop: 14 }}>
              <div className="card-header">
                <div className="card-title" style={{ fontSize: 13 }}>Data Provenance</div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  ['OBSERVED', 'observed', 'Directly from a source dataset'],
                  ['DERIVED', 'derived', 'Calculated from observed records'],
                  ['ESTIMATED', 'estimated', 'Estimated from documented method'],
                  ['SIMULATED', 'simulated', 'Generated by scenario model'],
                ].map(([label, cls, desc]) => (
                  <div key={label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <ProvenanceBadge provenance={label} />
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.4, paddingTop: 2 }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
