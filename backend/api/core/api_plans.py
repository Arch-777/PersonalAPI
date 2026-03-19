from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PlanTierSpec:
    key: str
    display_name: str
    monthly_price_usd: float
    variable_cost_usd: float
    gross_margin_usd: float
    gross_margin_percent: float | None
    monthly_quota: int
    requests_per_minute: int


PLAN_TIER_SPECS: dict[str, PlanTierSpec] = {
    "free": PlanTierSpec(
        key="free",
        display_name="Free",
        monthly_price_usd=0.0,
        variable_cost_usd=0.37,
        gross_margin_usd=-0.37,
        gross_margin_percent=None,
        monthly_quota=5000,
        requests_per_minute=60,
    ),
    "personal_pro": PlanTierSpec(
        key="personal_pro",
        display_name="Personal Pro",
        monthly_price_usd=10.0,
        variable_cost_usd=0.55,
        gross_margin_usd=9.45,
        gross_margin_percent=94.5,
        monthly_quota=50000,
        requests_per_minute=180,
    ),
    "developer": PlanTierSpec(
        key="developer",
        display_name="Developer",
        monthly_price_usd=18.0,
        variable_cost_usd=0.80,
        gross_margin_usd=17.20,
        gross_margin_percent=95.6,
        monthly_quota=250000,
        requests_per_minute=600,
    ),
    "team": PlanTierSpec(
        key="team",
        display_name="Team",
        monthly_price_usd=6.0,
        variable_cost_usd=0.40,
        gross_margin_usd=5.60,
        gross_margin_percent=93.3,
        monthly_quota=100000,
        requests_per_minute=300,
    ),
    "enterprise": PlanTierSpec(
        key="enterprise",
        display_name="Enterprise",
        monthly_price_usd=35.0,
        variable_cost_usd=1.20,
        gross_margin_usd=33.80,
        gross_margin_percent=96.6,
        monthly_quota=1000000,
        requests_per_minute=1200,
    ),
}


def get_plan_tier_spec(tier: str) -> PlanTierSpec:
    normalized = (tier or "").strip().lower()
    try:
        return PLAN_TIER_SPECS[normalized]
    except KeyError as exc:
        allowed = ", ".join(sorted(PLAN_TIER_SPECS.keys()))
        raise ValueError(f"Invalid plan_tier '{tier}'. Allowed values: {allowed}") from exc


def list_plan_tiers() -> list[str]:
    return sorted(PLAN_TIER_SPECS.keys())
