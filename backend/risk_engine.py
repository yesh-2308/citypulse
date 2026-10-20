"""
CityPulse 1 - Explainable Risk Intelligence Engine
Deterministic, testable risk scoring based on observed geospatial evidence and transparent heuristic rules.
"""

import math
from typing import Dict, List, Any, Optional

DEFAULT_WEIGHTS = {
    "flood_hotspot": 0.25,
    "water_stagnation": 0.20,
    "drainage_condition": 0.20,
    "groundwater_vulnerability": 0.15,
    "rainfall_stress": 0.10,
    "terrain_elevation_class": 0.10
}

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two GPS points in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class RiskEngine:
    def __init__(self, weights: Optional[Dict[str, float]] = None):
        self.weights = weights or DEFAULT_WEIGHTS.copy()
        # Ensure weights sum to 1.0
        total = sum(self.weights.values())
        if total > 0:
            self.weights = {k: v / total for k, v in self.weights.items()}

    def evaluate_location(
        self,
        target_lat: float,
        target_lon: float,
        location_name: str,
        category: str,
        hotspots: List[Dict[str, Any]],
        stagnations: List[Dict[str, Any]],
        drains: List[Dict[str, Any]],
        gw_stations: List[Dict[str, Any]],
        rainfall_records: List[Dict[str, Any]],
        custom_weights: Optional[Dict[str, float]] = None,
        rainfall_multiplier: float = 1.0,
        drain_blockage_pct: float = 0.0
    ) -> Dict[str, Any]:
        """
        Evaluates a candidate urban location and produces an explainable composite risk assessment.
        """
        weights = custom_weights or self.weights
        total_w = sum(weights.values())
        if total_w > 0:
            weights = {k: v / total_w for k, v in weights.items()}

        factors: List[Dict[str, Any]] = []
        scores: Dict[str, float] = {}

        # 1. Flood Hotspot Factor (Proximity & Inundation Severity)
        nearest_hs = None
        min_hs_dist = 999.0
        for hs in hotspots:
            dist = haversine_km(target_lat, target_lon, hs["lat"], hs["lon"])
            if dist < min_hs_dist:
                min_hs_dist = dist
                nearest_hs = hs

        if min_hs_dist <= 0.5:
            # Inside or immediately adjacent (< 500m)
            depth_str = str(nearest_hs.get("inundation_ft", "<2ft")).lower()
            if ">5ft" in depth_str or "ab5f" in depth_str:
                hs_score = 95.0
                desc = f"Intersects critical historical 2015 flood hotspot ({nearest_hs.get('name')}) with documented inundation >5ft."
            elif "3to5" in depth_str or "3-5" in depth_str:
                hs_score = 80.0
                desc = f"Located within high historical flood zone ({nearest_hs.get('name')}) with 3–5ft inundation."
            elif "2to3" in depth_str or "2-3" in depth_str:
                hs_score = 65.0
                desc = f"Located within moderate flood zone ({nearest_hs.get('name')}) with 2–3ft inundation."
            else:
                hs_score = 50.0
                desc = f"Located within shallow historical flood zone ({nearest_hs.get('name')}) with <2ft inundation."
        elif min_hs_dist <= 1.5:
            hs_score = max(20.0, 50.0 * (1.5 - min_hs_dist) / 1.0)
            desc = f"Within {min_hs_dist:.2f} km of historical flood hotspot '{nearest_hs.get('name')}'."
        else:
            hs_score = 10.0
            desc = f"No immediate flood hotspots within 1.5 km (nearest is {min_hs_dist:.1f} km away)."

        scores["flood_hotspot"] = hs_score
        factors.append({
            "name": "Historical Flood Hotspot",
            "weight": weights.get("flood_hotspot", 0.25),
            "score": round(hs_score, 1),
            "weighted_impact": round(hs_score * weights.get("flood_hotspot", 0.25), 1),
            "evidence_type": "OBSERVED (GCC 2015 GIS)",
            "explanation": desc
        })

        # 2. Water Stagnation Factor
        stagnation_within_1km = 0
        min_st_dist = 999.0
        nearest_st_name = "None"
        for st in stagnations:
            dist = haversine_km(target_lat, target_lon, st["lat"], st["lon"])
            if dist < min_st_dist:
                min_st_dist = dist
                nearest_st_name = st.get("name", "Stagnation Point")
            if dist <= 1.0:
                stagnation_within_1km += 1

        if min_st_dist <= 0.3:
            st_score = min(100.0, 75.0 + stagnation_within_1km * 5.0)
            st_desc = f"Adjacent to chronic water stagnation location '{nearest_st_name}' ({stagnation_within_1km} stagnation clusters within 1km)."
        elif min_st_dist <= 1.0:
            st_score = min(70.0, 40.0 + stagnation_within_1km * 6.0)
            st_desc = f"{stagnation_within_1km} chronic stagnation areas mapped within 1 km (closest is {min_st_dist*1000:.0f} m)."
        else:
            st_score = 15.0
            st_desc = f"Nearest mapped water stagnation area is {min_st_dist:.1f} km away."

        scores["water_stagnation"] = st_score
        factors.append({
            "name": "Chronic Water Stagnation",
            "weight": weights.get("water_stagnation", 0.20),
            "score": round(st_score, 1),
            "weighted_impact": round(st_score * weights.get("water_stagnation", 0.20), 1),
            "evidence_type": "OBSERVED (GCC Drainage Survey)",
            "explanation": st_desc
        })

        # 3. Stormwater Drainage Capacity & Defect Factor
        min_drain_dist = 999.0
        nearest_drain = None
        for d in drains:
            dist = haversine_km(target_lat, target_lon, d["lat"], d["lon"])
            if dist < min_drain_dist:
                min_drain_dist = dist
                nearest_drain = d

        drain_score = 30.0
        drain_desc = "Standard drainage coverage."
        if nearest_drain and min_drain_dist <= 1.5:
            base_score = 25.0
            condition = str(nearest_drain.get("status", "")).lower()
            cover = str(nearest_drain.get("cover", "")).lower()
            if condition == "bad":
                base_score += 35.0
            if cover == "no":
                base_score += 20.0
            # Factor in simulated blockage parameter
            base_score += (drain_blockage_pct / 100.0) * 25.0
            drain_score = min(100.0, base_score)
            drain_desc = f"Nearest drain ({nearest_drain.get('name')}) is {min_drain_dist*1000:.0f}m away (Condition: {nearest_drain.get('status', 'Fair')}, Cover: {nearest_drain.get('cover', 'Yes')}, Simulated Blockage: {drain_blockage_pct:.0f}%)."
        else:
            drain_score = 55.0  # Missing / distant drain increases drainage vulnerability
            drain_desc = f"No immediate stormwater drain lines mapped within 1.5 km (nearest is {min_drain_dist:.1f} km away)."

        scores["drainage_condition"] = drain_score
        factors.append({
            "name": "Drainage Asset Condition & Proximity",
            "weight": weights.get("drainage_condition", 0.20),
            "score": round(drain_score, 1),
            "weighted_impact": round(drain_score * weights.get("drainage_condition", 0.20), 1),
            "evidence_type": "OBSERVED / SIMULATED (GCC SWD Asset Registry)",
            "explanation": drain_desc
        })

        # 4. Groundwater Table Vulnerability Factor (Shallow water table saturates soil)
        min_gw_dist = 999.0
        nearest_gw = None
        for gw in gw_stations:
            dist = haversine_km(target_lat, target_lon, gw["lat"], gw["lon"])
            if dist < min_gw_dist:
                min_gw_dist = dist
                nearest_gw = gw

        if nearest_gw and min_gw_dist <= 5.0:
            dtwl = nearest_gw.get("dtwl_mbgl", 2.5)
            if dtwl <= 1.5:
                gw_score = 85.0
                gw_desc = f"Critically shallow water table ({dtwl} mbgl at {nearest_gw.get('village', 'Station')}) restricts soil infiltration and accelerates surface runoff."
            elif dtwl <= 2.5:
                gw_score = 60.0
                gw_desc = f"Shallow groundwater table ({dtwl} mbgl at {nearest_gw.get('village', 'Station')}) provides low buffering for monsoon infiltration."
            else:
                gw_score = 30.0
                gw_desc = f"Groundwater level at {nearest_gw.get('village', 'Station')} is {dtwl} mbgl, providing moderate subterranean infiltration buffer."
        else:
            gw_score = 45.0  # Default moderate assumption when monitoring well is distant
            gw_desc = f"Nearest CGWB monitoring well is {min_gw_dist:.1f} km away (assumed regional baseline)."

        scores["groundwater_vulnerability"] = gw_score
        factors.append({
            "name": "Subsurface Infiltration & Groundwater Level",
            "weight": weights.get("groundwater_vulnerability", 0.15),
            "score": round(gw_score, 1),
            "weighted_impact": round(gw_score * weights.get("groundwater_vulnerability", 0.15), 1),
            "evidence_type": "OBSERVED (CGWB Jan 2026 Telemetry)",
            "explanation": gw_desc
        })

        # 5. Rainfall Stress Factor
        # Look at observed departure from normal
        rf_score = 25.0
        if rainfall_records:
            recent_rf = rainfall_records[0]
            # Normal or departure
            actual_mm = float(recent_rf.get("Monthly Acutual") or recent_rf.get("Cumulative Actual") or 100.0)
            normal_mm = float(recent_rf.get("Monthly Normal") or recent_rf.get("Cumulative Normal") or 100.0)
            departure_pct = ((actual_mm - normal_mm) / normal_mm * 100.0) if normal_mm > 0 else 0.0
            
            # Apply scenario rainfall multiplier
            effective_mult = max(0.5, rainfall_multiplier)
            scaled_departure = departure_pct + (effective_mult - 1.0) * 50.0
            
            if scaled_departure > 40:
                rf_score = min(100.0, 70.0 + scaled_departure * 0.3)
                rf_desc = f"Precipitation stress is elevated: +{scaled_departure:.1f}% departure from normal (Scenario intensity multiplier: {effective_mult:.2f}x)."
            elif scaled_departure > 0:
                rf_score = 45.0 + scaled_departure * 0.5
                rf_desc = f"Observed rainfall near or slightly above normal (+{scaled_departure:.1f}% departure)."
            else:
                rf_score = 25.0
                rf_desc = f"Precipitation is within normal ranges (recorded departure: {scaled_departure:.1f}%)."
        else:
            rf_score = 40.0
            rf_desc = "Rainfall telemetry baseline."

        scores["rainfall_stress"] = rf_score
        factors.append({
            "name": "Monsoon Precipitation Stress",
            "weight": weights.get("rainfall_stress", 0.10),
            "score": round(rf_score, 1),
            "weighted_impact": round(rf_score * weights.get("rainfall_stress", 0.10), 1),
            "evidence_type": "OBSERVED (IMD Daily Precipitation) / SIMULATED",
            "explanation": rf_desc
        })

        # 6. Terrain Class (from Synthetic DEM - strictly labelled demonstration)
        # Low latitude/longitude corridor proximity to Adyar / Cooum / Buckingham canal flat elevations
        # Check if coordinates fall within known low-lying coastal/basin depression
        # (Elevation demo: 0-6m is low-lying coastal gradient)
        # Note: We clearly label this as SIMULATED / DEMO DATA ONLY!
        approx_elev = 5.0 + 8.0 * (1.0 - (target_lat - 12.95) / 0.25) * ((target_lon - 80.1) / 0.22)
        if approx_elev < 6.5:
            terrain_score = 75.0
            terrain_desc = f"Located in gentle low-elevation coastal gradient (~{approx_elev:.1f}m synthetic DEM). NOTE: Synthetic terrain — demonstration only; not validated against a real DEM."
        else:
            terrain_score = 30.0
            terrain_desc = f"Terrain elevation gradient ~{approx_elev:.1f}m. NOTE: Synthetic terrain — demonstration only; not validated against a real DEM."

        scores["terrain_elevation_class"] = terrain_score
        factors.append({
            "name": "Terrain Slope & Low-Lying Vulnerability",
            "weight": weights.get("terrain_elevation_class", 0.10),
            "score": round(terrain_score, 1),
            "weighted_impact": round(terrain_score * weights.get("terrain_elevation_class", 0.10), 1),
            "evidence_type": "SIMULATED (Synthetic DEM Demo Data Only)",
            "explanation": terrain_desc
        })

        # Calculate Final Composite Risk Score
        composite_score = sum(scores[k] * weights[k] for k in weights if k in scores)
        composite_score = max(0.0, min(100.0, composite_score))

        # Risk Classification conforming to specification Section 4:
        # Low: 0 - 39, Moderate: 40 - 59, High: 60 - 79, Critical: 80 - 100
        if composite_score >= 80.0:
            level = "Critical"
            color = "#DC2626"
        elif composite_score >= 60.0:
            level = "High"
            color = "#EA580C"
        elif composite_score >= 40.0:
            level = "Moderate"
            color = "#EAB308"
        else:
            level = "Low"
            color = "#16A34A"

        # Key drivers explanation summary
        sorted_factors = sorted(factors, key=lambda x: x["weighted_impact"], reverse=True)
        top_driver = sorted_factors[0]
        summary_explanation = f"Flagged with {level} vulnerability ({composite_score:.1f}/100). Primary driver is {top_driver['name']} ({top_driver['explanation']})"

        return {
            "name": location_name,
            "category": category,
            "lat": target_lat,
            "lon": target_lon,
            "composite_risk_score": round(composite_score, 1),
            "risk_level": level,
            "risk_color": color,
            "explanation_summary": summary_explanation,
            "factors": factors,
            "provenance": "DERIVED (Calculated from observed datasets & documented heuristic model)",
            "model_type": "Deterministic Multi-Criteria Spatial Risk Model",
            "validation_note": "Engineering decision-support estimate; not a certified emergency forecasting model."
        }

# Singleton instance
risk_engine = RiskEngine()
