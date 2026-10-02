import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from app.config import settings
from app.models.plate import FoodItemAnalyzed, NutritionalBreakdown

logger = logging.getLogger(__name__)


class NutritionGroundingService:
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or (settings.DATA_DIR / "usda_sample_db.json")
        self.foods: List[Dict] = []
        self._load_database()

    def _load_database(self):
        try:
            if self.db_path.exists():
                with open(self.db_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.foods = data.get("foods", [])
                logger.info(f"Loaded {len(self.foods)} verified food items from USDA database.")
            else:
                logger.warning(f"USDA database not found at {self.db_path}. Using fallback defaults.")
        except Exception as e:
            logger.error(f"Error loading USDA database: {e}")
            self.foods = []

    def match_food(self, query: str) -> Optional[Dict]:
        """Find the best matching verified USDA food entry using alias and keyword search."""
        query_clean = query.strip().lower()

        # 1. Exact name match
        for food in self.foods:
            if food["name"].lower() == query_clean:
                return food

        # 2. Alias match
        for food in self.foods:
            for alias in food.get("aliases", []):
                if alias.lower() in query_clean or query_clean in alias.lower():
                    return food

        # 3. Partial keyword match
        query_words = set(query_clean.split())
        best_match = None
        max_overlap = 0

        for food in self.foods:
            food_words = set(food["name"].lower().split())
            overlap = len(query_words.intersection(food_words))
            if overlap > max_overlap:
                max_overlap = overlap
                best_match = food

        return best_match if max_overlap > 0 else None

    def calculate_nutrition_for_item(self, food_name: str, weight_g: float) -> FoodItemAnalyzed:
        """Deterministically calculate nutritional breakdown for a specific food item and weight."""
        matched_food = self.match_food(food_name)

        if matched_food:
            per_100 = matched_food["per_100g"]
            multiplier = weight_g / 100.0

            nutrition = NutritionalBreakdown(
                calories=round(per_100["calories"] * multiplier, 1),
                protein_g=round(per_100["protein_g"] * multiplier, 1),
                carbs_g=round(per_100["carbs_g"] * multiplier, 1),
                fat_g=round(per_100["fat_g"] * multiplier, 1),
                fiber_g=round(per_100.get("fiber_g", 0.0) * multiplier, 1),
                sodium_mg=round(per_100.get("sodium_mg", 0.0) * multiplier, 1),
            )
            food_group = matched_food.get("food_group", "General")
            canonical_name = matched_food["name"]
        else:
            # Safe conservative heuristic fallback
            multiplier = weight_g / 100.0
            nutrition = NutritionalBreakdown(
                calories=round(150.0 * multiplier, 1),
                protein_g=round(12.0 * multiplier, 1),
                carbs_g=round(15.0 * multiplier, 1),
                fat_g=round(5.0 * multiplier, 1),
                fiber_g=round(2.0 * multiplier, 1),
                sodium_mg=round(80.0 * multiplier, 1),
            )
            food_group = "Unclassified"
            canonical_name = food_name.title()

        return FoodItemAnalyzed(
            name=canonical_name,
            weight_g=weight_g,
            nutrition=nutrition,
            food_group=food_group,
            confidence=0.92 if matched_food else 0.75,
        )

    def analyze_plate_items(self, raw_items: List[Dict]) -> Tuple[List[FoodItemAnalyzed], NutritionalBreakdown, List[str]]:
        analyzed_items: List[FoodItemAnalyzed] = []
        total_cals = 0.0
        total_p = 0.0
        total_c = 0.0
        total_f = 0.0
        total_fiber = 0.0
        total_sodium = 0.0

        for item in raw_items:
            name = item.get("name", "Unknown item")
            weight = float(item.get("estimated_weight_g", 100.0))
            analyzed = self.calculate_nutrition_for_item(name, weight)
            analyzed_items.append(analyzed)

            total_cals += analyzed.nutrition.calories
            total_p += analyzed.nutrition.protein_g
            total_c += analyzed.nutrition.carbs_g
            total_f += analyzed.nutrition.fat_g
            total_fiber += analyzed.nutrition.fiber_g
            total_sodium += analyzed.nutrition.sodium_mg

        total_nutrition = NutritionalBreakdown(
            calories=round(total_cals, 1),
            protein_g=round(total_p, 1),
            carbs_g=round(total_c, 1),
            fat_g=round(total_f, 1),
            fiber_g=round(total_fiber, 1),
            sodium_mg=round(total_sodium, 1),
        )

        # Health & fitness insights
        insights = []
        protein_ratio = (total_p * 4) / max(total_cals, 1.0)
        if protein_ratio >= 0.30:
            insights.append("High protein density meal (>30% calories from protein) — optimal for lean muscle preservation.")
        elif protein_ratio < 0.15:
            insights.append("Low protein concentration. Consider adding a lean protein source (egg whites, chicken, tofu).")

        if total_fiber >= 6.0:
            insights.append(f"Excellent dietary fiber ({total_fiber}g) helps blunt insulin response and promotes satiety.")

        if total_cals > 850:
            insights.append("Substantial meal volume. Great for a post-workout refuel window.")
        elif total_cals < 400:
            insights.append("Light/snack portion. Fits comfortably within a cutting deficit.")

        if not insights:
            insights.append("Balanced macronutrient ratio with a clean combination of protein, complex carbs, and micronutrients.")

        return analyzed_items, total_nutrition, insights


nutrition_service = NutritionGroundingService()
