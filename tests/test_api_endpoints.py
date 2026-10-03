import io
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)


def test_health_check_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "NutriScan AI"


def test_metabolic_forecast_endpoint():
    response = client.get("/api/metabolic-forecast?friend_name=Dave&target_weight_kg=75.0&daily_calories_target=2100")
    assert response.status_code == 200
    data = response.json()
    assert data["friend_name"] == "Dave"
    assert "insights" in data
    assert "trajectory" in data
    assert len(data["trajectory"]) > 0


def test_analyze_plate_endpoint():
    # Create sample in-memory test image
    img = Image.new("RGB", (300, 300), color=(180, 80, 50))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="JPEG")
    img_byte_arr.seek(0)

    response = client.post(
        "/api/analyze-plate",
        files={"file": ("test_plate.jpg", img_byte_arr, "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "meal_name" in data
    assert "items" in data
    assert len(data["items"]) > 0
    assert "total_nutrition" in data
    assert data["total_nutrition"]["calories"] >= 0


def test_coach_debrief_endpoint_personalized_name():
    payload = {
        "friend_name": "Maya",
        "meal_name": "Avocado & Egg Toast",
        "calories": 480.0,
        "protein_g": 24.0,
        "days_to_goal": 18,
        "target_weight": 62.5
    }
    response = client.post("/api/coach-debrief", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert "Maya" in data["text"]
    assert "Avocado & Egg Toast" in data["text"]


def test_coach_debrief_suggested_questions():
    # 1. Timeline Question
    res_timeline = client.post("/api/coach-debrief", json={
        "friend_name": "Marcus",
        "meal_name": "Grilled Chicken Rice Bowl",
        "calories": 650.0,
        "protein_g": 52.0,
        "days_to_goal": 15,
        "target_weight": 78.0,
        "target_calories": 2200.0,
        "target_protein": 160.0,
        "total_calories_today": 1400.0,
        "total_protein_today": 95.0,
        "question_type": "timeline"
    })
    assert res_timeline.status_code == 200
    text_timeline = res_timeline.json()["text"]
    assert "Marcus" in text_timeline
    assert "15 days" in text_timeline or "15" in text_timeline
    assert "78" in text_timeline

    # 2. TDEE Question
    res_tdee = client.post("/api/coach-debrief", json={
        "friend_name": "Marcus",
        "tdee": 2650.0,
        "total_calories_today": 1800.0,
        "question_type": "tdee"
    })
    assert res_tdee.status_code == 200
    text_tdee = res_tdee.json()["text"]
    assert "Marcus" in text_tdee
    assert "2650" in text_tdee
    assert "TabPFN" in text_tdee

    # 3. Protein Question
    res_protein = client.post("/api/coach-debrief", json={
        "friend_name": "Marcus",
        "target_protein": 150.0,
        "total_protein_today": 80.0,
        "question_type": "protein"
    })
    assert res_protein.status_code == 200
    text_protein = res_protein.json()["text"]
    assert "Marcus" in text_protein
    assert "80" in text_protein
    assert "150" in text_protein
    assert "prioritize protein" in text_protein.lower() or "evening meal" in text_protein.lower()

    # 4. Custom Question
    res_custom = client.post("/api/coach-debrief", json={
        "friend_name": "Marcus",
        "question_type": "custom",
        "custom_question": "Can I have Greek yogurt tonight?"
    })
    assert res_custom.status_code == 200
    text_custom = res_custom.json()["text"]
    assert "Marcus" in text_custom
    assert "Greek yogurt" in text_custom


def test_scan_page_endpoints():
    res_scan = client.get("/scan")
    assert res_scan.status_code == 200
    assert "text/html" in res_scan.headers["content-type"]
    assert "PLATE SCANNER" in res_scan.text
    assert "trajectoryChart" in res_scan.text

    res_scanner = client.get("/scanner")
    assert res_scanner.status_code == 200
    assert "text/html" in res_scanner.headers["content-type"]

