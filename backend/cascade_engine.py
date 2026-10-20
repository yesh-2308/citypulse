"""
CityPulse 1 - Cascading Failure Analysis Engine
Simulates multi-tier infrastructure failure propagation:
Drainage Disruption -> Surface Water Stagnation -> Road Impairment -> Healthcare Access Delay
"""

import math
from typing import Dict, List, Any, Optional

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class CascadeEngine:
    def __init__(self):
        pass

    def simulate(
        self,
        trigger_feature_id: str,
        drainage_features: List[Dict[str, Any]],
        stagnation_points: List[Dict[str, Any]],
        road_features: List[Dict[str, Any]],
        healthcare_facilities: List[Dict[str, Any]],
        rainfall_severity: float = 1.0,     # 1.0 = Normal, 1.5 = Heavy, 2.0 = Cloudburst
        drain_blockage_pct: float = 50.0    # 0% to 100%
    ) -> Dict[str, Any]:
        """
        Executes a deterministic cascading failure simulation starting from an initial drainage asset.
        """
        # 1. Locate the trigger feature (or pick primary vulnerable drainage corridor if not found)
        trigger = None
        for d in drainage_features:
            if d.get("id") == trigger_feature_id:
                trigger = d
                break
        if not trigger and drainage_features:
            trigger = drainage_features[0]

        trigger_lat = trigger.get("lat", 13.08)
        trigger_lon = trigger.get("lon", 80.25)
        trigger_name = trigger.get("name", "Primary Drainage Line")

        # Effective cascading failure radius scales deterministically with severity & blockage
        # Base radius: 0.5 km, expands up to 2.5 km under severe rainfall and high blockage
        impact_radius_km = 0.5 + (rainfall_severity - 1.0) * 1.0 + (drain_blockage_pct / 100.0) * 0.8
        impact_radius_km = round(min(3.0, max(0.4, impact_radius_km)), 2)

        # Stage 1: Drainage Disruption (Trigger Node)
        overflow_volume_m3_hr = round(350.0 * rainfall_severity * (drain_blockage_pct / 100.0), 1)
        drainage_node = {
            "stage": 1,
            "stage_name": "Drainage Disruption",
            "feature_id": trigger.get("id", "trigger_drain"),
            "name": trigger_name,
            "status": "OVERFLOWING / COMPROMISED",
            "lat": trigger_lat,
            "lon": trigger_lon,
            "severity_level": "Critical" if drain_blockage_pct > 70 else ("High" if drain_blockage_pct > 30 else "Moderate"),
            "details": f"Drainage capacity exceeded with {drain_blockage_pct:.0f}% structural blockage under {rainfall_severity:.1f}x rainfall. Modeled overflow discharge rate: ~{overflow_volume_m3_hr} m³/hr.",
            "provenance": "SIMULATED TRIGGER (Observed asset geometry + configured scenario)"
        }

        # Stage 2: Secondary Surface Water Stagnation Pooling
        # Find stagnation areas within impact radius
        stagnation_nodes = []
        for st in stagnation_points:
            dist = haversine_km(trigger_lat, trigger_lon, st["lat"], st["lon"])
            if dist <= impact_radius_km:
                pool_depth_cm = round(15.0 * rainfall_severity + (drain_blockage_pct / 100.0) * 20.0 * (1.0 - dist / impact_radius_km), 1)
                stagnation_nodes.append({
                    "id": st["id"],
                    "name": st["name"],
                    "lat": st["lat"],
                    "lon": st["lon"],
                    "distance_from_trigger_m": round(dist * 1000),
                    "estimated_pool_depth_cm": pool_depth_cm,
                    "condition": "Active Inundation Pool",
                    "provenance": "SIMULATED CONSEQUENCE (Observed stagnation location activated by overflow)"
                })

        # Stage 3: Tertiary Road Network Segment Impairment
        # Find roads within impact radius
        affected_roads = []
        for rd in road_features:
            dist = haversine_km(trigger_lat, trigger_lon, rd["lat"], rd["lon"])
            if dist <= impact_radius_km:
                water_on_road_cm = round(10.0 * rainfall_severity + (drain_blockage_pct / 100.0) * 15.0 * (1.0 - dist / impact_radius_km), 1)
                traffic_status = "Impassable (>25cm water)" if water_on_road_cm > 25.0 else ("Severely Restricted (>15cm)" if water_on_road_cm > 15.0 else "Slow Moving Flow")
                affected_roads.append({
                    "id": rd["id"],
                    "name": rd["name"],
                    "lat": rd["lat"],
                    "lon": rd["lon"],
                    "distance_from_trigger_m": round(dist * 1000),
                    "estimated_water_depth_cm": water_on_road_cm,
                    "traffic_status": traffic_status,
                    "provenance": "SIMULATED CONSEQUENCE (Road intersects overflow flood radius)"
                })

        # Stage 4: Quaternary Healthcare Access Route Impedance
        affected_healthcare = []
        for hc in healthcare_facilities:
            dist = haversine_km(trigger_lat, trigger_lon, hc["lat"], hc["lon"])
            # Healthcare access buffer is 1.5x the surface pool radius because ambulances/patients navigate local access roads
            if dist <= impact_radius_km * 1.4:
                delay_mins = round(8.0 * rainfall_severity + (drain_blockage_pct / 100.0) * 15.0 * (1.0 - dist / (impact_radius_km * 1.4)), 0)
                affected_healthcare.append({
                    "id": hc["id"],
                    "name": hc["name"],
                    "type": hc["type"],
                    "zone_name": hc["zone_name"],
                    "address": hc["address"],
                    "lat": hc["lat"],
                    "lon": hc["lon"],
                    "distance_from_trigger_km": round(dist, 2),
                    "estimated_transit_delay_mins": int(max(5, delay_mins)),
                    "access_status": "Severely Impaired" if delay_mins >= 15 else "Delayed Ambulance Transit",
                    "reason": f"Access arterial road network intersects {len(affected_roads)} inundated segments in the {hc['zone_name']} corridor.",
                    "provenance": "SIMULATED IMPACT (Observed facility address with estimated route impedance)"
                })

        # Generate Graph Representation for UI visual
        nodes = [
            {"id": "node_trigger", "label": trigger_name, "stage": 1, "type": "drainage", "severity": drainage_node["severity_level"]},
            {"id": "node_stagnation", "label": f"{len(stagnation_nodes)} Water Pools", "stage": 2, "type": "stagnation", "severity": "High" if len(stagnation_nodes) > 2 else "Moderate"},
            {"id": "node_roads", "label": f"{len(affected_roads)} Inundated Roads", "stage": 3, "type": "roads", "severity": "Critical" if any(r["estimated_water_depth_cm"] > 25 for r in affected_roads) else "High"},
            {"id": "node_healthcare", "label": f"{len(affected_healthcare)} Healthcare Centres", "stage": 4, "type": "healthcare", "severity": "Critical" if any(h["estimated_transit_delay_mins"] >= 15 for h in affected_healthcare) else "Moderate"}
        ]

        edges = [
            {"from": "node_trigger", "to": "node_stagnation", "label": f"Discharge Overflow ({drain_blockage_pct:.0f}% Blockage)", "active": True},
            {"from": "node_stagnation", "to": "node_roads", "label": f"Surface Water Backflow (~{impact_radius_km}km Radius)", "active": len(stagnation_nodes) > 0},
            {"from": "node_roads", "to": "node_healthcare", "label": f"Corridor Impedance (+{max([h['estimated_transit_delay_mins'] for h in affected_healthcare], default=0)} min delay)", "active": len(affected_roads) > 0 and len(affected_healthcare) > 0}
        ]

        return {
            "trigger_feature": trigger,
            "scenario_parameters": {
                "rainfall_severity_multiplier": rainfall_severity,
                "drain_blockage_pct": drain_blockage_pct,
                "computed_impact_radius_km": impact_radius_km,
                "modeled_overflow_discharge_m3_hr": overflow_volume_m3_hr
            },
            "stages": [
                drainage_node,
                {
                    "stage": 2,
                    "stage_name": "Local Water Stagnation Pools",
                    "affected_count": len(stagnation_nodes),
                    "items": stagnation_nodes[:8]
                },
                {
                    "stage": 3,
                    "stage_name": "Inundated Road Corridors",
                    "affected_count": len(affected_roads),
                    "items": affected_roads[:8]
                },
                {
                    "stage": 4,
                    "stage_name": "Healthcare Facility Access Impedance",
                    "affected_count": len(affected_healthcare),
                    "items": affected_healthcare
                }
            ],
            "graph": {
                "nodes": nodes,
                "edges": edges
            },
            "summary": f"Cascading failure simulation: Failure of '{trigger_name}' with {drain_blockage_pct:.0f}% blockage under {rainfall_severity:.1f}x rainfall is modeled to activate {len(stagnation_nodes)} water stagnation pools, inundate {len(affected_roads)} road segments, and impair access to {len(affected_healthcare)} healthcare facilities within a {impact_radius_km} km radius.",
            "disclaimer": "Simulated multi-tier dependency consequences for municipal disaster planning. Not an engineered hydraulic dynamic simulation."
        }

cascade_engine = CascadeEngine()
