import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { api } from '../api'

maplibregl.setWorkerUrl(maplibreWorkerUrl)

export const LAYER_CONFIG = {
  hotspots: {
    label: 'Flood Hotspots',
    color: '#DC2626',
    type: 'point',
    apiName: 'hotspots',
    symbol: '🔴',
    description: 'Historical 2015 inundation hotspots'
  },
  stagnation: {
    label: 'Water Stagnation',
    color: '#EAB308',
    type: 'point',
    apiName: 'stagnation',
    symbol: '🟡',
    description: 'Chronic water stagnation survey points'
  },
  basins: {
    label: 'Drainage Basins',
    color: '#0284C7',
    type: 'line',
    apiName: 'basins',
    symbol: '🌊',
    description: 'Natural river channels and basin streams'
  },
  drains: {
    label: 'Stormwater Drains',
    color: '#087F8C',
    type: 'line',
    apiName: 'drains',
    symbol: '⬛',
    description: 'Arterial and secondary stormwater network'
  },
  roads: {
    label: 'Road Network',
    color: '#64748B',
    type: 'line',
    apiName: 'roads',
    symbol: '🛣️',
    description: 'Key Chennai transportation corridors'
  },
  healthcare: {
    label: 'Healthcare Facilities',
    color: '#7C3AED',
    type: 'point',
    apiName: 'healthcare',
    symbol: '🏥',
    description: 'UCHC & UPHC emergency centers'
  },
  groundwater: {
    label: 'Groundwater Wells',
    color: '#2563EB',
    type: 'point',
    apiName: 'groundwater',
    symbol: '💧',
    description: 'CGWB monitoring stations'
  },
  terrain: {
    label: 'Synthetic Terrain (Demo)',
    color: '#D97706',
    type: 'point',
    apiName: 'terrain',
    symbol: '⛰️',
    description: 'Synthetic demonstration elevation grid'
  }
}

// Keyless OpenFreeMap Liberty vector style with OSM & OpenMapTiles attribution
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

export default function InfrastructureMapComponent({
  height = 540,
  initialLayers = ['hotspots', 'stagnation', 'basins', 'drains', 'healthcare', 'groundwater'],
  selectedFeature = null,
  onFeatureSelect = () => {}
}) {
  const mapContainerRef = useRef(null)
  const mapInstance = useRef(null)
  const loadedLayers = useRef({})
  const popupRef = useRef(null)
  const onFeatureSelectRef = useRef(onFeatureSelect)

  const [visibleLayers, setVisibleLayers] = useState(
    Object.fromEntries(Object.keys(LAYER_CONFIG).map(k => [k, initialLayers.includes(k)]))
  )
  const [featureCounts, setFeatureCounts] = useState({})
  const [layerLoading, setLayerLoading] = useState({})
  const [layerError, setLayerError] = useState({})
  const [mapReady, setMapReady] = useState(false)
  const [initError, setInitError] = useState(null)

  // Keep callback ref updated to prevent stale closures
  useEffect(() => {
    onFeatureSelectRef.current = onFeatureSelect
  }, [onFeatureSelect])

  // Initialize MapLibre GL Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstance.current) return

    let map = null
    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLE,
        center: [80.24, 13.06], // Central Chennai coordinates
        zoom: 11,
        minZoom: 9,
        maxZoom: 18,
        maxBounds: [[79.80, 12.65], [80.70, 13.55]] // Chennai metropolitan envelope
      })

      map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right')
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left')

      popupRef.current = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        maxWidth: '340px'
      })

      map.on('load', () => {
        mapInstance.current = map
        setMapReady(true)
        setInitError(null)
        // Force dimension recalculation after layout settles
        setTimeout(() => {
          if (mapInstance.current) mapInstance.current.resize()
        }, 120)
      })

      map.on('error', (e) => {
        // Log style or tile issues without halting entire application
        if (e && e.error && e.error.message && !e.error.message.includes('404')) {
          console.warn('MapLibre GL Notice:', e.error.message)
        }
      })
    } catch (err) {
      console.error('Failed to initialize MapLibre GL:', err)
      setInitError(err.message || 'WebGL initialization error. Check your graphics acceleration.')
    }

    // Handle container resizing (e.g. sidebar toggle or viewport changes)
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstance.current) {
        mapInstance.current.resize()
      }
    })
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current)
    }

    const handleWindowResize = () => {
      if (mapInstance.current) {
        mapInstance.current.resize()
      }
    }
    window.addEventListener('resize', handleWindowResize)

    return () => {
      window.removeEventListener('resize', handleWindowResize)
      resizeObserver.disconnect()
      if (popupRef.current) popupRef.current.remove()
      if (map) {
        map.remove()
        mapInstance.current = null
      }
      setMapReady(false)
    }
  }, [])

  // Sync selected feature with a map highlight marker without changing coordinates
  useEffect(() => {
    if (!mapReady || !mapInstance.current || !selectedFeature) return
    const map = mapInstance.current

    if (selectedFeature.lon && selectedFeature.lat) {
      const coords = [Number(selectedFeature.lon), Number(selectedFeature.lat)]
      if (!isNaN(coords[0]) && !isNaN(coords[1])) {
        if (!popupRef.current.isOpen()) {
          popupRef.current
            .setLngLat(coords)
            .setHTML(buildPopupHtml(selectedFeature, selectedFeature._layer ? LAYER_CONFIG[selectedFeature._layer]?.label : 'Selected Asset'))
            .addTo(map)
        }
      }
    }
  }, [selectedFeature, mapReady])

  // Manage dynamic GeoJSON layer loading and visibility
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return
    const map = mapInstance.current

    Object.entries(visibleLayers).forEach(([key, isVisible]) => {
      const cfg = LAYER_CONFIG[key]
      if (!cfg) return

      const allSublayerIds = [
        key + '_line',
        key + '_line_hit',
        key + '_circle_outer',
        key + '_cluster_circles',
        key + '_cluster_count'
      ]

      if (!isVisible) {
        // Toggle visibility off for existing layers
        allSublayerIds.forEach(lid => {
          if (map.getLayer(lid)) {
            map.setLayoutProperty(lid, 'visibility', 'none')
          }
        })
        return
      }

      // If layers already exist in MapLibre, turn visibility on
      let alreadyExists = false
      allSublayerIds.forEach(lid => {
        if (map.getLayer(lid)) {
          map.setLayoutProperty(lid, 'visibility', 'visible')
          alreadyExists = true
        }
      })

      // If already added to map, do not fetch again
      if (alreadyExists || loadedLayers.current[key]) return

      // Fetch layer GeoJSON from backend API
      setLayerLoading(prev => ({ ...prev, [key]: true }))
      api.layer(cfg.apiName)
        .then(data => {
          if (!mapInstance.current) return
          if (!data || !data.features || !data.features.length) {
            setLayerError(prev => ({ ...prev, [key]: 'No features returned' }))
            return
          }

          const sourceId = `src_${key}`
          setFeatureCounts(prev => ({ ...prev, [key]: data.features.length }))

          // Add GeoJSON source
          if (!map.getSource(sourceId)) {
            const shouldCluster = cfg.type === 'point' && data.features.length > 300 && key !== 'terrain'
            map.addSource(sourceId, {
              type: 'geojson',
              data,
              cluster: shouldCluster,
              clusterMaxZoom: 14,
              clusterRadius: 40
            })
          } else {
            map.getSource(sourceId).setData(data)
          }

          // Point Layer rendering
          if (cfg.type === 'point') {
            const hasCluster = map.getSource(sourceId)?.cluster

            if (hasCluster) {
              // Cluster circle
              if (!map.getLayer(key + '_cluster_circles')) {
                map.addLayer({
                  id: key + '_cluster_circles',
                  type: 'circle',
                  source: sourceId,
                  filter: ['has', 'point_count'],
                  paint: {
                    'circle-color': cfg.color,
                    'circle-opacity': 0.78,
                    'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 28, 150, 34],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff'
                  }
                })

                map.on('click', key + '_cluster_circles', (e) => {
                  const features = map.queryRenderedFeatures(e.point, { layers: [key + '_cluster_circles'] })
                  const clusterId = features[0].properties.cluster_id
                  map.getSource(sourceId).getClusterExpansionZoom(clusterId, (err, zoom) => {
                    if (err) return
                    map.easeTo({ center: features[0].geometry.coordinates, zoom: zoom + 0.5 })
                  })
                })

                map.on('mouseenter', key + '_cluster_circles', () => { map.getCanvas().style.cursor = 'pointer' })
                map.on('mouseleave', key + '_cluster_circles', () => { map.getCanvas().style.cursor = '' })
              }

              // Cluster count label
              if (!map.getLayer(key + '_cluster_count')) {
                map.addLayer({
                  id: key + '_cluster_count',
                  type: 'symbol',
                  source: sourceId,
                  filter: ['has', 'point_count'],
                  layout: {
                    'text-field': '{point_count_abbreviated}',
                    'text-font': ['Noto Sans Bold'],
                    'text-size': 12
                  },
                  paint: { 'text-color': '#ffffff' }
                })
              }
            }

            // Unclustered individual points
            if (!map.getLayer(key + '_circle_outer')) {
              map.addLayer({
                id: key + '_circle_outer',
                type: 'circle',
                source: sourceId,
                filter: hasCluster ? ['!', ['has', 'point_count']] : undefined,
                paint: {
                  'circle-radius': key === 'terrain' ? 4 : (key === 'groundwater' ? 6 : 7),
                  'circle-color': cfg.color,
                  'circle-opacity': key === 'terrain' ? 0.75 : 0.88,
                  'circle-stroke-width': key === 'terrain' ? 1 : 1.5,
                  'circle-stroke-color': '#ffffff'
                }
              })

              map.on('click', key + '_circle_outer', (e) => {
                if (!e.features || !e.features[0]) return
                const feat = e.features[0]
                const props = feat.properties || {}
                const coords = feat.geometry.coordinates.slice()

                popupRef.current
                  .setLngLat(coords)
                  .setHTML(buildPopupHtml(props, cfg.label))
                  .addTo(map)

                if (onFeatureSelectRef.current) {
                  onFeatureSelectRef.current({
                    ...props,
                    _layer: key,
                    lon: coords[0],
                    lat: coords[1]
                  })
                }
              })

              map.on('mouseenter', key + '_circle_outer', () => { map.getCanvas().style.cursor = 'pointer' })
              map.on('mouseleave', key + '_circle_outer', () => { map.getCanvas().style.cursor = '' })
            }
          } else {
            // Line Layer rendering (basins, drains, roads)
            if (!map.getLayer(key + '_line')) {
              map.addLayer({
                id: key + '_line',
                type: 'line',
                source: sourceId,
                layout: {
                  'line-join': 'round',
                  'line-cap': 'round'
                },
                paint: {
                  'line-color': cfg.color,
                  'line-width': key === 'basins' ? 2.6 : (key === 'roads' ? 1.2 : 1.8),
                  'line-opacity': key === 'roads' ? 0.55 : 0.85
                }
              })

              // Invisible wider buffer for easy clicking on thin lines
              if (!map.getLayer(key + '_line_hit')) {
                map.addLayer({
                  id: key + '_line_hit',
                  type: 'line',
                  source: sourceId,
                  layout: { 'line-join': 'round', 'line-cap': 'round' },
                  paint: {
                    'line-color': 'transparent',
                    'line-width': 12
                  }
                })

                map.on('click', key + '_line_hit', (e) => {
                  if (!e.features || !e.features[0]) return
                  const feat = e.features[0]
                  const props = feat.properties || {}
                  popupRef.current
                    .setLngLat(e.lngLat)
                    .setHTML(buildPopupHtml(props, cfg.label))
                    .addTo(map)

                  if (onFeatureSelectRef.current) {
                    onFeatureSelectRef.current({
                      ...props,
                      _layer: key,
                      lon: e.lngLat.lng,
                      lat: e.lngLat.lat
                    })
                  }
                })

                map.on('mouseenter', key + '_line_hit', () => { map.getCanvas().style.cursor = 'pointer' })
                map.on('mouseleave', key + '_line_hit', () => { map.getCanvas().style.cursor = '' })
              }
            }
          }

          loadedLayers.current[key] = true
          setLayerError(prev => ({ ...prev, [key]: null }))
        })
        .catch(err => {
          console.error(`Error loading layer ${key}:`, err)
          setLayerError(prev => ({ ...prev, [key]: err.message || 'Connection failed' }))
        })
        .finally(() => {
          setLayerLoading(prev => ({ ...prev, [key]: false }))
        })
    })
  }, [mapReady, visibleLayers])

  const toggleLayer = (key) => {
    setVisibleLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const reloadMap = () => {
    setInitError(null)
    setMapReady(false)
    loadedLayers.current = {}
    if (mapInstance.current) {
      mapInstance.current.remove()
      mapInstance.current = null
    }
  }

  return (
    <div className="map-container" style={{ height, position: 'relative' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#F1F5F9' }} />

      {/* Initialization Loading / Error Overlay */}
      {!mapReady && !initError && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(241, 245, 249, 0.85)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 10, zIndex: 20
        }}>
          <div className="loading-spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-navy)' }}>
            Loading Chennai Infrastructure Map...
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            MapLibre GL Vector Engine
          </div>
        </div>
      )}

      {initError && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(255, 255, 255, 0.95)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 24, textAlign: 'center', gap: 12, zIndex: 30
        }}>
          <div style={{ fontSize: 28 }}>⚠️</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-risk-critical)' }}>
            Map Engine Error
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', maxWidth: 360, lineHeight: 1.5 }}>
            {initError}
          </div>
          <button className="btn btn-primary btn-sm" onClick={reloadMap} style={{ marginTop: 6 }}>
            Retry Map Load
          </button>
        </div>
      )}

      {/* Interactive Layer Toggle Controls */}
      <div className="layer-controls" style={{ maxHeight: '82%', overflowY: 'auto' }}>
        <div className="layer-controls-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Infrastructure Layers</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-teal)' }}>
            {Object.values(visibleLayers).filter(Boolean).length} Active
          </span>
        </div>
        {Object.entries(LAYER_CONFIG).map(([key, cfg]) => {
          const count = featureCounts[key]
          const isVisible = visibleLayers[key] || false
          return (
            <label key={key} className="layer-toggle" title={`${cfg.label} — ${cfg.description}`}>
              <input
                type="checkbox"
                checked={isVisible}
                onChange={() => toggleLayer(key)}
              />
              <span style={{
                width: 9, height: 9,
                borderRadius: cfg.type === 'point' ? '50%' : '2px',
                background: cfg.color,
                display: 'inline-block',
                flexShrink: 0
              }} />
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cfg.label}
              </span>
              {layerLoading[key] && (
                <span style={{ fontSize: 10, color: 'var(--color-teal)', fontWeight: 600 }}>…</span>
              )}
              {layerError[key] && (
                <span style={{ fontSize: 11, color: 'var(--color-risk-critical)', fontWeight: 700 }} title={layerError[key]}>!</span>
              )}
              {!layerLoading[key] && !layerError[key] && count != null && (
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  ({count.toLocaleString()})
                </span>
              )}
            </label>
          )
        })}
      </div>

      {/* Map Legend */}
      <div className="map-legend">
        <div className="map-legend-title">Visible Legend</div>
        {Object.entries(LAYER_CONFIG)
          .filter(([k]) => visibleLayers[k])
          .map(([key, cfg]) => (
            <div key={key} className="legend-item">
              {cfg.type === 'point'
                ? <span className="legend-dot" style={{ background: cfg.color }} />
                : <span className="legend-line" style={{ background: cfg.color }} />
              }
              <span>{cfg.label}</span>
            </div>
          ))
        }
        {!Object.values(visibleLayers).some(Boolean) && (
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Enable a layer above</div>
        )}
      </div>

      {/* Chennai Spatial Coordinate Bounds Header */}
      <div style={{
        position: 'absolute', top: 12, left: 12,
        background: 'rgba(255,255,255,0.95)', border: '1px solid var(--color-border)',
        borderRadius: 6, padding: '6px 12px', fontSize: 11,
        color: 'var(--color-text-primary)', maxWidth: 240, lineHeight: 1.4,
        boxShadow: 'var(--shadow-sm)', zIndex: 10
      }}>
        <div style={{ fontWeight: 700, color: 'var(--color-navy)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>📍 Chennai Metropolitan GIS</span>
        </div>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 10.5, marginTop: 2 }}>
          Extent: 12.85°N–13.25°N · 80.05°E–80.35°E
        </div>
      </div>
    </div>
  )
}

function buildPopupHtml(props, layerLabel) {
  const skip = ['id', 'coordinates', 'provenance', 'source', 'properties', '_layer']
  const rows = Object.entries(props)
    .filter(([k]) => !skip.includes(k) && typeof props[k] !== 'object' && props[k] != null && String(props[k]).trim())
    .slice(0, 8)

  return `
    <div style="font-family: Inter, sans-serif; font-size: 12.5px; color:#172B4D; line-height:1.4;">
      <div style="font-weight:700; color:#142B4A; margin-bottom:4px; font-size:13.5px; word-break:break-word;">
        ${props.name || props.location || props.subbasin || props.road_name || layerLabel}
      </div>
      <div style="display:inline-block; font-size:10px; font-weight:600; padding:2px 6px; border-radius:3px; background:#e0f2fe; color:#0284C7; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;">
        ${layerLabel}
      </div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:6px;">
        ${rows.map(([k, v]) => `
          <tr>
            <td style="color:#64748B; padding:2px 0; font-size:11px; white-space:nowrap; padding-right:8px;">${k.replace(/_/g, ' ')}</td>
            <td style="color:#172B4D; font-size:11.5px; font-weight:500; font-family:'JetBrains Mono',monospace;">${v}</td>
          </tr>
        `).join('')}
      </table>
      ${props.provenance ? `
        <div style="margin-top:6px; font-size:10px; color:#64748B; border-top:1px solid #DCE3EA; padding-top:4px;">
          <strong>Provenance:</strong> ${props.provenance}
          ${props.source ? `· <em>${props.source}</em>` : ''}
        </div>
      ` : ''}
      ${props.disclaimer ? `
        <div style="margin-top:4px; font-size:9.5px; color:#D97706; background:#FEF3C7; padding:3px 6px; border-radius:3px;">
          ⚠ ${props.disclaimer}
        </div>
      ` : ''}
    </div>
  `
}
