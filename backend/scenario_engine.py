"""
CityPulse 1 - What-If Scenario Simulation Engine
Evaluates parametric municipal scenarios and compares simulated outcomes side-by-side with observed baselines.
"""

from typing import Dict, List, Any, Optional

RAINFALL_SCENARIO_PROFILES = {
    "NORMAL": {
        "name": "Normal Precipitation (Historical Baseline)",
        "rainfall_multiplier": 1.0,
        "description": "Standard seasonal monsoon rainfall matching observed historical IMD records."
    },
    "MODERATE_MONSOON": {
        "name": "Moderate Monsoon Surge (+25% Precipitation)",
        "rainfall_multiplier": 1.25,
        "description": "25% elevation in seasonal rainfall, testing standard municipal runoff margins."
    },
    "SEVERE_MONSOON": {
        "name": "Severe Cyclone / Monsoon Depression (+50% Precipitation)",
        "rainfall_multiplier": 1.50,
        "description": "50% increase in precipitation mimicking intensive coastal depression rainfall."
    },
    "EXTREME_CLOUDBURST": {
        "name": "Extreme Inundation Event (+100% Cloudburst Surge)",
        "rainfall_multiplier": 2.00,
        "description": "Extreme 200% precipitation intensity simulating 2015/2023 peak flooding stresses."
    }
}

class ScenarioEngine:
    def __init__(self):
        pass

    def run_scenario(
        self,
        base_locations: List[Dict[str, Any]],
        scenario_key: str = "SEVERE_MONSOON",
        budget_lakhs: float = 50.0,
        drain_blockage_pct: float = 30.0,
        implemented_interventions_count: int = 5
    ) -> Dict[str, Any]:
        """
        Runs parametric scenario simulation and compares against baseline.
        """
        profile = RAINFALL_SCENARIO_PROFILES.get(scenario_key.upper(), RAINFALL_SCENARIO_PROFILES["MODERATE_MONSOON"])
        mult = profile["rainfall_multiplier"]
        blockage_factor = max(0.0, min(100.0, float(drain_blockage_pct)))

        # Baseline metrics (observed/standard)
        base_scores = [loc.get("composite_risk_score", 45.0) for loc in base_locations]
        base_avg_risk = sum(base_scores) / len(base_scores) if base_scores else 45.0
        base_critical = sum(1 for s in base_scores if s >= 80.0)
        base_high = sum(1 for s in base_scores if 60.0 <= s < 80.0)
        base_moderate = sum(1 for s in base_scores if 40.0 <= s < 60.0)
        base_low = sum(1 for s in base_scores if s < 40.0)

        # Simulated adjustments:
        # Increase from rainfall: + (mult - 1.0) * 25 points
        # Increase from drain blockage: + (blockage_factor / 100.0) * 18 points
        # Relief from implemented interventions: - min(25.0, implemented_interventions_count * 2.8) points
        risk_surge = (mult - 1.0) * 28.0 + (blockage_factor / 100.0) * 18.0
        intervention_relief = min(30.0, implemented_interventions_count * 3.2)
        net_shift = risk_surge - intervention_relief

        simulated_scores = []
        for s in base_scores:
            new_s = max(5.0, min(100.0, s + net_shift))
            simulated_scores.append(round(new_s, 1))

        sim_avg_risk = sum(simulated_scores) / len(simulated_scores) if simulated_scores else 50.0
        sim_critical = sum(1 for s in simulated_scores if s >= 80.0)
        sim_high = sum(1 for s in simulated_scores if 60.0 <= s < 80.0)
        sim_moderate = sum(1 for s in simulated_scores if 40.0 <= s < 60.0)
        sim_low = sum(1 for s in simulated_scores if s < 40.0)

        # Modeled municipal damage cost estimate (₹ Lakhs)
        # Based on critical and high risk infrastructure density
        est_base_damage_lakhs = round(base_critical * 4.5 + base_high * 2.0, 1)
        est_sim_damage_lakhs = round(sim_critical * 4.5 + sim_high * 2.0, 1)
        damage_diff_lakhs = round(est_sim_damage_lakhs - est_base_damage_lakhs, 1)

        return {
            "scenario_metadata": {
                "profile_id": scenario_key,
                "profile_name": profile["name"],
                "rainfall_multiplier": mult,
                "drain_blockage_pct": blockage_factor,
                "allocated_budget_lakhs": budget_lakhs,
                "implemented_interventions": implemented_interventions_count,
                "description": profile["description"],
                "provenance": "SIMULATED (Parametric model output)"
            },
            "baseline": {
                "label": "Observed Baseline Conditions",
                "average_risk_score": round(base_avg_risk, 1),
                "risk_distribution": {
                    "critical": base_critical,
                    "high": base_high,
                    "moderate": base_moderate,
                    "low": base_low
                },
                "estimated_consequence_exposure_lakhs": est_base_damage_lakhs
            },
            "simulated_outcome": {
                "label": f"Simulated: {profile['name']}",
                "average_risk_score": round(sim_avg_risk, 1),
                "risk_score_delta": round(sim_avg_risk - base_avg_risk, 1),
                "risk_distribution": {
                    "critical": sim_critical,
                    "high": sim_high,
                    "moderate": sim_moderate,
                    "low": sim_low
                },
                "estimated_consequence_exposure_lakhs": est_sim_damage_lakhs,
                "exposure_delta_lakhs": damage_diff_lakhs,
                "interventions_efficacy": f"{implemented_interventions_count} funded maintenance actions averted an estimated ₹{round(intervention_relief * 3.5, 1)} Lakhs in potential flood exposure."
            },
            "comparison_summary": {
                "critical_delta": sim_critical - base_critical,
                "high_delta": sim_high - base_high,
                "risk_direction": "INCREASED" if net_shift > 0 else ("DECREASED" if net_shift < 0 else "NEUTRAL"),
                "assessment": (
                    f"Under {profile['name']} with {blockage_factor:.0f}% drain blockage, overall city infrastructure risk shifts by {net_shift:+.1f} points. "
                    f"Critical hotspots change from {base_critical} to {sim_critical}. "
                    f"Prioritized budget allocation of ₹{budget_lakhs} Lakhs suppresses potential surge by {intervention_relief:.1f} risk points."
                )
            },
            "disclaimer": "Simulated What-If scenario model for decision support and contingency budgeting. Not a certified meteorological forecast or hydraulic structural certification."
        }

scenario_engine = ScenarioEngine()
