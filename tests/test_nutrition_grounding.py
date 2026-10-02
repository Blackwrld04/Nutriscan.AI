from app.services.nutrition_grounding import nutrition_service


def test_usda_database_loaded():
    assert len(nutrition_service.foods) > 0, "USDA database should contain verified food entries"


def test_food_matching_and_calculation():
    analyzed = nutrition_service.calculate_nutrition_for_item("Grilled Chicken Breast", 200.0)
    assert analyzed.name == "Grilled Chicken Breast"
    assert analyzed.weight_g == 200.0
    # 200g of chicken breast: 165 * 2 = 330 kcal, 31 * 2 = 62g protein
    assert analyzed.nutrition.calories == 330.0
    assert analyzed.nutrition.protein_g == 62.0
    assert analyzed.nutrition.carbs_g == 0.0


def test_plate_analysis():
    raw_items = [
        {"name": "Pan-Seared Atlantic Salmon", "estimated_weight_g": 180.0},
        {"name": "Cooked White Rice", "estimated_weight_g": 150.0},
        {"name": "Steamed Broccoli", "estimated_weight_g": 100.0}
    ]
    items, totals, insights = nutrition_service.analyze_plate_items(raw_items)
    assert len(items) == 3
    assert totals.calories > 400
    assert totals.protein_g > 35
    assert len(insights) > 0
