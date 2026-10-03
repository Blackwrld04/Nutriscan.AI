/**
 * NutriScan AI - Frontend Application Logic
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
        let presetResult;
        if (type === "salmon") {
            presetResult = {
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
            presetResult = {
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
            presetResult = {
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
        renderPlateResults(presetResult);
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
        console.error("API error during plate analysis:", err);
        const statusEl = document.getElementById("scan-status");
        if (statusEl) statusEl.innerText = "Error analyzing plate. Please retry.";
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
        pill.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top:2px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><span>${insight}</span>`;
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

    // Sample Day 0 and every 4 days up to Day 28 (8 intervals)
    const sampledDays = [4, 8, 12, 16, 20, 24, 28];
    const labels = ["Day 0"];
    const values = [Number(currentWeight)];

    sampledDays.forEach(day => {
        const item = trajectory.find(t => t.day_offset === day);
        if (item) {
            labels.push(`Day ${day}`);
            values.push(Number(item.projected_weight_kg));
        } else {
            const fallbackIdx = day - 1;
            if (trajectory[fallbackIdx]) {
                labels.push(`Day ${day}`);
                values.push(Number(trajectory[fallbackIdx].projected_weight_kg));
            }
        }
    });

    const allWeights = [...values, Number(targetWeight)];
    const minWeight = Math.min(...allWeights);
    const maxWeight = Math.max(...allWeights);
    const yMin = Math.max(0, Math.floor(minWeight - 1.5));
    const yMax = Math.ceil(maxWeight + 1.0);

    if (weightChart) {
        weightChart.destroy();
    }

    weightChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    type: "bar",
                    label: "Projected Weight (kg)",
                    data: values,
                    backgroundColor: values.map((val, idx) => {
                        return idx === 0 ? "rgba(100, 116, 139, 0.85)" : "rgba(16, 185, 129, 0.85)";
                    }),
                    hoverBackgroundColor: values.map((val, idx) => {
                        return idx === 0 ? "#475569" : "#059669";
                    }),
                    borderRadius: 8,
                    borderSkipped: false,
                    maxBarThickness: 34,
                    order: 2
                },
                {
                    type: "line",
                    label: `Target Goal (${targetWeight} kg)`,
                    data: labels.map(() => Number(targetWeight)),
                    borderColor: "rgba(244, 63, 94, 0.85)",
                    backgroundColor: "transparent",
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 3,
                    pointBackgroundColor: "#f43f5e",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 1.5,
                    fill: false,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                legend: {
                    position: "top",
                    labels: {
                        color: "#334155",
                        font: { family: "Inter", size: 11, weight: "600" },
                        boxWidth: 14,
                        padding: 12
                    }
                },
                tooltip: {
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    titleFont: { family: "Inter", size: 12, weight: "bold" },
                    bodyFont: { family: "Inter", size: 11 },
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return ` ${context.dataset.label}: ${Number(context.parsed.y).toFixed(1)} kg`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: "#64748b",
                        font: { family: "Inter", size: 11, weight: "600" }
                    }
                },
                y: {
                    min: yMin,
                    max: yMax,
                    grid: { color: "rgba(148, 163, 184, 0.12)" },
                    ticks: {
                        color: "#64748b",
                        font: { family: "Inter", size: 11 },
                        callback: function(val) {
                            return val + " kg";
                        }
                    }
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
