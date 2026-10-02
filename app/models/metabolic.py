from pydantic import BaseModel, Field
from typing import List, Optional


class DailyCheckIn(BaseModel):
    date: str
    calories_in: float
    protein_g: float
    carbs_g: float
    fat_g: float
    steps: int = 8000
    sleep_hrs: float = 7.5
    weight_kg: float


class WeightTrajectoryPoint(BaseModel):
    day_offset: int
    date_str: str
    projected_weight_kg: float
    confidence_lower_kg: float
    confidence_upper_kg: float


class MetabolicInsights(BaseModel):
    dynamic_tdee_kcal: float = Field(..., description="Calculated true metabolic expenditure from personal history")
    static_formula_tdee_kcal: float = Field(..., description="Static Mifflin-St Jeor formula TDEE comparison")
    metabolic_efficiency_percent: float = Field(..., description="Percent ratio of observed vs expected burn rate")
    metabolic_status: str = Field(..., description="e.g., Optimal Fat Loss, Adaptive Plateau, Bulking Surplus")
    projected_days_to_goal: int
    recommended_protein_g: float
    recommended_calories_kcal: float
    actionable_feedback: List[str]


class MetabolicForecastResponse(BaseModel):
    friend_name: str = "Friend"
    current_weight_kg: float
    target_weight_kg: float
    insights: MetabolicInsights
    trajectory: List[WeightTrajectoryPoint]
    model_name: str = "Prior Labs TabPFN (Tabular In-Context Transformer)"
    inference_time_ms: float
