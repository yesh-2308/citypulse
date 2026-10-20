"""
Automated Test Suite for CityPulse 1
Tests: DataLoader, RiskEngine, CascadeEngine, BudgetOptimizer, ScenarioEngine, and API endpoints.
"""

import unittest
from backend.data_loader import DataLoader, data_loader, haversine_km
from backend.risk_engine import RiskEngine, risk_engine
from backend.cascade_engine import CascadeEngine, cascade_engine
from backend.budget_optimizer import BudgetOptimizer, budget_optimizer
from backend.scenario_engine import ScenarioEngine, scenario_engine

class TestCityPulseEngines(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Ensure datasets are loaded
        data_loader.load_all()

    def test_01_data_loader_counts_and_provenance(self):
        """Verify that observed datasets are parsed and tagged with honest provenance."""
        self.assertGreater(len(data_loader.flood_hotspots), 300)
        self.assertGreater(len(data_loader.water_stagnation), 700)
        self.assertGreater(len(data_loader.basin_drainage), 800)
        self.assertGreater(len(data_loader.healthcare_facilities), 150)
        self.assertGreater(len(data_loader.groundwater_level), 10)
        self.assertGreater(len(data_loader.groundwater_quality), 5)
        self.assertGreater(len(data_loader.rainfall_data), 50)
        
        # Check provenance tags
        self.assertEqual(data_loader.flood_hotspots[0]["provenance"], "OBSERVED")
        self.assertEqual(data_loader.healthcare_facilities[0]["provenance"], "ESTIMATED")
        self.assertEqual(data_loader.synthetic_terrain_summary["provenance"], "SIMULATED")
        self.assertEqual(data_loader.synthetic_terrain_summary["validation_status"], "NOT_VALIDATED_AGAINST_REAL_DEM")

    def test_02_haversine_distance(self):
        """Verify distance calculation between known landmarks in Chennai."""
        # Distance between Chennai Central (13.0827, 80.2707) and Guindy (13.0067, 80.2025) is approx 11 km
        d = haversine_km(13.0827, 80.2707, 13.0067, 80.2025)
        self.assertGreater(d, 9.0)
        self.assertLess(d, 13.0)

    def test_03_risk_engine_deterministic_and_reproducible(self):
        """Verify that evaluating the same location twice produces identical deterministic scores."""
        lat, lon = 13.1163, 80.2673  # Sathya Moorthy Nagar flood hotspot
        res1 = risk_engine.evaluate_location(
            target_lat=lat,
            target_lon=lon,
            location_name="Sathya Moorthy Nagar",
            category="Flood Hotspot",
            hotspots=data_loader.flood_hotspots,
            stagnations=data_loader.water_stagnation,
            drains=data_loader.stormwater_drains,
            gw_stations=data_loader.groundwater_level,
            rainfall_records=data_loader.rainfall_data
        )
        res2 = risk_engine.evaluate_location(
            target_lat=lat,
            target_lon=lon,
            location_name="Sathya Moorthy Nagar",
            category="Flood Hotspot",
            hotspots=data_loader.flood_hotspots,
            stagnations=data_loader.water_stagnation,
            drains=data_loader.stormwater_drains,
            gw_stations=data_loader.groundwater_level,
            rainfall_records=data_loader.rainfall_data
        )
        self.assertEqual(res1["composite_risk_score"], res2["composite_risk_score"])
        self.assertEqual(res1["risk_level"], res2["risk_level"])
        self.assertEqual(len(res1["factors"]), 6)
        self.assertTrue(0.0 <= res1["composite_risk_score"] <= 100.0)

    def test_04_risk_engine_factors_and_drivers(self):
        """Verify that factor scores are bounded and top driver is explained."""
        lat, lon = 13.0417, 80.2083  # Kodambakkam with shallow groundwater
        res = risk_engine.evaluate_location(
            target_lat=lat,
            target_lon=lon,
            location_name="Kodambakkam Site",
            category="Urban Site",
            hotspots=data_loader.flood_hotspots,
            stagnations=data_loader.water_stagnation,
            drains=data_loader.stormwater_drains,
            gw_stations=data_loader.groundwater_level,
            rainfall_records=data_loader.rainfall_data
        )
        self.assertIn("explanation_summary", res)
        for f in res["factors"]:
            self.assertTrue(0.0 <= f["score"] <= 100.0)
            self.assertIn("evidence_type", f)

    def test_05_cascade_engine_propagation(self):
        """Verify that cascading failure activates downstream stages and responds to severity."""
        base_sim = cascade_engine.simulate(
            trigger_feature_id="swd_1",
            drainage_features=data_loader.stormwater_drains,
            stagnation_points=data_loader.water_stagnation,
            road_features=data_loader.road_centerlines,
            healthcare_facilities=data_loader.healthcare_facilities,
            rainfall_severity=1.0,
            drain_blockage_pct=20.0
        )
        severe_sim = cascade_engine.simulate(
            trigger_feature_id="swd_1",
            drainage_features=data_loader.stormwater_drains,
            stagnation_points=data_loader.water_stagnation,
            road_features=data_loader.road_centerlines,
            healthcare_facilities=data_loader.healthcare_facilities,
            rainfall_severity=2.0,
            drain_blockage_pct=80.0
        )

        self.assertGreaterEqual(
            severe_sim["scenario_parameters"]["computed_impact_radius_km"],
            base_sim["scenario_parameters"]["computed_impact_radius_km"]
        )
        self.assertGreater(
            severe_sim["scenario_parameters"]["modeled_overflow_discharge_m3_hr"],
            base_sim["scenario_parameters"]["modeled_overflow_discharge_m3_hr"]
        )
        self.assertEqual(len(severe_sim["stages"]), 4)
        self.assertEqual(len(severe_sim["graph"]["nodes"]), 4)

    def test_06_budget_optimizer_budget_constraint(self):
        """Verify that optimizer NEVER exceeds the configured budget."""
        candidates = budget_optimizer.generate_candidate_interventions(data_loader.flood_hotspots[:20])
        self.assertGreater(len(candidates), 5)

        for test_budget in [25.0, 50.0, 100.0]:
            opt_res = budget_optimizer.optimize(candidates, total_budget_lakhs=test_budget)
            plan = opt_res["optimal_plan"]
            self.assertLessEqual(plan["total_cost_lakhs"], test_budget)
            self.assertGreaterEqual(plan["remaining_budget_lakhs"], 0.0)
            self.assertGreater(plan["total_estimated_benefit"], 0.0)

    def test_07_budget_optimizer_outperforms_baseline(self):
        """Verify that cost-benefit knapsack optimizer achieves higher benefit than naive baseline."""
        candidates = budget_optimizer.generate_candidate_interventions(data_loader.flood_hotspots[:30])
        opt_res = budget_optimizer.optimize(candidates, total_budget_lakhs=50.0)
        opt_benefit = opt_res["optimal_plan"]["total_estimated_benefit"]
        baseline_benefit = opt_res["naive_baseline_comparison"]["total_estimated_benefit"]
        self.assertGreaterEqual(opt_benefit, baseline_benefit)

    def test_08_what_if_scenario_simulation(self):
        """Verify that what-if scenario shifts risk logically and maintains baseline integrity."""
        sample_locs = [
            {"composite_risk_score": 40.0},
            {"composite_risk_score": 65.0},
            {"composite_risk_score": 85.0}
        ]
        scen_res = scenario_engine.run_scenario(
            base_locations=sample_locs,
            scenario_key="EXTREME_CLOUDBURST",
            budget_lakhs=50.0,
            drain_blockage_pct=50.0,
            implemented_interventions_count=2
        )
        baseline = scen_res["baseline"]
        sim = scen_res["simulated_outcome"]
        self.assertGreaterEqual(sim["average_risk_score"], baseline["average_risk_score"])
        self.assertIn("risk_score_delta", sim)
        self.assertEqual(len(sample_locs), 3)  # Source was not mutated

if __name__ == "__main__":
    unittest.main()
