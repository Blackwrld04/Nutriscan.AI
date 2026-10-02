from app.services.tabpfn_engine import tabpfn_service


def test_historical_data_loading():
    df = tabpfn_service.load_historical_data()
    assert len(df) >= 20, "Historical check-in dataset should have at least 20 daily logs"
    assert "weight_kg" in df.columns
    assert "calories_in" in df.columns


def test_dynamic_tdee_calculation():
    df = tabpfn_service.load_historical_data()
    dynamic_tdee, static_tdee, efficiency = tabpfn_service.calculate_dynamic_tdee(df)
    assert dynamic_tdee > 1500
    assert static_tdee > 1500
    assert 70.0 <= efficiency <= 140.0


def test_metabolic_forecast_run():
    forecast = tabpfn_service.run_forecast(
        friend_name="Dave",
        target_weight_kg=75.0,
        daily_target_calories=2100.0,
        days_ahead=28
    )
    assert forecast.friend_name == "Dave"
    assert forecast.current_weight_kg > forecast.target_weight_kg
    assert len(forecast.trajectory) == 28
    assert forecast.insights.dynamic_tdee_kcal > 1800
    assert forecast.insights.projected_days_to_goal > 0
