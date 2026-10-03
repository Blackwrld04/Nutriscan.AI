from contextlib import asynccontextmanager
import logging
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.config import settings
from app.models.plate import PlateAnalysisResult
from app.models.metabolic import MetabolicForecastResponse
from app.services.elevenlabs_coach import coach_service
from app.services.gemma_vision import gemma_service
from app.services.tabpfn_engine import tabpfn_service
from app.services.tracing import init_tracing, trace_span

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("opencal-ai")


# Initialize Sentry Agent Tracing before FastAPI app creation
init_tracing()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing NutriScan AI Services...")
    # Preload database and models
    _ = tabpfn_service.load_historical_data()
    logger.info("NutriScan AI Ready.")
    yield
    # Shutdown
    logger.info("Shutting down NutriScan AI...")


app = FastAPI(
    title="NutriScan AI",
    description="The Open-Source, Private Cal AI with In-Context Metabolic Forecasting (Gemma + TabPFN + ElevenLabs)",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
static_dir = settings.STATIC_DIR
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.get("/")
async def root():
    index_file = static_dir / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "NutriScan AI API is running. Access /docs for API documentation."}


@app.get("/scan")
@app.get("/scanner")
async def scan_page():
    scan_file = static_dir / "scan.html"
    if scan_file.exists():
        return FileResponse(scan_file)
    return FileResponse(static_dir / "index.html")


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "NutriScan AI",
        "gemma_model": settings.GEMMA_MODEL,
        "tabpfn_engine": "active",
        "environment": settings.ENVIRONMENT
    }


@app.post("/api/analyze-plate", response_model=PlateAnalysisResult)
async def analyze_plate(file: UploadFile = File(...)):
    """
    Endpoint 1: Vision Plate Recognition & Deterministic Nutrition
    Uploads a photo of food. Runs Gemma Vision model + USDA Grounding database.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image (JPEG, PNG, WebP).")

    with trace_span("gen_ai.vision", "Gemma 2 Plate Identification", {"filename": file.filename}):
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Empty image file received.")

        result = gemma_service.analyze_plate(contents, filename=file.filename)
        return result


@app.get("/api/metabolic-forecast", response_model=MetabolicForecastResponse)
async def get_metabolic_forecast(
    friend_name: str = "Dave",
    target_weight_kg: float = 75.0,
    daily_calories_target: float = 2100.0,
    days_ahead: int = 28
):
    """
    Endpoint 2: Prior Labs TabPFN In-Context Metabolic Forecasting
    Calculates true dynamic TDEE and predicts weight trajectory over 28 days.
    """
    with trace_span("gen_ai.tabular", "TabPFN In-Context Metabolic Forecast", {"target_weight": target_weight_kg}):
        forecast = tabpfn_service.run_forecast(
            friend_name=friend_name,
            target_weight_kg=target_weight_kg,
            daily_target_calories=daily_calories_target,
            days_ahead=days_ahead
        )
        return forecast


class CoachDebriefRequest(BaseModel):
    friend_name: str = "Dave"
    meal_name: str = "Grilled Salmon Quinoa Bowl"
    calories: float = 620.0
    protein_g: float = 45.0
    days_to_goal: int = 22
    target_weight: float = 75.0


@app.post("/api/coach-debrief")
async def generate_coach_debrief(req: CoachDebriefRequest):
    """
    Endpoint 3: ElevenLabs Audio Coach Debrief
    Synthesizes a personalized voice debrief for the friend.
    """
    with trace_span("gen_ai.voice", "ElevenLabs Daily Coach Briefing", {"friend": req.friend_name}):
        script = coach_service.compose_coach_script(
            friend_name=req.friend_name,
            meal_name=req.meal_name,
            calories=req.calories,
            protein_g=req.protein_g,
            days_to_goal=req.days_to_goal,
            target_weight=req.target_weight
        )
        speech_result = coach_service.generate_speech(script)
        return speech_result


@app.get("/api/sample-history")
async def get_sample_history():
    """Retrieve the friend's 30-day historical calibration log for charts."""
    df = tabpfn_service.load_historical_data()
    return df.to_dict(orient="records")


@app.get("/sentry-debug")
async def trigger_sentry_debug():
    """Verify Sentry Agent Tracing and Error Monitoring integration."""
    logger.info("Triggering Sentry test event...")
    _ = 1 / 0

