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
    assert data["service"] == "OpenCal AI"


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


def test_coach_debrief_endpoint():
    payload = {
        "friend_name": "Dave",
        "meal_name": "Pan-Seared Salmon Fuel Plate",
        "calories": 620.0,
        "protein_g": 45.0,
        "days_to_goal": 22,
        "target_weight": 75.0
    }
    response = client.post("/api/coach-debrief", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert "Dave" in data["text"]


def test_scan_page_endpoints():
    res_scan = client.get("/scan")
    assert res_scan.status_code == 200
    assert "text/html" in res_scan.headers["content-type"]
    assert "PLATE SCANNER" in res_scan.text
    assert "trajectoryChart" in res_scan.text

    res_scanner = client.get("/scanner")
    assert res_scanner.status_code == 200
    assert "text/html" in res_scanner.headers["content-type"]

