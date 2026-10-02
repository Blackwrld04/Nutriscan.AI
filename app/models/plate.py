from pydantic import BaseModel, Field
from typing import List, Optional


class NutritionalBreakdown(BaseModel):
    calories: float = Field(..., description="Energy in kcal")
    protein_g: float = Field(..., description="Protein in grams")
    carbs_g: float = Field(..., description="Total carbohydrates in grams")
    fat_g: float = Field(..., description="Total lipids/fat in grams")
    fiber_g: float = Field(0.0, description="Dietary fiber in grams")
    sodium_mg: float = Field(0.0, description="Sodium in milligrams")


class FoodItemDetected(BaseModel):
    name: str = Field(..., description="Identified food item name")
    estimated_weight_g: float = Field(..., description="Estimated portion weight in grams")
    confidence: float = Field(default=0.9, description="Detection confidence score between 0 and 1")
    preparation: Optional[str] = Field(None, description="Preparation method (e.g. grilled, fried, raw)")


class FoodItemAnalyzed(BaseModel):
    name: str
    weight_g: float
    nutrition: NutritionalBreakdown
    food_group: str = "General"
    confidence: float = 0.9


class PlateAnalysisResult(BaseModel):
    meal_name: str
    items: List[FoodItemAnalyzed]
    total_nutrition: NutritionalBreakdown
    health_insights: List[str]
    processing_time_ms: float
    inference_source: str = "Gemma 2 Multimodal + USDA Grounding"
