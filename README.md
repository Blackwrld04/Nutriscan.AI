# OpenCal AI 🥗
### The Open-Source, Private "Cal AI" with In-Context Metabolic Forecasting
*A submission for the [Hacktoberfest Weekend Challenge: Build for a Friend](https://dev.to/challenges/hacktoberfest-weekend-2026-10-01)*

[![Hacktoberfest 2026](https://img.shields.io/badge/Hacktoberfest-2026_Weekend_Challenge-orange.svg)](https://hacktoberfest.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![Google Gemma](https://img.shields.io/badge/Google-Gemma_2-4285F4.svg)](https://ai.google.dev/gemma)
[![Prior Labs TabPFN](https://img.shields.io/badge/Prior_Labs-TabPFN_Foundation_Model-10b981.svg)](https://github.com/PriorLabs/TabPFN)
[![ElevenLabs](https://img.shields.io/badge/ElevenLabs-Voice_AI-black.svg)](https://elevenlabs.io)
[![Sentry](https://img.shields.io/badge/Sentry-Agent_Tracing-purple.svg)](https://sentry.io)

---

## 📖 DEV Submission Post Draft

```markdown
---
title: OpenCal AI: Visual Macro Tracking Meets In-Context Metabolic Forecasting
published: true
tags: devchallenge, weekendchallenge, hf26challenge
---

*This is a submission for the [Hacktoberfest Weekend Challenge: Build for a Friend](https://dev.to/challenges/hacktoberfest-weekend-2026-10-01)*

## What I Built
Commercial food-tracking apps like **Cal AI** have gone viral for their sleek camera meal scanning, but they come with two severe problems:
1. **Aggressive $35/month paywalls** and privacy traps (uploading intimate meal photos and biological health records to closed corporate clouds).
2. **The "Static Math" Fallacy**: Every commercial app uses 1990s static BMR formulas (like Mifflin-St Jeor) that completely fail to account for real-world metabolic adaptation, non-exercise activity thermogenesis (NEAT), and water retention.

I built **OpenCal AI** for my gym partner and close friend **Dave**. Dave has been balancing a demanding tech job with marathon training and fat loss. He was tired of paying subscription fees and frustrated that generic calorie calculators didn't reflect his real-world scale progress.

**OpenCal AI** pairs open-weight **Google Gemma Vision** with verified **USDA nutritional grounding** and **Prior Labs' TabPFN**—the world’s leading tabular foundation model. Instead of relying on a generic formula, TabPFN ingests Dave's personal 30-day check-in log and uses in-context transformer learning to discover his **true dynamic daily burn rate (TDEE)** and project his exact 28-day weight trajectory.

## Demo
- **Live Deployed App:** [https://opencal-ai.onrender.com](https://opencal-ai.onrender.com)
- **Demo Highlights:**
  - **Meal Plate Scanner:** Snap or drop a food photo (or test with 1-click presets: Pan-Seared Salmon, Grilled Chicken Rice, Sirloin Steak).
  - **Deterministic Grounding:** Gemma extracts food items and gram portions; verified USDA tables compute exact calories, protein, carbs, and fats.
  - **TabPFN Metabolic Forecaster:** Live calculation of dynamic TDEE vs. static formulas with interactive trajectory curves and caloric target simulations.
  - **ElevenLabs Voice Coach:** Generates a personalized daily audio briefing summarizing the meal and forecast.

> *"Dave's Reaction: 'Wait, this actually predicted my Friday drop before MyFitnessPal even updated my TDEE! And having this run without paying $35 a month is insane.' "*

## Code
The full source code is hosted on GitHub:
👉 **[github.com/your-username/opencal-ai](https://github.com/your-username/opencal-ai)**

## How I Built It
OpenCal AI is built on a clean 5-stage architecture:
1. **Vision Perception Layer (Google Gemma 2):** Takes meal photos, identifies food items, and estimates portion weights in grams based on plate geometry.
2. **Grounding Layer (USDA FoodData Central):** Eliminates LLM hallucination by deterministically computing macros from USDA reference tables.
3. **Metabolic Engine Layer (Prior Labs TabPFN):** The tabular foundation model ingests the friend's daily log (`[calories, protein, carbs, fat, steps, sleep, weight]`). Using in-context learning in a single forward pass, it solves for dynamic TDEE and forecasts future weight points with confidence bounds.
4. **Voice Coaching Layer (ElevenLabs):** Synthesizes a warm, motivating 30-second audio debrief.
5. **Observability Layer (Sentry Agent Tracing):** Full-pipeline telemetry monitoring vision latency, USDA cache hits, TabPFN forward pass time, and audio generation.
6. **Cloud Deployment (Render):** Dockerized and deployed 24/7 on Render.

## Why Does Open Innovation Matter?
Nutrition, body weight, and metabolic telemetry are among the most intimate biological datasets a human generates. 

Sending daily photos of home-cooked meals and personal weigh-ins to closed, proprietary cloud providers surrenders user sovereignty to opaque companies that monetize health data. Furthermore, commercial APIs can alter pricing, censor prompts, or shutter services without notice.

**Open innovation changes everything:**
- **Zero Cost:** By running open-weight models (Gemma) and foundation tabular models (TabPFN), high-performance sports nutrition runs at $0 token cost.
- **Complete Biological Privacy:** Data stays on-device or within private sovereign infrastructure.
- **Customizable Science:** Open tabular models like TabPFN allow us to fine-tune and adapt directly to one person's unique biology rather than forcing them into a static population average.

## Prize Categories
- **Best Use of Gemma ($200)**: Open-weight vision reasoning and portion extraction.
- **Best Use of TabPFN ($200)**: In-context tabular foundation model for dynamic metabolic expenditure and weight forecasting.
- **Best Use of Render ($200)**: Deployed full-stack web service and API.
- **Best Use of ElevenLabs ($100)**: Personalized daily voice coaching debrief.
- **Best Use of Sentry Agent Tracing ($100)**: Full-span AI agent observability.
```

---

## 🚀 Quickstart & Local Installation

### 1. Clone & Set Up Virtual Environment
```bash
git clone https://github.com/your-username/opencal-ai.git
cd opencal-ai

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
# Edit .env with your optional API keys (ElevenLabs, Sentry, TabPFN)
```

### 3. Launch the Application
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser!

---

## 🧪 Running Unit Tests
```bash
pytest tests/
```
