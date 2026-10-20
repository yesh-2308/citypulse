"""
CityPulse 1 - Backend FastAPI Application
Professional Urban Infrastructure Risk Intelligence & Budget Optimization Platform (Chennai, India)
"""

import os
import sys
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional

from backend.data_loader import data_loader
from backend.risk_engine import risk_engine
from backend.cascade_engine import cascade_engine
from backend.budget_optimizer import budget_optimizer
from backend.scenario_engine import scenario_engine

app = FastAPI(
    title="CityPulse 1 - Chennai Infrastructure Intelligence API",
    description="Decision-support platform for urban infrastructure vulnerability, cascading failure analysis, and budget optimization.",
    version="1.0.0"
)

# Enable CORS for local Vite dev server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pre-computed evaluated candidate infrastructure locations for fast dashboard rendering
cached_evaluated_locations: List[Dict[str, Any]] = []

@app.on_event("startup")
def startup_event():
    """Load datasets and pre-evaluate primary candidate infrastructure locations on startup."""
    print("CityPulse Backend: Initializing datasets...")
    data_loader.load_all()
    _precompute_evaluated_locations()
    print("CityPulse Backend: Ready.")

def _precompute_evaluated_locations():
    """Evaluates risk across representative Chennai infrastructure sites."""
    global cached_evaluated_locations
    evaluated = []

    # 1. Evaluate Flood Hotspots
    for hs in data_loader.flood_hotspots[:60]:
        res = risk_engine.evaluate_location(
            target_lat=hs["lat"],
            target_lon=hs["lon"],
            location_name=hs["name"],
            category="Historical Flood Hotspot",
            hotspots=data_loader.flood_hotspots,
            stagnations=data_loader.water_stagnation,
            drains=data_loader.stormwater_drains,
            gw_stations=data_loader.groundwater_level,
            rainfall_records=data_loader.rainfall_data
        )
        res["id"] = hs["id"]
        res["zone"] = hs.get("zone", "N/A")
        res["ward"] = hs.get("ward", "N/A")
        res["source_provenance"] = "OBSERVED (GCC 2015 Hotspots)"
        evaluated.append(res)

    # 2. Evaluate Chronic Water Stagnation Areas
    for st in data_loader.water_stagnation[:60]:
        res = risk_engine.evaluate_location(
            target_lat=st["lat"],
            target_lon=st["lon"],
            location_name=st["name"],
            category="Water Stagnation Area",
            hotspots=data_loader.flood_hotspots,
            stagnations=data_loader.water_stagnation,
            drains=data_loader.stormwater_drains,
            gw_stations=data_loader.groundwater_level,
            rainfall_records=data_loader.rainfall_data
        )
        res["id"] = st["id"]
        res["zone"] = st.get("zone", "N/A")
        res["division"] = st.get("division", "N/A")
        res["source_provenance"] = "OBSERVED (GCC Stagnation Survey)"
        evaluated.append(res)

    # 3. Evaluate Healthcare Facilities
    for hc in data_loader.healthcare_facilities[:40]:
        res = risk_engine.evaluate_location(
            target_lat=hc["lat"],
            target_lon=hc["lon"],
            location_name=hc["name"],
            category="Healthcare Facility",
            hotspots=data_loader.flood_hotspots,
            stagnations=data_loader.water_stagnation,
            drains=data_loader.stormwater_drains,
            gw_stations=data_loader.groundwater_level,
            rainfall_records=data_loader.rainfall_data
        )
        res["id"] = hc["id"]
        res["zone"] = hc.get("zone", "N/A")
        res["zone_name"] = hc.get("zone_name", "N/A")
        res["facility_type"] = hc.get("type", "Hospital/Centre")
        res["address"] = hc.get("address", "")
        res["source_provenance"] = "ESTIMATED Location (GCC Official Address)"
        evaluated.append(res)

    # 4. Evaluate Drainage Corridors
    for bd in data_loader.basin_drainage[:30]:
        res = risk_engine.evaluate_location(
            target_lat=bd["lat"],
            target_lon=bd["lon"],
            location_name=bd["name"],
            category="Drainage Basin / Stream",
            hotspots=data_loader.flood_hotspots,
            stagnations=data_loader.water_stagnation,
            drains=data_loader.stormwater_drains,
            gw_stations=data_loader.groundwater_level,
            rainfall_records=data_loader.rainfall_data
        )
        res["id"] = bd["id"]
        res["subbasin"] = bd.get("subbasin", "Chennai Basin")
        res["source_provenance"] = "OBSERVED (PWD / GCC Basin GIS)"
        evaluated.append(res)

    cached_evaluated_locations = evaluated

# -----------------
# Pydantic Schemas
# -----------------
class RiskAnalyzeRequest(BaseModel):
    lat: float
    lon: float
    location_name: Optional[str] = "Selected Map Location"
    category: Optional[str] = "Urban Infrastructure Asset"
    custom_weights: Optional[Dict[str, float]] = None
    rainfall_multiplier: Optional[float] = 1.0
    drain_blockage_pct: Optional[float] = 0.0

class CascadeSimulateRequest(BaseModel):
    trigger_feature_id: Optional[str] = None
    rainfall_severity: Optional[float] = 1.25
    drain_blockage_pct: Optional[float] = 50.0

class BudgetOptimizeRequest(BaseModel):
    total_budget_lakhs: Optional[float] = 50.0
    strategy: Optional[str] = "optimal_cost_benefit"

class ScenarioRunRequest(BaseModel):
    scenario_key: Optional[str] = "SEVERE_MONSOON"
    budget_lakhs: Optional[float] = 50.0
    drain_blockage_pct: Optional[float] = 30.0
    implemented_interventions_count: Optional[int] = 6

# -----------------
# API Endpoints
# -----------------

@app.get("/api/health")
def health_check():
    """Health check endpoint confirming backend operational status."""
    return {
        "status": "healthy",
        "service": "CityPulse 1 Intelligence Platform",
        "geographic_scope": "Chennai, Tamil Nadu, India",
        "datasets_ready": data_loader.is_loaded,
        "evaluated_locations_count": len(cached_evaluated_locations)
    }

@app.get("/api/data-status")
def get_data_status():
    """Returns provenance, record counts, and validation status for all ingested datasets."""
    return {
        "system": "CityPulse 1 Chennai Spatial Pipeline",
        "datasets": data_loader.data_status,
        "summary": {
            "total_datasets_registered": len(data_loader.data_status),
            "observed_datasets_count": sum(1 for v in data_loader.data_status.values() if v.get("provenance") == "OBSERVED"),
            "estimated_datasets_count": sum(1 for v in data_loader.data_status.values() if v.get("provenance") == "ESTIMATED"),
            "simulated_datasets_count": sum(1 for v in data_loader.data_status.values() if v.get("provenance") == "SIMULATED")
        },
        "synthetic_terrain_disclaimer": "Synthetic terrain — demonstration only; not validated against a real DEM."
    }

@app.get("/api/kpis")
def get_kpis():
    """Calculated KPI overview metrics based on loaded datasets and risk models."""
    total_features = (
        len(data_loader.flood_hotspots) +
        len(data_loader.water_stagnation) +
        len(data_loader.basin_drainage) +
        data_loader.data_status.get("stormwater_drains", {}).get("count", len(data_loader.stormwater_drains)) +
        data_loader.data_status.get("roadcenterlines", {}).get("count", len(data_loader.road_centerlines)) +
        len(data_loader.healthcare_facilities) +
        len(data_loader.groundwater_level)
    )

    crit_count = sum(1 for loc in cached_evaluated_locations if loc.get("risk_level") == "Critical")
    high_count = sum(1 for loc in cached_evaluated_locations if loc.get("risk_level") == "High")
    mod_count = sum(1 for loc in cached_evaluated_locations if loc.get("risk_level") == "Moderate")
    low_count = sum(1 for loc in cached_evaluated_locations if loc.get("risk_level") == "Low")

    return {
        "total_infrastructure_features_loaded": total_features,
        "mapped_locations_assessed": len(cached_evaluated_locations),
        "critical_priority_locations": crit_count,
        "high_priority_locations": high_count,
        "moderate_risk_locations": mod_count,
        "low_risk_locations": low_count,
        "total_stormwater_drain_length_km": data_loader.data_status.get("stormwater_drains", {}).get("total_length_km", 1845.2),
        "total_road_network_length_km": data_loader.data_status.get("roadcenterlines", {}).get("total_length_km", 2830.4),
        "active_hotspots_count": len(data_loader.flood_hotspots),
        "chronic_stagnation_points_count": len(data_loader.water_stagnation),
        "healthcare_facilities_monitored": len(data_loader.healthcare_facilities),
        "groundwater_wells_tracked": len(data_loader.groundwater_level),
        "average_modeled_risk_score": round(
            sum(loc.get("composite_risk_score", 0) for loc in cached_evaluated_locations) / max(1, len(cached_evaluated_locations)), 1
        ),
        "baseline_budget_available_lakhs": 50.0
    }

@app.get("/api/locations")
def get_locations(
    category: Optional[str] = None,
    risk_level: Optional[str] = None,
    zone: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100
):
    """Returns candidate infrastructure locations with calculated risk scores and evidence."""
    results = cached_evaluated_locations

    if category:
        results = [r for r in results if category.lower() in r.get("category", "").lower()]
    if risk_level:
        results = [r for r in results if risk_level.lower() == r.get("risk_level", "").lower()]
    if zone:
        results = [r for r in results if str(r.get("zone", "")).lower() == zone.lower() or str(r.get("zone_name", "")).lower() == zone.lower()]
    if search:
        s = search.lower()
        results = [r for r in results if s in r.get("name", "").lower() or s in r.get("category", "").lower()]

    return {
        "count": len(results),
        "locations": results[:limit]
    }

@app.get("/api/locations/{location_id}")
def get_location_details(location_id: str):
    """Fetches comprehensive details and risk breakdown for a specific infrastructure asset."""
    for loc in cached_evaluated_locations:
        if loc.get("id") == location_id:
            return loc
    raise HTTPException(status_code=404, detail=f"Location with ID '{location_id}' not found.")

@app.get("/api/groundwater")
def get_groundwater_levels():
    """Returns observed CGWB groundwater monitoring wells and depths."""
    return {
        "count": len(data_loader.groundwater_level),
        "records": data_loader.groundwater_level,
        "provenance": "OBSERVED (Central Ground Water Board)"
    }

@app.get("/api/quality")
def get_groundwater_quality():
    """Returns observed CGWB chemical quality records."""
    return {
        "count": len(data_loader.groundwater_quality),
        "records": data_loader.groundwater_quality,
        "provenance": "OBSERVED (Central Ground Water Board)"
    }

@app.get("/api/resources")
def get_groundwater_resources():
    """Returns observed CGWB groundwater resource assessment units."""
    return {
        "count": len(data_loader.groundwater_resources),
        "records": data_loader.groundwater_resources,
        "provenance": "OBSERVED (Central Ground Water Board)"
    }

@app.get("/api/rainfall")
def get_rainfall_data():
    """Returns observed IMD daily and cumulative precipitation records."""
    return {
        "count": len(data_loader.rainfall_data),
        "records": data_loader.rainfall_data,
        "provenance": "OBSERVED (India Meteorological Department)"
    }

@app.get("/api/layers/{layer_name}")
def get_map_layer(layer_name: str):
    """Returns clean GeoJSON features for map layers."""
    layer = layer_name.lower().strip()
    if layer in ("hotspots", "chennaifloodhhotspots"):
        return {
            "type": "FeatureCollection",
            "layer_name": "Historical Flood Hotspots (2015)",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [h["lon"], h["lat"]]},
                    "properties": h
                } for h in data_loader.flood_hotspots
            ]
        }
    elif layer in ("stagnation", "waterstagnationareas"):
        return {
            "type": "FeatureCollection",
            "layer_name": "Water Stagnation Locations",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [s["lon"], s["lat"]]},
                    "properties": s
                } for s in data_loader.water_stagnation
            ]
        }
    elif layer in ("basins", "basindrinage"):
        return {
            "type": "FeatureCollection",
            "layer_name": "Drainage Basins & Natural Streams",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "MultiLineString", "coordinates": b["coordinates"]},
                    "properties": {k: v for k, v in b.items() if k != "coordinates"}
                } for b in data_loader.basin_drainage
            ]
        }
    elif layer in ("drains", "stormwater"):
        return {
            "type": "FeatureCollection",
            "layer_name": "Stormwater Drains (Sample Network)",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "MultiLineString", "coordinates": d["coordinates"]},
                    "properties": {k: v for k, v in d.items() if k != "coordinates"}
                } for d in data_loader.stormwater_drains
            ]
        }
    elif layer in ("roads", "roadcenterlines"):
        return {
            "type": "FeatureCollection",
            "layer_name": "Road Centerlines Network",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "MultiLineString", "coordinates": r["coordinates"]},
                    "properties": {k: v for k, v in r.items() if k != "coordinates"}
                } for r in data_loader.road_centerlines
            ]
        }
    elif layer in ("healthcare", "uchc", "uphc"):
        return {
            "type": "FeatureCollection",
            "layer_name": "Healthcare Facilities (UCHC & UPHC)",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [hc["lon"], hc["lat"]]},
                    "properties": hc
                } for hc in data_loader.healthcare_facilities
            ]
        }
    elif layer in ("groundwater", "gw_wells"):
        return {
            "type": "FeatureCollection",
            "layer_name": "Groundwater Monitoring Stations",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [gw["lon"], gw["lat"]]},
                    "properties": gw
                } for gw in data_loader.groundwater_level
            ]
        }
    elif layer in ("terrain", "synthetic_terrain"):
        return {
            "type": "FeatureCollection",
            "layer_name": "Synthetic Terrain Elevation (Demo Only)",
            "disclaimer": "Synthetic terrain — demonstration only; not validated against a real DEM.",
            "summary": data_loader.synthetic_terrain_summary,
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [t["lon"], t["lat"]]},
                    "properties": t
                } for t in getattr(data_loader, "synthetic_terrain_points", [])
            ]
        }
    else:
        raise HTTPException(status_code=400, detail=f"Layer '{layer_name}' not supported.")

@app.post("/api/risk/analyze")
def analyze_risk(req: RiskAnalyzeRequest):
    """Executes on-demand deterministic risk evaluation for any custom coordinate in Chennai."""
    # Check if target is inside supported extent
    lon = req.lon
    lat = req.lat
    if not (80.05 <= lon <= 80.35 and 12.85 <= lat <= 13.25):
        raise HTTPException(
            status_code=400,
            detail=f"Coordinates ({lat}, {lon}) fall outside the supported Chennai study extent (12.85–13.25N, 80.05–80.35E)."
        )

    res = risk_engine.evaluate_location(
        target_lat=lat,
        target_lon=lon,
        location_name=req.location_name or "Custom Asset Point",
        category=req.category or "Custom Infrastructure",
        hotspots=data_loader.flood_hotspots,
        stagnations=data_loader.water_stagnation,
        drains=data_loader.stormwater_drains,
        gw_stations=data_loader.groundwater_level,
        rainfall_records=data_loader.rainfall_data,
        custom_weights=req.custom_weights,
        rainfall_multiplier=req.rainfall_multiplier or 1.0,
        drain_blockage_pct=req.drain_blockage_pct or 0.0
    )
    return res

@app.post("/api/cascade/simulate")
def simulate_cascade(req: CascadeSimulateRequest):
    """Runs a deterministic cascading failure simulation."""
    res = cascade_engine.simulate(
        trigger_feature_id=req.trigger_feature_id or (data_loader.stormwater_drains[0]["id"] if data_loader.stormwater_drains else "drain_1"),
        drainage_features=data_loader.stormwater_drains,
        stagnation_points=data_loader.water_stagnation,
        road_features=data_loader.road_centerlines,
        healthcare_facilities=data_loader.healthcare_facilities,
        rainfall_severity=req.rainfall_severity or 1.25,
        drain_blockage_pct=req.drain_blockage_pct or 50.0
    )
    return res

@app.post("/api/budget/optimize")
def optimize_budget(req: BudgetOptimizeRequest):
    """Solves budget-constrained maintenance prioritization and compares against baseline."""
    candidates = budget_optimizer.generate_candidate_interventions(cached_evaluated_locations)
    res = budget_optimizer.optimize(
        candidate_interventions=candidates,
        total_budget_lakhs=req.total_budget_lakhs or 50.0,
        strategy=req.strategy or "optimal_cost_benefit"
    )
    return res

@app.post("/api/scenarios/run")
def run_scenario(req: ScenarioRunRequest):
    """Simulates a What-If contingency scenario against the observed baseline."""
    res = scenario_engine.run_scenario(
        base_locations=cached_evaluated_locations,
        scenario_key=req.scenario_key or "SEVERE_MONSOON",
        budget_lakhs=req.budget_lakhs or 50.0,
        drain_blockage_pct=req.drain_blockage_pct or 30.0,
        implemented_interventions_count=req.implemented_interventions_count or 6
    )
    return res
