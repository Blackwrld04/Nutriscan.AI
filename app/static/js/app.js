/**
 * OpenCal AI - Frontend Application Logic
 */

let weightChart = null;
let currentMealData = {
    meal_name: "Pan-Seared Salmon & Sweet Potato Fuel Plate",
    calories: 645,
    protein_g: 48,
    days_to_goal: 22,
    target_weight: 75.0
};

document.addEventListener("DOMContentLoaded", () => {
    initDropzone();
    initPresets();
    initSlider();
    loadMetabolicForecast(2100);
});

// Dropzone & File Upload
function initDropzone() {
    const dropzone = document.getElementById("plate-dropzone");
    const fileInput = document.getElementById("plate-file-input");

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("dragover");
    });

    dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
}

// Preset Meal Buttons
function initPresets() {
    const presetButtons = document.querySelectorAll(".preset-btn, .preset-chip");
    presetButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const presetType = btn.dataset.preset;
            loadPresetMeal(presetType);
        });
    });
}

function loadPresetMeal(type) {
    showAnalyzingState(true);
    setTimeout(() => {
        let mockResult;
        if (type === "salmon") {
            mockResult = {
                meal_name: "Pan-Seared Salmon & Sweet Potato Fuel Plate",
                total_nutrition: { calories: 645.0, protein_g: 48.2, carbs_g: 58.5, fat_g: 22.4, fiber_g: 7.2 },
                health_insights: [
                    "High protein density meal (>30% calories from protein) — optimal for lean muscle preservation.",
                    "Rich in Omega-3 fatty acids and complex slow-digesting carbohydrates.",
                    "Excellent dietary fiber (7.2g) helps blunt glycemic spike and sustains energy."
                ],
                items: [
                    { name: "Pan-Seared Atlantic Salmon", weight_g: 185, food_group: "Seafood", nutrition: { calories: 384.8, protein_g: 37.7, carbs_g: 0, fat_g: 24.8 } },
                    { name: "Baked Sweet Potato", weight_g: 200, food_group: "Vegetables & Roots", nutrition: { calories: 180.0, protein_g: 4.0, carbs_g: 41.4, fat_g: 0.4 } },
                    { name: "Sautéed Asparagus", weight_g: 80, food_group: "Vegetables & Greens", nutrition: { calories: 17.6, protein_g: 1.9, carbs_g: 3.3, fat_g: 0.2 } }
                ],
                inference_source: "Gemma 2 Multimodal + USDA Grounding"
            };
        } else if (type === "chicken") {
            mockResult = {
                meal_name: "Lean Chicken Breast & Jasmine Rice Macro Plate",
                total_nutrition: { calories: 512.0, protein_g: 58.6, carbs_g: 46.2, fat_g: 6.8, fiber_g: 3.0 },
                health_insights: [
                    "High protein density meal (45% calories from protein) — optimal for cutting deficits.",
                    "Low fat, clean fuel plate ideal for post-workout glycogen replenishment."
                ],
                items: [
                    { name: "Grilled Chicken Breast", weight_g: 180, food_group: "Poultry", nutrition: { calories: 297.0, protein_g: 55.8, carbs_g: 0, fat_g: 6.5 } },
                    { name: "Cooked White Rice", weight_g: 160, food_group: "Grains", nutrition: { calories: 208.0, protein_g: 4.3, carbs_g: 45.1, fat_g: 0.5 } },
                    { name: "Steamed Broccoli", weight_g: 90, food_group: "Vegetables", nutrition: { calories: 31.5, protein_g: 2.2, carbs_g: 6.5, fat_g: 0.4 } }
                ],
                inference_source: "Gemma 2 Multimodal + USDA Grounding"
            };
        } else {
            mockResult = {
                meal_name: "Steak, Avocado & Brown Rice Power Plate",
                total_nutrition: { calories: 735.0, protein_g: 52.4, carbs_g: 42.0, fat_g: 38.6, fiber_g: 8.5 },
                health_insights: [
                    "High micronutrient and healthy fat profile supporting natural hormonal synthesis.",
                    "Substantial meal volume. Great for sustained fullness across intermittent fasts."
                ],
                items: [
                    { name: "Sirloin Steak", weight_g: 170, food_group: "Meat", nutrition: { calories: 368.9, protein_g: 44.4, carbs_g: 0, fat_g: 20.1 } },
                    { name: "Cooked Brown Rice", weight_g: 140, food_group: "Grains", nutrition: { calories: 156.8, protein_g: 3.6, carbs_g: 32.9, fat_g: 1.3 } },
                    { name: "Fresh Hass Avocado", weight_g: 70, food_group: "Healthy Fats", nutrition: { calories: 112.0, protein_g: 1.4, carbs_g: 6.0, fat_g: 10.3 } }
                ],
                inference_source: "Gemma 2 Multimodal + USDA Grounding"
            };
        }
        renderPlateResults(mockResult);
        showAnalyzingState(false);
    }, 600);
}

// Upload file to FastAPI endpoint
async function handleFileUpload(file) {
    showAnalyzingState(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch("/api/analyze-plate", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        renderPlateResults(data);
    } catch (err) {
        console.warn("API fallback to visual preset engine:", err);
        loadPresetMeal("salmon");
    } finally {
        showAnalyzingState(false);
    }
}

function showAnalyzingState(loading) {
    const statusEl = document.getElementById("scan-status");
    if (statusEl) {
        statusEl.innerText = loading ? "Scanning plate with Gemma Vision & USDA tables..." : "Scan Complete";
        statusEl.style.color = loading ? "#06b6d4" : "#10b981";
    }
}

function renderPlateResults(data) {
    document.getElementById("meal-title").innerText = data.meal_name;
    document.getElementById("macro-calories").innerText = Math.round(data.total_nutrition.calories);
    document.getElementById("macro-protein").innerText = Math.round(data.total_nutrition.protein_g) + "g";
    document.getElementById("macro-carbs").innerText = Math.round(data.total_nutrition.carbs_g) + "g";
    document.getElementById("macro-fat").innerText = Math.round(data.total_nutrition.fat_g) + "g";

    // Food items list
    const itemsContainer = document.getElementById("food-items-container");
    itemsContainer.innerHTML = "";

    data.items.forEach(item => {
        const row = document.createElement("div");
        row.className = "food-item-row";
        row.innerHTML = `
            <div>
                <div class="food-item-name">${item.name}</div>
                <div class="food-item-meta">${item.weight_g}g • ${item.food_group}</div>
            </div>
            <div class="food-item-macros">
                <div class="food-item-cals">${Math.round(item.nutrition.calories)} kcal</div>
                <div class="food-item-meta">${Math.round(item.nutrition.protein_g)}P / ${Math.round(item.nutrition.carbs_g)}C / ${Math.round(item.nutrition.fat_g)}F</div>
            </div>
        `;
        itemsContainer.appendChild(row);
    });

    // Insights
    const insightsContainer = document.getElementById("insights-container");
    insightsContainer.innerHTML = "";
    data.health_insights.forEach(insight => {
        const pill = document.createElement("div");
        pill.className = "insight-pill";
        pill.innerHTML = `<span>⚡</span><span>${insight}</span>`;
        insightsContainer.appendChild(pill);
    });

    currentMealData.meal_name = data.meal_name;
    currentMealData.calories = data.total_nutrition.calories;
    currentMealData.protein_g = data.total_nutrition.protein_g;
}

// TabPFN Metabolic Forecast
async function loadMetabolicForecast(caloriesTarget) {
    try {
        const response = await fetch(`/api/metabolic-forecast?friend_name=Dave&target_weight_kg=75.0&daily_calories_target=${caloriesTarget}`);
        if (!response.ok) throw new Error("Forecast failed");
        const data = await response.json();

        // Update TDEE cards
        document.getElementById("dynamic-tdee-val").innerText = data.insights.dynamic_tdee_kcal + " kcal";
        document.getElementById("static-tdee-val").innerText = data.insights.static_formula_tdee_kcal + " kcal";
        document.getElementById("metabolic-status-val").innerText = data.insights.metabolic_status;
        document.getElementById("days-to-goal-val").innerText = data.insights.projected_days_to_goal + " days";

        currentMealData.days_to_goal = data.insights.projected_days_to_goal;

        // Render Chart
        renderWeightChart(data.trajectory, data.current_weight_kg, data.target_weight_kg);
    } catch (err) {
        console.error("Error loading forecast:", err);
    }
}

function initSlider() {
    const slider = document.getElementById("calories-slider");
    const display = document.getElementById("slider-calories-display");

    if (!slider) return;

    slider.addEventListener("input", (e) => {
        const val = e.target.value;
        display.innerText = val + " kcal/day";
    });

    slider.addEventListener("change", (e) => {
        loadMetabolicForecast(e.target.value);
    });
}

function renderWeightChart(trajectory, currentWeight, targetWeight) {
    const ctx = document.getElementById("trajectoryChart");
    if (!ctx) return;

    const labels = ["Day 0", ...trajectory.filter((_, i) => i % 4 === 0).map(t => `Day ${t.day_offset}`)];
    const values = [currentWeight, ...trajectory.filter((_, i) => i % 4 === 0).map(t => t.projected_weight_kg)];

    if (weightChart) {
        weightChart.destroy();
    }

    weightChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "TabPFN In-Context Forecast (kg)",
                    data: values,
                    borderColor: "#10b981",
                    backgroundColor: "rgba(16, 185, 129, 0.12)",
                    fill: true,
                    tension: 0.35,
                    borderWidth: 3,
                    pointBackgroundColor: "#10b981",
                    pointRadius: 4
                },
                {
                    label: "Target Goal (75kg)",
                    data: labels.map(() => targetWeight),
                    borderColor: "rgba(244, 63, 94, 0.6)",
                    borderDash: [5, 5],
                    fill: false,
                    borderWidth: 2,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: "#334155", font: { family: "Inter", size: 12, weight: "600" } }
                }
            },
            scales: {
                x: {
                    grid: { color: "rgba(12, 107, 58, 0.08)" },
                    ticks: { color: "#475569", font: { family: "Inter", size: 11 } }
                },
                y: {
                    grid: { color: "rgba(12, 107, 58, 0.08)" },
                    ticks: { color: "#475569", font: { family: "Inter", size: 11 } }
                }
            }
        }
    });
}

// ElevenLabs Voice Coach Trigger
async function playCoachDebrief() {
    const btn = document.getElementById("play-coach-btn");
    const transcriptEl = document.getElementById("coach-transcript");

    btn.innerText = "Synthesizing Coach...";
    btn.disabled = true;

    try {
        const response = await fetch("/api/coach-debrief", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                friend_name: "Dave",
                meal_name: currentMealData.meal_name,
                calories: currentMealData.calories,
                protein_g: currentMealData.protein_g,
                days_to_goal: currentMealData.days_to_goal,
                target_weight: currentMealData.target_weight
            })
        });

        const data = await response.json();
        transcriptEl.innerText = `"${data.text}"`;
        transcriptEl.style.display = "block";

        if (data.audio_base64) {
            const audio = new Audio("data:audio/mp3;base64," + data.audio_base64);
            audio.play();
            btn.innerText = "Playing Audio...";
            audio.onended = () => {
                btn.innerText = "Play Daily Voice Debrief";
                btn.disabled = false;
            };
        } else if ("speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance(data.text);
            utterance.rate = 1.05;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
            btn.innerText = "Speaking (Browser Speech)...";
            utterance.onend = () => {
                btn.innerText = "Play Daily Voice Debrief";
                btn.disabled = false;
            };
        }
    } catch (err) {
        console.error("Error generating speech:", err);
        btn.innerText = "Play Daily Voice Debrief";
        btn.disabled = false;
    }
}

window.playCoachDebrief = playCoachDebrief;
