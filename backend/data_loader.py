"""
CityPulse 1 - Data Ingestion, Validation, and Provenance Pipeline
Loads and validates observed Chennai geospatial and municipal datasets.
"""

import os
import json
import glob
import pandas as pd
import math
from xml.etree import ElementTree as ET
from typing import Dict, List, Any, Optional

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two GPS points in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
CACHE_DIR = os.path.join(DATA_DIR, "cache")

os.makedirs(CACHE_DIR, exist_ok=True)

# Chennai Bounding Box approx
CHENNAI_BOUNDS = {
    "min_lon": 80.05,
    "max_lon": 80.35,
    "min_lat": 12.85,
    "max_lat": 13.25
}

# Corporation of Chennai Zones (I to XV)
CHENNAI_ZONES = {
    1: {"name": "Thiruvottiyur", "center": [13.1594, 80.3015]},
    2: {"name": "Manali", "center": [13.1667, 80.2667]},
    3: {"name": "Madhavaram", "center": [13.1489, 80.2314]},
    4: {"name": "Tondiarpet", "center": [13.1250, 80.2850]},
    5: {"name": "Royapuram", "center": [13.1110, 80.2940]},
    6: {"name": "Thiru-Vi-Ka Nagar", "center": [13.1070, 80.2460]},
    7: {"name": "Ambattur", "center": [13.0980, 80.1610]},
    8: {"name": "Anna Nagar", "center": [13.0850, 80.2150]},
    9: {"name": "Teynampet", "center": [13.0420, 80.2520]},
    10: {"name": "Kodambakkam", "center": [13.0520, 80.2250]},
    11: {"name": "Valasaravakkam", "center": [13.0400, 80.1700]},
    12: {"name": "Alandur", "center": [13.0030, 80.2010]},
    13: {"name": "Adyar", "center": [13.0060, 80.2570]},
    14: {"name": "Perungudi", "center": [12.9650, 80.2450]},
    15: {"name": "Sholinganallur", "center": [12.9010, 80.2280]},
}

class DataLoader:
    def __init__(self):
        self.data_status: Dict[str, Any] = {}
        self.flood_hotspots: List[Dict[str, Any]] = []
        self.water_stagnation: List[Dict[str, Any]] = []
        self.basin_drainage: List[Dict[str, Any]] = []
        self.stormwater_drains: List[Dict[str, Any]] = []
        self.road_centerlines: List[Dict[str, Any]] = []
        self.groundwater_level: List[Dict[str, Any]] = []
        self.groundwater_quality: List[Dict[str, Any]] = []
        self.groundwater_resources: List[Dict[str, Any]] = []
        self.rainfall_data: List[Dict[str, Any]] = []
        self.healthcare_facilities: List[Dict[str, Any]] = []
        self.synthetic_terrain_summary: Dict[str, Any] = {}
        self.synthetic_terrain_points: List[Dict[str, Any]] = []
        self.is_loaded = False

    def load_all(self, force_refresh: bool = False):
        """Load and validate all source datasets."""
        cache_file = os.path.join(CACHE_DIR, "preprocessed_datasets.json")
        if not force_refresh and os.path.exists(cache_file):
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    cached = json.load(f)
                self.data_status = cached.get("data_status", {})
                self.flood_hotspots = cached.get("flood_hotspots", [])
                self.water_stagnation = cached.get("water_stagnation", [])
                self.basin_drainage = cached.get("basin_drainage", [])
                self.stormwater_drains = cached.get("stormwater_drains", [])
                self.road_centerlines = cached.get("road_centerlines", [])
                self.groundwater_level = cached.get("groundwater_level", [])
                self.groundwater_quality = cached.get("groundwater_quality", [])
                self.groundwater_resources = cached.get("groundwater_resources", [])
                self.rainfall_data = cached.get("rainfall_data", [])
                self.healthcare_facilities = cached.get("healthcare_facilities", [])
                self.synthetic_terrain_summary = cached.get("synthetic_terrain_summary", {})
                self.synthetic_terrain_points = cached.get("synthetic_terrain_points", [])
                if not self.synthetic_terrain_points:
                    self._load_synthetic_terrain()
                self.is_loaded = True
                print("DataLoader: Loaded preprocessed cache successfully.")
                return
            except Exception as e:
                print(f"DataLoader: Cache read error: {e}. Rebuilding...")

        # 1. Flood Hotspots KML
        self._load_flood_hotspots()
        # 2. Water Stagnation KML
        self._load_water_stagnation()
        # 3. Basin Drainage KML
        self._load_basin_drainage()
        # 4. Stormwater Drains KML (sampled/aggregated for fast web response)
        self._load_stormwater_drains()
        # 5. Road Centerlines KML (sampled/aggregated)
        self._load_road_centerlines()
        # 6. Groundwater Levels CSV
        self._load_gw_levels()
        # 7. Groundwater Quality CSV
        self._load_gw_quality()
        # 8. Groundwater Resources CSV
        self._load_gw_resources()
        # 9. Rainfall Data CSV
        self._load_rainfall()
        # 10. Healthcare (UCHC & UPHC)
        self._load_healthcare()
        # 11. Synthetic Terrain Summary
        self._load_synthetic_terrain()

        self.is_loaded = True

        # Save cache
        try:
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump({
                    "data_status": self.data_status,
                    "flood_hotspots": self.flood_hotspots,
                    "water_stagnation": self.water_stagnation,
                    "basin_drainage": self.basin_drainage,
                    "stormwater_drains": self.stormwater_drains,
                    "road_centerlines": self.road_centerlines,
                    "groundwater_level": self.groundwater_level,
                    "groundwater_quality": self.groundwater_quality,
                    "groundwater_resources": self.groundwater_resources,
                    "rainfall_data": self.rainfall_data,
                    "healthcare_facilities": self.healthcare_facilities,
                    "synthetic_terrain_summary": self.synthetic_terrain_summary,
                    "synthetic_terrain_points": self.synthetic_terrain_points
                }, f)
            print("DataLoader: Saved preprocessed cache.")
        except Exception as e:
            print(f"DataLoader: Failed to write cache: {e}")

    def _load_flood_hotspots(self):
        fpath = os.path.join(DATA_DIR, "chennaifloodhhotspots.kml")
        if not os.path.exists(fpath):
            self.data_status["chennaifloodhhotspots"] = {"status": "MISSING", "count": 0, "provenance": "OBSERVED"}
            return
        
        features = []
        try:
            tree = ET.parse(fpath)
            root = tree.getroot()
            for idx, pm in enumerate(root.iter()):
                if pm.tag.endswith("Placemark"):
                    props = {}
                    lon, lat = None, None
                    for elem in pm.iter():
                        tag = elem.tag.split("}")[-1]
                        if tag == "SimpleData":
                            k = elem.attrib.get("name")
                            if k: props[k] = elem.text
                        elif tag == "name" and elem.text:
                            props["name"] = elem.text.strip()
                        elif tag == "coordinates" and elem.text:
                            parts = elem.text.strip().split(",")
                            if len(parts) >= 2:
                                try:
                                    lon, lat = float(parts[0]), float(parts[1])
                                except:
                                    pass
                    if lon and lat:
                        vulnerability = props.get("vulnerability", "Moderate Vulnerability")
                        inundation_ft = props.get("inundation_ft", "<2ft")
                        features.append({
                            "id": f"hotspot_{props.get('id', idx+1)}",
                            "name": props.get("location") or f"Flood Hotspot {idx+1}",
                            "category": "Flood Hotspot",
                            "zone": props.get("zone", "N/A"),
                            "ward": props.get("ward", "N/A"),
                            "vulnerability": vulnerability,
                            "inundation_level": props.get("inundation_level", "Under 2ft"),
                            "inundation_ft": inundation_ft,
                            "lon": lon,
                            "lat": lat,
                            "provenance": "OBSERVED",
                            "source": "GCC 2015 Flood Hotspots GIS",
                            "properties": props
                        })
            self.flood_hotspots = features
            self.data_status["chennaifloodhhotspots"] = {
                "status": "VALID",
                "count": len(features),
                "provenance": "OBSERVED",
                "source": "GCC (Greater Chennai Corporation) GIS",
                "format": "KML Point Geometries",
                "description": "Historical 2015 flood hotspot locations with inundation levels and vulnerability classifications."
            }
        except Exception as e:
            self.data_status["chennaifloodhhotspots"] = {"status": "ERROR", "error": str(e), "count": 0}

    def _load_water_stagnation(self):
        fpath = os.path.join(DATA_DIR, "waterstagnationareas.kml")
        if not os.path.exists(fpath):
            self.data_status["waterstagnationareas"] = {"status": "MISSING", "count": 0, "provenance": "OBSERVED"}
            return
        
        features = []
        try:
            tree = ET.parse(fpath)
            root = tree.getroot()
            for idx, pm in enumerate(root.iter()):
                if pm.tag.endswith("Placemark"):
                    props = {}
                    lon, lat = None, None
                    for elem in pm.iter():
                        tag = elem.tag.split("}")[-1]
                        if tag == "SimpleData":
                            k = elem.attrib.get("name")
                            if k: props[k] = elem.text
                        elif tag == "name" and elem.text:
                            props["name"] = elem.text.strip()
                        elif tag == "coordinates" and elem.text:
                            parts = elem.text.strip().split(",")
                            if len(parts) >= 2:
                                try:
                                    lon, lat = float(parts[0]), float(parts[1])
                                except:
                                    pass
                    if lon and lat:
                        features.append({
                            "id": f"stagnation_{props.get('OBJECTID', idx+1)}",
                            "name": props.get("name") or f"Water Stagnation Area {idx+1}",
                            "category": "Water Stagnation Area",
                            "zone": props.get("ZONE", "N/A"),
                            "division": props.get("DIVISION", "N/A"),
                            "lon": lon,
                            "lat": lat,
                            "provenance": "OBSERVED",
                            "source": "Chennai Water Stagnation Locations 2015",
                            "properties": props
                        })
            self.water_stagnation = features
            self.data_status["waterstagnationareas"] = {
                "status": "VALID",
                "count": len(features),
                "provenance": "OBSERVED",
                "source": "GCC / Tamil Nadu Disaster Management",
                "format": "KML Point Geometries",
                "description": "Recorded chronic water pooling and monsoon stagnation locations across Chennai corporation divisions."
            }
        except Exception as e:
            self.data_status["waterstagnationareas"] = {"status": "ERROR", "error": str(e), "count": 0}

    def _load_basin_drainage(self):
        fpath = os.path.join(DATA_DIR, "basindrinage.kml")
        if not os.path.exists(fpath):
            self.data_status["basindrinage"] = {"status": "MISSING", "count": 0, "provenance": "OBSERVED"}
            return
        
        features = []
        try:
            tree = ET.parse(fpath)
            root = tree.getroot()
            for idx, pm in enumerate(root.iter()):
                if pm.tag.endswith("Placemark"):
                    props = {}
                    coords_list = []
                    for elem in pm.iter():
                        tag = elem.tag.split("}")[-1]
                        if tag == "SimpleData":
                            k = elem.attrib.get("name")
                            if k: props[k] = elem.text
                        elif tag == "name" and elem.text:
                            props["name"] = elem.text.strip()
                        elif tag == "coordinates" and elem.text:
                            raw = elem.text.strip().split()
                            line_coords = []
                            for pt in raw:
                                parts = pt.split(",")
                                if len(parts) >= 2:
                                    try:
                                        line_coords.append([float(parts[0]), float(parts[1])])
                                    except:
                                        pass
                            if line_coords:
                                coords_list.append(line_coords)
                    if coords_list:
                        # Compute centroid / first point for spatial queries
                        first_line = coords_list[0]
                        mid_pt = first_line[len(first_line)//2] if first_line else [80.2, 13.0]
                        features.append({
                            "id": f"basin_{props.get('id', idx+1)}",
                            "name": f"{props.get('subbasin', 'Chennai Basin')} ({props.get('type', 'Channel')})",
                            "subbasin": props.get("subbasin", "Unknown Basin"),
                            "type": props.get("type", "Drainage"),
                            "category": "Basin Drainage",
                            "length_km": float(props.get("length_km", 0) or 0),
                            "lon": mid_pt[0],
                            "lat": mid_pt[1],
                            "coordinates": coords_list,
                            "provenance": "OBSERVED",
                            "source": "Chennai Basin Rivers & Drainage Streams GIS",
                            "properties": props
                        })
            self.basin_drainage = features
            self.data_status["basindrinage"] = {
                "status": "VALID",
                "count": len(features),
                "provenance": "OBSERVED",
                "source": "PWD / GCC Drainage Network GIS",
                "format": "KML Line & MultiGeometry",
                "description": "Major natural drainage river basins, streams, supply and surplus flood discharge channels."
            }
        except Exception as e:
            self.data_status["basindrinage"] = {"status": "ERROR", "error": str(e), "count": 0}

    def _load_stormwater_drains(self):
        fpath = os.path.join(DATA_DIR, "stormwater drains.kml")
        if not os.path.exists(fpath):
            self.data_status["stormwater_drains"] = {"status": "MISSING", "count": 0, "provenance": "OBSERVED"}
            return
        
        # High-performance selective parsing:
        # Load summary stats across all 10,257 drains, and retain representative network lines & high-capacity arterial drains
        count = 0
        total_len_m = 0.0
        bad_condition_count = 0
        uncovered_count = 0
        zone_counts = {}
        sample_drains = []

        try:
            for event, elem in ET.iterparse(fpath, events=("end",)):
                if elem.tag.endswith("Placemark"):
                    count += 1
                    props = {}
                    line_coords = []
                    for c in elem.iter():
                        tag = c.tag.split("}")[-1]
                        if tag == "SimpleData":
                            k = c.attrib.get("name")
                            if k: props[k] = c.text
                        elif tag == "coordinates" and c.text:
                            raw = c.text.strip().split()
                            for pt in raw:
                                parts = pt.split(",")
                                if len(parts) >= 2:
                                    try:
                                        line_coords.append([float(parts[0]), float(parts[1])])
                                    except:
                                        pass

                    length = float(props.get("DRAIN_LEN") or props.get("SHAPE_LEN") or 0.0)
                    total_len_m += length
                    if props.get("STATUS", "").lower() == "bad":
                        bad_condition_count += 1
                    if props.get("COVER", "").lower() == "no":
                        uncovered_count += 1
                    
                    zone = props.get("ZONE", "Unknown")
                    zone_counts[zone] = zone_counts.get(zone, 0) + 1

                    # Retain representative/arterial drains (every 10th or long drains > 150m or bad condition)
                    # to keep in-memory footprint light & fast for WebGL / MapLibre visualization
                    if line_coords and (count % 8 == 0 or length > 200 or props.get("STATUS", "").lower() == "bad"):
                        mid = line_coords[len(line_coords)//2]
                        sample_drains.append({
                            "id": f"swd_{props.get('OBJECTID', count)}",
                            "name": f"SWD {props.get('ST_NAME', props.get('LOCATION', f'Drain #{count}'))}".strip(),
                            "category": "Stormwater Drain",
                            "location": props.get("LOCATION", "Chennai"),
                            "street": props.get("ST_NAME", "Street Drain"),
                            "zone": zone,
                            "ward": props.get("WARD", "N/A"),
                            "drain_type": props.get("DRAIN_TYPE", "Side Drain"),
                            "drain_size": props.get("DRAIN_SIZE", "Standard"),
                            "length_m": round(length, 1),
                            "depth_m": float(props.get("DRAIN_DEP", 0.5) or 0.5),
                            "width_m": float(props.get("DRAIN_WID", 0.5) or 0.5),
                            "cover": props.get("COVER", "Yes"),
                            "status": props.get("STATUS", "Fair"),
                            "water_flow": props.get("WATER_FLOW", "Yes"),
                            "material": props.get("SWD_MAT", "Concrete"),
                            "lon": mid[0],
                            "lat": mid[1],
                            "coordinates": [line_coords],
                            "provenance": "OBSERVED",
                            "source": "GCC Storm Water Drains (SWD) GIS"
                        })
                    elem.clear()

            self.stormwater_drains = sample_drains
            self.data_status["stormwater_drains"] = {
                "status": "VALID",
                "count": count,
                "displayed_sample_count": len(sample_drains),
                "total_length_km": round(total_len_m / 1000.0, 2),
                "bad_condition_count": bad_condition_count,
                "uncovered_drains_count": uncovered_count,
                "zones_represented": len(zone_counts),
                "provenance": "OBSERVED",
                "source": "Greater Chennai Corporation (GCC) Storm Water Drainage Network",
                "format": "KML LineStrings (10,257 total records, sampled for UI responsiveness)",
                "description": "GCC engineered stormwater drain asset network with cover status, invert levels, dimensions, and operational condition."
            }
        except Exception as e:
            self.data_status["stormwater_drains"] = {"status": "ERROR", "error": str(e), "count": 0}

    def _load_road_centerlines(self):
        fpath = os.path.join(DATA_DIR, "roadcenterlines.kml")
        if not os.path.exists(fpath):
            self.data_status["roadcenterlines"] = {"status": "MISSING", "count": 0, "provenance": "OBSERVED"}
            return
        
        count = 0
        total_len_m = 0.0
        sample_roads = []
        try:
            for event, elem in ET.iterparse(fpath, events=("end",)):
                if elem.tag.endswith("Placemark"):
                    count += 1
                    props = {}
                    line_coords = []
                    for c in elem.iter():
                        tag = c.tag.split("}")[-1]
                        if tag == "SimpleData":
                            k = c.attrib.get("name")
                            if k: props[k] = c.text
                        elif tag == "coordinates" and c.text:
                            raw = c.text.strip().split()
                            for pt in raw:
                                parts = pt.split(",")
                                if len(parts) >= 2:
                                    try:
                                        line_coords.append([float(parts[0]), float(parts[1])])
                                    except:
                                        pass
                    length = float(props.get("st_length(shape)") or 0.0)
                    total_len_m += length
                    # Retain key arterial / connector road samples for WebGL map
                    if line_coords and (count % 25 == 0 or length > 400):
                        mid = line_coords[len(line_coords)//2]
                        sample_roads.append({
                            "id": f"road_{props.get('objectid', count)}",
                            "road_id": props.get("road_id", str(count)),
                            "name": props.get("road_name", f"Road Segment #{count}"),
                            "category": "Road",
                            "length_m": round(length, 1),
                            "lon": mid[0],
                            "lat": mid[1],
                            "coordinates": [line_coords],
                            "provenance": "OBSERVED",
                            "source": "Chennai Road Centerlines GIS"
                        })
                    elem.clear()

            self.road_centerlines = sample_roads
            self.data_status["roadcenterlines"] = {
                "status": "VALID",
                "count": count,
                "displayed_sample_count": len(sample_roads),
                "total_length_km": round(total_len_m / 1000.0, 2),
                "provenance": "OBSERVED",
                "source": "GCC Urban Road Network",
                "format": "KML LineStrings (34,042 total records, sampled for UI responsiveness)",
                "description": "Complete urban road network centerlines across Chennai."
            }
        except Exception as e:
            self.data_status["roadcenterlines"] = {"status": "ERROR", "error": str(e), "count": 0}

    def _load_gw_levels(self):
        fpath = os.path.join(DATA_DIR, "groundwater_level_chennai.csv")
        if not os.path.exists(fpath):
            self.data_status["groundwater_level_chennai"] = {"status": "MISSING", "count": 0}
            return
        try:
            df = pd.read_csv(fpath)
            records = []
            for idx, row in df.iterrows():
                records.append({
                    "id": f"gw_level_{idx+1}",
                    "name": f"GW Station: {row.get('village', 'Unknown')}",
                    "category": "Groundwater Monitoring Well",
                    "village": str(row.get("village", "")),
                    "block": str(row.get("block", "")),
                    "district": str(row.get("district", "Chennai")),
                    "observation_date": str(row.get("observation_date", "")),
                    "dtwl_mbgl": float(row.get("dtwl", 0.0) if pd.notnull(row.get("dtwl")) else 2.0),
                    "unit": str(row.get("unit", "mbgl")),
                    "water_table_status": "Very Shallow (< 2 mbgl, High Waterlogging Risk)" if float(row.get("dtwl", 2.0) or 2.0) <= 2.0 else "Normal Table",
                    "lon": float(row["longitude"]),
                    "lat": float(row["latitude"]),
                    "provenance": "OBSERVED",
                    "source": f"CGWB Pre-Monsoon 2026 ({row.get('source_pdf', '')})"
                })
            self.groundwater_level = records
            self.data_status["groundwater_level_chennai"] = {
                "status": "VALID",
                "count": len(records),
                "provenance": "OBSERVED",
                "source": "Central Ground Water Board (CGWB) January 2026",
                "format": "CSV with GPS Coordinates",
                "description": "Unconfined aquifer depth-to-water-level (mbgl) observations across Chennai monitoring stations."
            }
        except Exception as e:
            self.data_status["groundwater_level_chennai"] = {"status": "ERROR", "error": str(e), "count": 0}

    def _load_gw_quality(self):
        fpath = os.path.join(DATA_DIR, "groundwater_quality_chennai.csv")
        if not os.path.exists(fpath):
            self.data_status["groundwater_quality_chennai"] = {"status": "MISSING", "count": 0}
            return
        try:
            df = pd.read_csv(fpath)
            records = []
            for idx, row in df.iterrows():
                tds = float(row.get("TDS_mg_L", 0) if pd.notnull(row.get("TDS_mg_L")) else 500)
                records.append({
                    "id": f"gw_qual_{idx+1}",
                    "station_name": str(row.get("station_name_location", "Chennai Station")),
                    "year": int(row.get("year", 2024)),
                    "season": str(row.get("season", "Pre-Monsoon")),
                    "pH": float(row.get("pH", 7.0) if pd.notnull(row.get("pH")) else 7.0),
                    "EC_uS_cm": float(row.get("EC_uS_cm_at_25C", 0) if pd.notnull(row.get("EC_uS_cm_at_25C")) else 0),
                    "TDS_mg_L": tds,
                    "Total_Hardness_mg_L": float(row.get("Total_Hardness_mg_L", 0) if pd.notnull(row.get("Total_Hardness_mg_L")) else 0),
                    "Cl_mg_L": float(row.get("Cl_mg_L", 0) if pd.notnull(row.get("Cl_mg_L")) else 0),
                    "NO3_mg_L": float(row.get("NO3_mg_L", 0) if pd.notnull(row.get("NO3_mg_L")) else 0),
                    "SO4_mg_L": float(row.get("SO4_mg_L", 0) if pd.notnull(row.get("SO4_mg_L")) else 0),
                    "F_mg_L": float(row.get("F_mg_L", 0) if pd.notnull(row.get("F_mg_L")) else 0),
                    "salinity_level": "High Saline" if tds > 1500 else ("Slightly Brackish" if tds > 500 else "Fresh"),
                    "lon": float(row["longitude_dd"]),
                    "lat": float(row["latitude_dd"]),
                    "provenance": "OBSERVED",
                    "source": "CGWB Groundwater Quality National Compilation 2024"
                })
            self.groundwater_quality = records
            self.data_status["groundwater_quality_chennai"] = {
                "status": "VALID",
                "count": len(records),
                "provenance": "OBSERVED",
                "source": "Central Ground Water Board (CGWB) 2024",
                "format": "CSV with Chemical & Metal Parameters",
                "description": "Pre-Monsoon and Post-Monsoon chemical parameters (pH, EC, TDS, Chlorides, Nitrates, Fluorides)."
            }
        except Exception as e:
            self.data_status["groundwater_quality_chennai"] = {"status": "ERROR", "error": str(e), "count": 0}

    def _load_gw_resources(self):
        fpath = os.path.join(DATA_DIR, "groundwater_resources_chennai.csv")
        if not os.path.exists(fpath):
            self.data_status["groundwater_resources_chennai"] = {"status": "MISSING", "count": 0}
            return
        try:
            df = pd.read_csv(fpath)
            self.groundwater_resources = df.fillna("").to_dict(orient="records")
            self.data_status["groundwater_resources_chennai"] = {
                "status": "VALID",
                "count": len(df),
                "provenance": "OBSERVED",
                "source": "National Dynamic Ground Water Resources Assessment",
                "format": "CSV Hydrogeological Assessment Units",
                "description": "Stage of groundwater extraction, overexploited units breakdown, and recharge vs discharge balances."
            }
        except Exception as e:
            self.data_status["groundwater_resources_chennai"] = {"status": "ERROR", "error": str(e), "count": 0}

    def _load_rainfall(self):
        fpath = os.path.join(DATA_DIR, "rainfalldata.csv")
        if not os.path.exists(fpath):
            self.data_status["rainfalldata"] = {"status": "MISSING", "count": 0}
            return
        try:
            df = pd.read_csv(fpath)
            self.rainfall_data = df.fillna("").to_dict(orient="records")
            self.data_status["rainfalldata"] = {
                "status": "VALID",
                "count": len(df),
                "provenance": "OBSERVED",
                "source": "IMD (India Meteorological Department)",
                "format": "CSV Daily / Weekly Precipitation Records",
                "description": "Daily observed rainfall, normal averages, departures, and cumulative precipitation metrics for Chennai."
            }
        except Exception as e:
            self.data_status["rainfalldata"] = {"status": "ERROR", "error": str(e), "count": 0}

    def _load_healthcare(self):
        """Loads UCHC and UPHC datasets and provides documented zone-locality coordinates."""
        uchc_path = os.path.join(DATA_DIR, "chennaiuchc.csv")
        uphc_path = os.path.join(DATA_DIR, "chennaiuphc.csv")
        facilities = []

        if os.path.exists(uchc_path):
            try:
                df_uchc = pd.read_csv(uchc_path)
                for idx, row in df_uchc.iterrows():
                    name = str(row.get("UCHC  Name", "")).strip()
                    address = str(row.get("   UCHC Address", "")).strip().replace("\n", ", ")
                    zone_str = str(row.get("Zone. No", "")).strip()
                    # Resolve zone number from Roman or Arabic
                    zone_num = self._roman_to_int(zone_str)
                    zone_info = CHENNAI_ZONES.get(zone_num, {"center": [13.05, 80.22], "name": "Chennai Central"})
                    # Add tiny deterministic offset based on division number for distinct map points
                    div = int(row.get("Div.No", idx+1) or idx+1)
                    lat = zone_info["center"][0] + ((div % 7) - 3) * 0.005
                    lon = zone_info["center"][1] + ((div % 5) - 2) * 0.006

                    facilities.append({
                        "id": f"uchc_{row.get('S.No', idx+1)}",
                        "name": f"UCHC {name}",
                        "type": "Urban Community Health Centre (UCHC)",
                        "category": "Healthcare Facility",
                        "zone": zone_str,
                        "zone_name": zone_info["name"],
                        "division": div,
                        "address": address,
                        "lat": round(lat, 5),
                        "lon": round(lon, 5),
                        "provenance": "ESTIMATED",
                        "coordinates_status": "ESTIMATED: Corporation Zone & Division locality centroid (Official address observed in GCC master list)",
                        "source": "Greater Chennai Corporation Health Department UCHC List"
                    })
            except Exception as e:
                print(f"Error loading UCHC: {e}")

        if os.path.exists(uphc_path):
            try:
                df_uphc = pd.read_csv(uphc_path)
                for idx, row in df_uphc.iterrows():
                    name = str(row.get("UPHC Name", "")).strip().replace("\n", " ")
                    address = str(row.get("UPHC  Address", "")).strip().replace("\n", ", ")
                    zone_raw = str(row.get("Zone. No", "")).strip()
                    try:
                        zone_num = int(zone_raw)
                    except:
                        zone_num = self._roman_to_int(zone_raw)
                    zone_info = CHENNAI_ZONES.get(zone_num, {"center": [13.06, 80.23], "name": "Chennai"})
                    div_val = row.get("Div.No", idx+1)
                    try:
                        div = int(str(div_val).split(",")[0].strip())
                    except:
                        div = idx + 1

                    lat = zone_info["center"][0] + ((div % 11) - 5) * 0.0035
                    lon = zone_info["center"][1] + ((div % 9) - 4) * 0.0038

                    facilities.append({
                        "id": f"uphc_{row.get('S. No', idx+1)}",
                        "name": f"UPHC {name}",
                        "type": "Urban Primary Health Centre (UPHC)",
                        "category": "Healthcare Facility",
                        "zone": str(zone_num),
                        "zone_name": zone_info["name"],
                        "division": div,
                        "address": address,
                        "lat": round(lat, 5),
                        "lon": round(lon, 5),
                        "provenance": "ESTIMATED",
                        "coordinates_status": "ESTIMATED: Corporation Zone & Division locality centroid (Official address observed in GCC master list)",
                        "source": "Greater Chennai Corporation Health Department UPHC List"
                    })
            except Exception as e:
                print(f"Error loading UPHC: {e}")

        self.healthcare_facilities = facilities
        self.data_status["healthcare_facilities"] = {
            "status": "VALID",
            "count": len(facilities),
            "uchc_count": 16,
            "uphc_count": 140,
            "provenance": "ESTIMATED",
            "coordinates_status": "Centroid estimated from Corporation Zone and Division locality; Facility address and names are OBSERVED from GCC records.",
            "source": "Greater Chennai Corporation (GCC) Health Department",
            "description": "16 Urban Community Health Centres and 140 Urban Primary Health Centres."
        }

    def _load_synthetic_terrain(self):
        fpath = os.path.join(DATA_DIR, "citypulse_synthetic_terrain_elevation.csv")
        if not os.path.exists(fpath):
            self.data_status["synthetic_terrain"] = {"status": "MISSING"}
            return
        try:
            df = pd.read_csv(fpath)
            self.synthetic_terrain_summary = {
                "total_grid_points": len(df),
                "grid_spacing_m": 250,
                "lat_range": [float(df["latitude"].min()), float(df["latitude"].max())],
                "lon_range": [float(df["longitude"].min()), float(df["longitude"].max())],
                "elevation_range_m": [float(df["elevation_m"].min()), float(df["elevation_m"].max())],
                "mean_elevation_m": round(float(df["elevation_m"].mean()), 2),
                "low_lying_count": int((df["terrain_class"] == "low_lying").sum()),
                "gentle_terrain_count": int((df["terrain_class"] == "gentle_terrain").sum()),
                "validation_status": "NOT_VALIDATED_AGAINST_REAL_DEM",
                "disclaimer": "Synthetic terrain — demonstration only; not validated against a real DEM.",
                "provenance": "SIMULATED"
            }
            # Retain representative grid sample (400 points) for map visualization with clear synthetic styling
            sample_df = df.iloc[::25]
            self.synthetic_terrain_points = [
                {
                    "id": f"terrain_{i}",
                    "name": f"Terrain Grid {str(row.get('terrain_class', 'Elevation Point')).replace('_', ' ').title()}",
                    "category": "Synthetic Terrain Elevation",
                    "elevation_m": round(float(row.get("elevation_m", 0.0)), 1),
                    "slope_percent": round(float(row.get("slope_percent", 0.0)), 1),
                    "terrain_class": str(row.get("terrain_class", "unknown")),
                    "lon": float(row["longitude"]),
                    "lat": float(row["latitude"]),
                    "provenance": "SIMULATED",
                    "validation_status": "NOT_VALIDATED_AGAINST_REAL_DEM",
                    "disclaimer": "Synthetic terrain — demonstration only; not validated against a real DEM."
                }
                for i, (_, row) in enumerate(sample_df.iterrows())
            ]
            self.data_status["synthetic_terrain"] = {
                "status": "VALID",
                "count": len(df),
                "displayed_sample_count": len(self.synthetic_terrain_points),
                "provenance": "SIMULATED",
                "validation_status": "NOT_VALIDATED_AGAINST_REAL_DEM",
                "disclaimer": "Synthetic terrain — demonstration only; not validated against a real DEM.",
                "description": "10,416-point grid (250m) across Chennai (12.95–13.20N, 80.10–80.32E) for illustrative drainage flow demonstration."
            }
        except Exception as e:
            self.data_status["synthetic_terrain"] = {"status": "ERROR", "error": str(e)}

    @staticmethod
    def _roman_to_int(s: str) -> int:
        roman_map = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7,
                     "VIII": 8, "IX": 9, "X": 10, "XI": 11, "XII": 12, "XIII": 13, "XIV": 14, "XV": 15}
        clean = s.strip().upper()
        if clean in roman_map:
            return roman_map[clean]
        try:
            return int(clean)
        except:
            return 1


# Global Singleton DataLoader instance
data_loader = DataLoader()
