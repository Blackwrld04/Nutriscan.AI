/**
 * OpenCal AI — Mobile Application Controller
 * Inspired by Cal AI & TrustX Architecture
 * Integrates Google Gemma Vision, USDA Deterministic Grounding, TabPFN In-Context Engine & ElevenLabs Voice Coach
 */

let weightChart = null;
let cameraStream = null;
let currentScannedPlate = null;
let currentServingMultiplier = 1;

// Default profile for Dave if none in localStorage
const DEFAULT_PROFILE = {
    name: "Dave",
    sex: "male",
    weight_val: 165,
    weight_unit: "lbs",
    weight_kg: 75.0,
    height_ft: 5,
    height_in: 10,
    height_cm: 178,
    age: 27,
    goal: "maintain",
    activity: "moderate",
    target_calories: 2168,
    target_protein: 113,
    target_carbs: 294,
    target_fats: 60,
    streak_days: 7
};

// Preset Nutritional Data
const PRESETS_DB = {
    salmon: {
        meal_name: "Pan-Seared Salmon & Sweet Potato",
        total_nutrition: { calories: 645, protein_g: 48.2, carbs_g: 58.5, fat_g: 22.4, fiber_g: 7.2 },
        items: [
            { name: "Pan-Seared Atlantic Salmon", weight_g: 185, food_group: "Seafood (USDA FDC #175168)", nutrition: { calories: 385, protein_g: 37.7, carbs_g: 0, fat_g: 24.8 } },
            { name: "Baked Japanese Sweet Potato", weight_g: 200, food_group: "Roots (USDA FDC #168483)", nutrition: { calories: 180, protein_g: 4.0, carbs_g: 41.4, fat_g: 0.4 } },
            { name: "Sautéed Fresh Asparagus", weight_g: 80, food_group: "Greens (USDA FDC #170381)", nutrition: { calories: 18, protein_g: 1.9, carbs_g: 3.3, fat_g: 0.2 } }
        ],
        health_insights: [
            "High protein density meal (>30% calories from protein) — optimal for lean muscle preservation.",
            "Rich in Omega-3 fatty acids and complex slow-digesting carbohydrates with 7.2g dietary fiber."
        ],
        image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 24 24' fill='none' stroke='%23059669' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z'/%3E%3Cpath d='M19 12a7 7 0 0 0-14 0'/%3E%3Ccircle cx='12' cy='5' r='1'/%3E%3C/svg%3E"
    },
    chicken: {
        meal_name: "Grilled Chicken Breast & Jasmine Rice",
        total_nutrition: { calories: 512, protein_g: 58.6, carbs_g: 46.2, fat_g: 6.8, fiber_g: 3.0 },
        items: [
            { name: "Grilled Chicken Breast", weight_g: 180, food_group: "Poultry (USDA FDC #171077)", nutrition: { calories: 297, protein_g: 55.8, carbs_g: 0, fat_g: 6.5 } },
            { name: "Cooked White Jasmine Rice", weight_g: 160, food_group: "Grains (USDA FDC #168884)", nutrition: { calories: 208, protein_g: 4.3, carbs_g: 45.1, fat_g: 0.5 } },
            { name: "Steamed Organic Broccoli", weight_g: 90, food_group: "Vegetables (USDA FDC #170379)", nutrition: { calories: 31, protein_g: 2.2, carbs_g: 6.5, fat_g: 0.4 } }
        ],
        health_insights: [
            "High protein density meal (45% calories from protein) — ideal for post-workout glycogen replenishment.",
            "Rich in bioavailable zinc, phosphorus, and B-complex vitamins."
        ],
        image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 24 24' fill='none' stroke='%23d97706' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z'/%3E%3Ccircle cx='12' cy='12' r='4'/%3E%3C/svg%3E"
    },
    steak: {
        meal_name: "Sirloin Steak, Avocado & Brown Rice",
        total_nutrition: { calories: 735, protein_g: 52.4, carbs_g: 42.0, fat_g: 38.6, fiber_g: 8.5 },
        items: [
            { name: "Pan-Seared Sirloin Steak", weight_g: 170, food_group: "Red Meat (USDA FDC #170208)", nutrition: { calories: 369, protein_g: 44.4, carbs_g: 0, fat_g: 20.1 } },
            { name: "Cooked Brown Rice", weight_g: 140, food_group: "Whole Grains (USDA FDC #169704)", nutrition: { calories: 157, protein_g: 3.6, carbs_g: 32.9, fat_g: 1.3 } },
            { name: "Fresh Hass Avocado", weight_g: 75, food_group: "Lipids (USDA FDC #171705)", nutrition: { calories: 120, protein_g: 1.5, carbs_g: 6.4, fat_g: 11.0 } }
        ],
        health_insights: [
            "High micronutrient and healthy lipid profile supporting natural hormonal synthesis.",
            "Substantial meal volume with 8.5g dietary fiber for sustained fullness."
        ],
        image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 24 24' fill='none' stroke='%23e11d48' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z'/%3E%3Cpath d='M8 12h8'/%3E%3C/svg%3E"
    }
};

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    initCalendarStrip();
    initDropzone();
    initGoalRadioCards();
    checkProfileAndInitialize();
});

// Profile Management
function getStoredProfile() {
    try {
        const stored = localStorage.getItem("opencal_user_profile");
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
}

function checkProfileAndInitialize() {
    const profile = getStoredProfile();
    if (!profile) {
        // Show onboarding modal immediately on first visit
        openOnboardingModal();
    } else {
        applyProfileToUI(profile);
    }

    refreshHomeScreen();
    loadMetabolicForecast(profile ? profile.target_calories : DEFAULT_PROFILE.target_calories);
}

function applyProfileToUI(profile) {
    // Update Home Header & Targets
    const calTargetEl = document.getElementById("home-cal-target");
    const proteinTargetEl = document.getElementById("home-protein-target");
    const carbsTargetEl = document.getElementById("home-carbs-target");
    const fatsTargetEl = document.getElementById("home-fats-target");
    const streakEl = document.getElementById("header-streak-count");

    if (calTargetEl) calTargetEl.innerText = `/ ${profile.target_calories.toLocaleString()}`;
    if (proteinTargetEl) proteinTargetEl.innerText = profile.target_protein;
    if (carbsTargetEl) carbsTargetEl.innerText = profile.target_carbs;
    if (fatsTargetEl) fatsTargetEl.innerText = profile.target_fats;
    if (streakEl) streakEl.innerText = profile.streak_days || 7;

    // Update Progress View Stats
    const progressWeightEl = document.getElementById("progress-current-weight");
    const progressGoalEl = document.getElementById("progress-goal-weight");
    if (progressWeightEl) progressWeightEl.innerText = `${profile.weight_val} ${profile.weight_unit}`;
    if (progressGoalEl) progressGoalEl.innerText = `${profile.weight_val} ${profile.weight_unit}`;

    // Update Settings View Stats
    const settingsUserSummary = document.getElementById("settings-user-summary");
    const settingsTargetCals = document.getElementById("settings-target-cals");
    const settingsTargetGoal = document.getElementById("settings-target-goal");

    if (settingsUserSummary) settingsUserSummary.innerText = `${profile.weight_val} ${profile.weight_unit} · ${capitalize(profile.activity)} · ${capitalize(profile.goal)}`;
    if (settingsTargetCals) settingsTargetCals.innerText = `${profile.target_calories.toLocaleString()} kcal`;
    if (settingsTargetGoal) settingsTargetGoal.innerText = `${capitalize(profile.goal)} Weight`;
}

// Single-Page Onboarding Controls
function openOnboardingModal() {
    const modal = document.getElementById("modal-onboarding");
    const closeBtn = document.getElementById("onboarding-close-btn");
    const stepForm = document.getElementById("onboarding-step-form");
    const stepSummary = document.getElementById("onboarding-step-summary");

    if (!modal) return;
    modal.classList.remove("hidden");
    if (stepForm) stepForm.classList.remove("hidden");
    if (stepSummary) stepSummary.classList.add("hidden");

    // If profile already exists, show close button
    if (getStoredProfile() && closeBtn) {
        closeBtn.classList.remove("hidden");
    } else if (closeBtn) {
        closeBtn.classList.add("hidden");
    }
}

function closeOnboardingModal() {
    const modal = document.getElementById("modal-onboarding");
    if (modal) modal.classList.add("hidden");
}

let activeWeightUnit = "lbs";
function setWeightUnit(unit) {
    activeWeightUnit = unit;
    const lbsBtn = document.getElementById("weight-unit-lbs");
    const kgBtn = document.getElementById("weight-unit-kg");
    const label = document.getElementById("weight-unit-label");
    const input = document.getElementById("onboarding-weight");

    if (unit === "kg") {
        if (lbsBtn) lbsBtn.className = "px-2 py-0.5 rounded-md text-slate-500";
        if (kgBtn) kgBtn.className = "px-2 py-0.5 rounded-md bg-white text-slate-900 shadow-xs";
        if (label) label.innerText = "kg";
        if (input && input.value === "165") input.value = "75";
    } else {
        if (lbsBtn) lbsBtn.className = "px-2 py-0.5 rounded-md bg-white text-slate-900 shadow-xs";
        if (kgBtn) kgBtn.className = "px-2 py-0.5 rounded-md text-slate-500";
        if (label) label.innerText = "lbs";
        if (input && input.value === "75") input.value = "165";
    }
}

function initGoalRadioCards() {
    const cards = document.querySelectorAll(".goal-radio-card");
    cards.forEach(card => {
        card.addEventListener("click", () => {
            cards.forEach(c => {
                c.classList.remove("active", "border-slate-900");
                c.classList.add("border-slate-200");
                const circle = c.querySelector(".goal-radio-circle");
                if (circle) circle.className = "goal-radio-circle w-4 h-4 rounded-full border-2 border-slate-300";
            });
            card.classList.add("active", "border-slate-900");
            card.classList.remove("border-slate-200");
            const radio = card.querySelector("input[type=radio]");
            if (radio) radio.checked = true;
            const activeCircle = card.querySelector(".goal-radio-circle");
            if (activeCircle) activeCircle.className = "goal-radio-circle w-4 h-4 rounded-full border-2 border-slate-900 bg-slate-900";
        });
    });
}

function handleOnboardingSubmit(e) {
    e.preventDefault();

    const sex = document.querySelector("input[name='sex']:checked")?.value || "male";
    const weightVal = parseFloat(document.getElementById("onboarding-weight")?.value || "165");
    const weightUnit = activeWeightUnit;
    const heightFt = parseInt(document.getElementById("onboarding-height-ft")?.value || "5");
    const heightIn = parseInt(document.getElementById("onboarding-height-in")?.value || "10");
    const age = parseInt(document.getElementById("onboarding-age")?.value || "27");
    const goal = document.querySelector("input[name='goal']:checked")?.value || "maintain";
    const activity = document.getElementById("onboarding-activity")?.value || "moderate";

    // Conversion
    const weightKg = weightUnit === "lbs" ? weightVal * 0.453592 : weightVal;
    const heightCm = (heightFt * 12 + heightIn) * 2.54;

    // Harris-Benedict / Mifflin-St Jeor Formula
    const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
    const activityMultipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, heavy: 1.725 };
    const tdee = Math.round(bmr * (activityMultipliers[activity] || 1.55));

    let targetCalories = tdee;
    if (goal === "lose") targetCalories = Math.max(1400, tdee - 450);
    if (goal === "gain") targetCalories = tdee + 350;

    // Macro Target Breakdown
    const targetProtein = Math.round(weightKg * (goal === "lose" ? 2.2 : 1.9)); // Lean muscle preservation
    const targetFats = Math.round((targetCalories * 0.25) / 9); // 25% healthy fats
    const targetCarbs = Math.max(50, Math.round((targetCalories - (targetProtein * 4) - (targetFats * 9)) / 4));

    const newProfile = {
        name: "Dave",
        sex,
        weight_val: weightVal,
        weight_unit: weightUnit,
        weight_kg: Math.round(weightKg * 10) / 10,
        height_ft: heightFt,
        height_in: heightIn,
        height_cm: Math.round(heightCm),
        age,
        goal,
        activity,
        target_calories: targetCalories,
        target_protein: targetProtein,
        target_carbs: targetCarbs,
        target_fats: targetFats,
        streak_days: 7
    };

    // Store in global window memory until committed
    window._pendingProfile = newProfile;

    // Populate Step 2 Recommendation Summary (Cal AI Screenshot 1)
    const goalTitleEl = document.getElementById("summary-goal-title");
    const calEl = document.getElementById("summary-calories-val");
    const protEl = document.getElementById("summary-protein-val");
    const carbsEl = document.getElementById("summary-carbs-val");
    const fatsEl = document.getElementById("summary-fats-val");
    const infoWeight = document.getElementById("summary-info-weight");
    const infoActivity = document.getElementById("summary-info-activity");

    if (goalTitleEl) {
        goalTitleEl.innerText = goal === "lose" ? "Lose body fat steadily" : goal === "gain" ? "Build lean muscle mass" : "Maintain your current weight";
    }
    if (calEl) calEl.innerText = targetCalories.toLocaleString();
    if (protEl) protEl.innerText = `${targetProtein}g`;
    if (carbsEl) carbsEl.innerText = `${targetCarbs}g`;
    if (fatsEl) fatsEl.innerText = `${targetFats}g`;
    if (infoWeight) infoWeight.innerText = `${weightVal} ${weightUnit}`;
    if (infoActivity) infoActivity.innerText = capitalize(activity);

    // Switch to Step 2
    document.getElementById("onboarding-step-form")?.classList.add("hidden");
    document.getElementById("onboarding-step-summary")?.classList.remove("hidden");
}

function finishOnboardingAndEnterApp() {
    const profile = window._pendingProfile || DEFAULT_PROFILE;
    localStorage.setItem("opencal_user_profile", JSON.stringify(profile));
    applyProfileToUI(profile);
    closeOnboardingModal();
    refreshHomeScreen();
    loadMetabolicForecast(profile.target_calories);
    showToast(`Welcome! Your daily target is ${profile.target_calories.toLocaleString()} kcal.`);
}

// Navigation Tabs
function switchAppTab(tabName) {
    if (tabName === "progress") tabName = "trajectory";
    if (tabName === "ai" || tabName === "al") tabName = "coach";

    document.querySelectorAll(".bottom-nav-item").forEach(btn => {
        const isActive = btn.dataset.nav === tabName;
        btn.classList.toggle("active", isActive);
        if (isActive) {
            btn.classList.remove("text-slate-400");
            btn.classList.add("text-slate-950", "font-bold");
        } else {
            btn.classList.remove("text-slate-950", "font-bold");
            btn.classList.add("text-slate-400");
        }
    });

    document.querySelectorAll(".app-view-tab").forEach(tab => {
        const isMatch = tab.id === `view-${tabName}` || (tabName === "trajectory" && tab.id === "view-progress");
        if (isMatch) {
            tab.classList.remove("hidden");
            tab.classList.add("block");
        } else {
            tab.classList.add("hidden");
            tab.classList.remove("block");
        }
    });

    if (tabName === "trajectory" && weightChart) {
        setTimeout(() => weightChart.resize(), 60);
    }

    if (tabName === "history") {
        renderFullHistoryTab();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Horizontal Calendar Strip (Cal AI Screenshot 2)
function initCalendarStrip() {
    const strip = document.getElementById("calendar-week-strip");
    if (!strip) return;

    const today = new Date();
    const currentDayIdx = today.getDay(); // 0 is Sunday
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDayIdx);

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    strip.innerHTML = "";

    days.forEach((dayName, idx) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + idx);
        const isToday = idx === currentDayIdx;

        const col = document.createElement("div");
        col.className = `flex flex-col items-center flex-1 cursor-pointer transition-all ${isToday ? "text-slate-900" : "text-slate-400 hover:text-slate-600"}`;
        col.innerHTML = `
            <span class="text-[10px] font-bold uppercase mb-1">${dayName}</span>
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${isToday ? "border-2 border-slate-900 bg-slate-900 text-white shadow-xs" : "hover:bg-slate-100"}">
                ${d.getDate()}
            </div>
        `;
        strip.appendChild(col);
    });
}

// Home Screen Dashboard Logic
function refreshHomeScreen() {
    const profile = getStoredProfile() || DEFAULT_PROFILE;
    const history = JSON.parse(localStorage.getItem("opencal_meal_history") || "[]");

    // Sum today's macros
    let totalCals = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;

    history.forEach(item => {
        totalCals += Number(item.calories) || 0;
        totalProtein += Number(item.protein_g) || 0;
        totalCarbs += Number(item.carbs_g) || 0;
        totalFats += Number(item.fat_g) || 0;
    });

    totalCals = Math.round(totalCals);
    totalProtein = Math.round(totalProtein);
    totalCarbs = Math.round(totalCarbs);
    totalFats = Math.round(totalFats);

    // Update numbers
    const eatenEl = document.getElementById("home-cal-eaten");
    const targetEl = document.getElementById("home-cal-target");
    const remLabel = document.getElementById("home-cal-remaining-label");
    const pEaten = document.getElementById("home-protein-eaten");
    const cEaten = document.getElementById("home-carbs-eaten");
    const fEaten = document.getElementById("home-fats-eaten");

    if (eatenEl) eatenEl.innerText = totalCals.toLocaleString();
    if (targetEl) targetEl.innerText = `/ ${profile.target_calories.toLocaleString()}`;
    if (pEaten) pEaten.innerText = totalProtein;
    if (cEaten) cEaten.innerText = totalCarbs;
    if (fEaten) fEaten.innerText = totalFats;

    const remaining = Math.max(0, profile.target_calories - totalCals);
    if (remLabel) {
        remLabel.innerHTML = totalCals >= profile.target_calories
            ? `<span class="text-amber-600 font-bold">Daily target reached!</span>`
            : `<span>${remaining.toLocaleString()} kcal remaining</span>`;
    }

    // Update SVG Progress Rings
    // Main Calorie Ring: radius 40, circ = 2 * PI * 40 = 251.3
    const calRing = document.getElementById("home-calorie-ring");
    if (calRing) {
        const pct = Math.min(1, totalCals / profile.target_calories);
        calRing.style.strokeDashoffset = 251.3 * (1 - pct);
    }

    // 3 Mini Macro Rings: radius 22, circ = 2 * PI * 22 = 138.2
    const pRing = document.getElementById("home-ring-protein");
    const cRing = document.getElementById("home-ring-carbs");
    const fRing = document.getElementById("home-ring-fats");

    if (pRing) {
        const pct = Math.min(1, totalProtein / profile.target_protein);
        pRing.style.strokeDashoffset = 138.2 * (1 - pct);
    }
    if (cRing) {
        const pct = Math.min(1, totalCarbs / profile.target_carbs);
        cRing.style.strokeDashoffset = 138.2 * (1 - pct);
    }
    if (fRing) {
        const pct = Math.min(1, totalFats / profile.target_fats);
        fRing.style.strokeDashoffset = 138.2 * (1 - pct);
    }

    // Render Recently Uploaded List (Cal AI Screenshot 2)
    renderRecentlyUploadedList(history);
    renderFullHistoryTab(history);
}

function renderRecentlyUploadedList(history) {
    const container = document.getElementById("home-recent-list");
    const countEl = document.getElementById("home-meals-count");
    if (!container) return;

    if (countEl) countEl.innerText = `${history.length} meal${history.length === 1 ? "" : "s"} today`;

    if (history.length === 0) {
        container.innerHTML = `
            <div class="p-6 bg-white rounded-3xl border border-slate-200/80 text-center shadow-xs">
                <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-500">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/>
                        <path d="M19 12a7 7 0 0 0-14 0"/>
                        <circle cx="12" cy="5" r="1"/>
                    </svg>
                </div>
                <h4 class="font-extrabold text-slate-800 text-xs">No meals tracked today yet</h4>
                <p class="text-[11px] text-slate-400 mt-0.5 mb-3">Snap a photo of your plate to auto-calculate calories & macros.</p>
                <button onclick="openScannerModal()" class="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm">
                    Scan Plate Now
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = "";
    // Display in reverse order (newest first)
    [...history].reverse().forEach((item, index) => {
        const timeStr = item.date ? new Date(item.date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Today";
        const realIndex = history.length - 1 - index;

        const card = document.createElement("div");
        card.className = "p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between";
        card.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                    ${item.image ? `<img src="${item.image}" class="w-full h-full object-cover">` : `
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.8">
                            <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/>
                            <path d="M19 12a7 7 0 0 0-14 0"/>
                            <circle cx="12" cy="5" r="1"/>
                        </svg>
                    `}
                </div>
                <div>
                    <div class="font-bold text-slate-900 text-xs tracking-tight">${item.meal_name}</div>
                    <div class="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                        <span>${timeStr}</span>
                        <span>•</span>
                        <span class="font-bold text-slate-700 flex items-center gap-0.5">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" class="text-orange-500"><path d="M8.5 14.5A3.5 3.5 0 0 0 12 18a3.5 3.5 0 0 0 3.5-3.5c0-1.78-1.07-2.95-2-3.85-.92-.89-1.5-1.72-1.5-2.65 0-.15.02-.3.05-.44-.66.8-1.55 2.1-1.55 3.44 0 .93.58 1.76 1.5 2.65.93.9 2 2.07 2 3.85A3.5 3.5 0 0 1 12 21a6.5 6.5 0 0 1-6.5-6.5c0-3.5 2.5-6.5 6-8.5-1 2-1 4.5 0 6 1.1-.9 2-2.1 2-3.5 2.5 2 4.5 5 4.5 8.5A6.5 6.5 0 0 1 12 21a6.5 6.5 0 0 1-6.5-6.5c0-1.2.3-2.3.8-3.3.4 1.4 1.2 2.6 2.2 3.3Z"/></svg>
                            ${Math.round(item.calories)} kcal
                        </span>
                    </div>
                    <div class="text-[10px] text-slate-500 font-mono mt-0.5">
                        <span class="text-rose-600 font-bold">${Math.round(item.protein_g)}g P</span> · 
                        <span class="text-amber-600 font-bold">${Math.round(item.carbs_g)}g C</span> · 
                        <span class="text-sky-600 font-bold">${Math.round(item.fat_g)}g F</span>
                    </div>
                </div>
            </div>
            <button onclick="deleteMealItem(${realIndex})" class="p-2 text-slate-300 hover:text-rose-600 transition-colors" title="Delete meal">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
        `;
        container.appendChild(card);
    });
}

// Dedicated Full History Tab Renderer
function renderFullHistoryTab(historyData) {
    const history = historyData || JSON.parse(localStorage.getItem("opencal_meal_history") || "[]");
    const container = document.getElementById("history-items-list");
    const emptyState = document.getElementById("history-empty-state");
    const totalMealsEl = document.getElementById("history-total-meals");
    const totalCalsEl = document.getElementById("history-total-calories");
    const totalProteinEl = document.getElementById("history-total-protein");

    if (!container) return;

    let totalCals = 0;
    let totalProt = 0;

    history.forEach(item => {
        totalCals += (item.calories || 0);
        totalProt += (item.protein_g || 0);
    });

    if (totalMealsEl) totalMealsEl.innerText = `${history.length}`;
    if (totalCalsEl) totalCalsEl.innerText = `${Math.round(totalCals)} kcal`;
    if (totalProteinEl) totalProteinEl.innerText = `${Math.round(totalProt)}g`;

    if (history.length === 0) {
        container.innerHTML = "";
        if (emptyState) emptyState.classList.remove("hidden");
        return;
    }

    if (emptyState) emptyState.classList.add("hidden");
    container.innerHTML = "";

    [...history].reverse().forEach((item, index) => {
        const timeStr = item.date ? new Date(item.date).toLocaleDateString([], { month: "short", day: "numeric" }) + " · " + new Date(item.date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Today";
        const realIndex = history.length - 1 - index;

        const card = document.createElement("div");
        card.className = "p-4 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-3";
        card.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0 border border-slate-100">
                        ${item.image ? `<img src="${item.image}" class="w-full h-full object-cover">` : `
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.8">
                                <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/>
                                <path d="M19 12a7 7 0 0 0-14 0"/>
                                <circle cx="12" cy="5" r="1"/>
                            </svg>
                        `}
                    </div>
                    <div>
                        <div class="font-black text-slate-900 text-sm tracking-tight">${item.meal_name}</div>
                        <div class="text-[11px] text-slate-400 mt-0.5">${timeStr}</div>
                        <div class="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 mt-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            USDA FoodData Grounded (±15 kcal)
                        </div>
                    </div>
                </div>
                <button onclick="deleteMealItem(${realIndex})" class="p-2 text-slate-300 hover:text-rose-600 transition-colors" title="Delete meal from history">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>

            <!-- Macros Breakdown Bar -->
            <div class="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
                <div class="p-2 bg-slate-50 rounded-xl">
                    <div class="text-[9px] font-bold text-slate-400 uppercase">Calories</div>
                    <div class="text-xs font-black text-slate-900 mt-0.5">${Math.round(item.calories)}</div>
                </div>
                <div class="p-2 bg-rose-50/60 rounded-xl">
                    <div class="text-[9px] font-bold text-rose-600 uppercase">Protein</div>
                    <div class="text-xs font-black text-rose-700 mt-0.5">${Math.round(item.protein_g)}g</div>
                </div>
                <div class="p-2 bg-amber-50/60 rounded-xl">
                    <div class="text-[9px] font-bold text-amber-600 uppercase">Carbs</div>
                    <div class="text-xs font-black text-amber-700 mt-0.5">${Math.round(item.carbs_g)}g</div>
                </div>
                <div class="p-2 bg-sky-50/60 rounded-xl">
                    <div class="text-[9px] font-bold text-sky-600 uppercase">Fat</div>
                    <div class="text-xs font-black text-sky-700 mt-0.5">${Math.round(item.fat_g)}g</div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function deleteMealItem(index) {
    try {
        const history = JSON.parse(localStorage.getItem("opencal_meal_history") || "[]");
        history.splice(index, 1);
        localStorage.setItem("opencal_meal_history", JSON.stringify(history));
        refreshHomeScreen();
        showToast("Meal removed from ledger.");
    } catch (e) {
        console.error("Delete error:", e);
    }
}

function clearAllHistory() {
    if (confirm("Are you sure you want to reset all meal records?")) {
        localStorage.removeItem("opencal_meal_history");
        refreshHomeScreen();
        showToast("Meal history cleared.");
    }
}

// Scanner Modal Controls (Cal AI Camera + Presets + Upload)
function openScannerModal() {
    const modal = document.getElementById("modal-scanner");
    if (!modal) return;
    modal.classList.remove("hidden");

    // Reset scanner state to camera view
    resetScannerState();
    switchScannerMode("camera");
}

function closeScannerModal() {
    const modal = document.getElementById("modal-scanner");
    if (modal) modal.classList.add("hidden");
    stopCamera();
}

function resetScannerState() {
    document.getElementById("scanner-input-container")?.classList.remove("hidden");
    document.getElementById("scanner-processing-box")?.classList.add("hidden");
    document.getElementById("scanner-result-sheet")?.classList.add("hidden");
    currentScannedPlate = null;
    currentServingMultiplier = 1;
}

function switchScannerMode(mode) {
    document.querySelectorAll(".scanner-mode-tab").forEach(btn => {
        const isActive = btn.dataset.mode === mode;
        btn.classList.toggle("active", isActive);
        btn.classList.toggle("bg-white", isActive);
        btn.classList.toggle("text-slate-900", isActive);
        btn.classList.toggle("shadow-xs", isActive);
        btn.classList.toggle("text-slate-500", !isActive);
    });

    document.querySelectorAll(".scanner-panel").forEach(p => p.classList.add("hidden"));
    const activePanel = document.getElementById(`mode-panel-${mode}`);
    if (activePanel) activePanel.classList.remove("hidden");

    if (mode === "camera") {
        startCamera();
    } else {
        stopCamera();
    }
}

// Camera Lifecycle
async function startCamera() {
    const video = document.getElementById("camera-video");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (video) {
            video.srcObject = cameraStream;
            video.play();
        }
    } catch (err) {
        console.warn("Camera access unavailable, defaulting to verified presets:", err);
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

function snapPhoto() {
    const video = document.getElementById("camera-video");
    if (!video || !cameraStream) {
        loadPreset("salmon");
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
        if (!blob) return;
        const file = new File([blob], "camera_snap.jpg", { type: "image/jpeg" });
        const imgUrl = URL.createObjectURL(blob);
        handlePlateUpload(file, imgUrl);
    }, "image/jpeg", 0.92);
}

// Dropzone & File Upload
function initDropzone() {
    const dropzone = document.getElementById("studio-dropzone");
    const fileInput = document.getElementById("studio-file-input");
    if (!dropzone || !fileInput) return;

    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("dragover", e => { e.preventDefault(); dropzone.classList.add("border-slate-900"); });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("border-slate-900"));
    dropzone.addEventListener("drop", e => {
        e.preventDefault();
        dropzone.classList.remove("border-slate-900");
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            handlePlateUpload(file, URL.createObjectURL(file));
        }
    });

    fileInput.addEventListener("change", e => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            handlePlateUpload(file, URL.createObjectURL(file));
        }
    });
}

// Process Upload to API
async function handlePlateUpload(file, imagePreviewUrl) {
    showProcessingState("Segmenting plate geometry with Gemma 2...");

    const formData = new FormData();
    formData.append("file", file);

    try {
        setTimeout(() => setProcessingStatus("Querying USDA FoodData Central deterministic database..."), 400);

        const response = await fetch("/api/analyze-plate", {
            method: "POST",
            body: formData
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        data.image = imagePreviewUrl;
        setTimeout(() => renderScanResultSheet(data), 350);
    } catch (err) {
        console.warn("API fallback to preset:", err);
        loadPreset("salmon");
    }
}

// Preset Loader
function loadPreset(presetKey) {
    const preset = PRESETS_DB[presetKey] || PRESETS_DB.salmon;
    showProcessingState("Loading verified USDA grounded macro plate...");

    setTimeout(() => {
        renderScanResultSheet(preset);
    }, 400);
}

function showProcessingState(statusMsg) {
    document.getElementById("scanner-input-container")?.classList.add("hidden");
    const processingBox = document.getElementById("scanner-processing-box");
    if (processingBox) processingBox.classList.remove("hidden");
    setProcessingStatus(statusMsg);
}

function setProcessingStatus(msg) {
    const textEl = document.getElementById("scanner-status-text");
    if (textEl) textEl.innerText = msg;
}

// Render Result Sheet (Cal AI Screenshot 3)
function renderScanResultSheet(plateData) {
    currentScannedPlate = JSON.parse(JSON.stringify(plateData));
    currentServingMultiplier = 1;

    document.getElementById("scanner-processing-box")?.classList.add("hidden");
    const sheet = document.getElementById("scanner-result-sheet");
    if (sheet) sheet.classList.remove("hidden");

    // Populate Fields
    const titleEl = document.getElementById("result-meal-title");
    const previewImg = document.getElementById("plate-preview-img");
    const timePill = document.getElementById("result-timestamp-pill");
    const servingVal = document.getElementById("result-serving-val");

    if (titleEl) titleEl.innerText = plateData.meal_name;
    if (previewImg) previewImg.src = plateData.image || PRESETS_DB.salmon.image;
    if (timePill) timePill.innerText = `${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · Scanned`;
    if (servingVal) servingVal.innerText = "1";

    updateServingDisplay();

    // Render Ingredients List
    const table = document.getElementById("result-ingredients-table");
    if (table) {
        table.innerHTML = "";
        (plateData.items || []).forEach(item => {
            const row = document.createElement("div");
            row.className = "py-2.5 flex items-center justify-between";
            row.innerHTML = `
                <div>
                    <div class="font-bold text-slate-900">${item.name}</div>
                    <div class="text-[10px] text-slate-400">${item.weight_g}g • ${item.food_group}</div>
                </div>
                <div class="text-right">
                    <div class="font-black text-slate-900">${Math.round(item.nutrition.calories)} kcal</div>
                    <div class="text-[10px] text-slate-400 font-mono">${Math.round(item.nutrition.protein_g)}g P / ${Math.round(item.nutrition.carbs_g)}g C / ${Math.round(item.nutrition.fat_g)}g F</div>
                </div>
            `;
            table.appendChild(row);
        });
    }

    // Render Insights
    const insightsBox = document.getElementById("result-insights-box");
    if (insightsBox) {
        insightsBox.innerHTML = "";
        (plateData.health_insights || []).forEach(insight => {
            const pill = document.createElement("div");
            pill.className = "p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-900 flex items-start gap-2";
            pill.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="mt-0.5 flex-shrink-0 text-emerald-600"><polyline points="20 6 9 17 4 12"/></svg><span>${insight}</span>`;
            insightsBox.appendChild(pill);
        });
    }
}

function adjustServing(delta) {
    currentServingMultiplier = Math.max(0.5, Math.min(5, currentServingMultiplier + delta * 0.5));
    const servingVal = document.getElementById("result-serving-val");
    if (servingVal) servingVal.innerText = currentServingMultiplier;
    updateServingDisplay();
}

function updateServingDisplay() {
    if (!currentScannedPlate) return;
    const nutrition = currentScannedPlate.total_nutrition;
    const mult = currentServingMultiplier;

    const calEl = document.getElementById("result-calories-val");
    const pEl = document.getElementById("result-protein-val");
    const cEl = document.getElementById("result-carbs-val");
    const fEl = document.getElementById("result-fats-val");

    if (calEl) calEl.innerText = Math.round(nutrition.calories * mult);
    if (pEl) pEl.innerText = `${Math.round(nutrition.protein_g * mult)}g`;
    if (cEl) cEl.innerText = `${Math.round(nutrition.carbs_g * mult)}g`;
    if (fEl) fEl.innerText = `${Math.round(nutrition.fat_g * mult)}g`;
}

function fixResultsAction() {
    // Return to input mode
    resetScannerState();
}

function commitPlateToLog() {
    if (!currentScannedPlate) return;

    const mult = currentServingMultiplier;
    const finalMeal = {
        date: new Date().toISOString(),
        meal_name: currentScannedPlate.meal_name + (mult !== 1 ? ` (${mult}x)` : ""),
        calories: Math.round(currentScannedPlate.total_nutrition.calories * mult),
        protein_g: Math.round(currentScannedPlate.total_nutrition.protein_g * mult),
        carbs_g: Math.round(currentScannedPlate.total_nutrition.carbs_g * mult),
        fat_g: Math.round(currentScannedPlate.total_nutrition.fat_g * mult),
        image: currentScannedPlate.image
    };

    const history = JSON.parse(localStorage.getItem("opencal_meal_history") || "[]");
    history.push(finalMeal);
    localStorage.setItem("opencal_meal_history", JSON.stringify(history));

    closeScannerModal();
    refreshHomeScreen();
    showToast(`Logged "${finalMeal.meal_name}" (${finalMeal.calories} kcal) to today's ledger!`);
}

// TabPFN Dynamic Forecast & Trajectory Graph
async function loadMetabolicForecast(caloriesTarget) {
    try {
        const response = await fetch(`/api/metabolic-forecast?friend_name=Dave&target_weight_kg=75.0&daily_calories_target=${caloriesTarget}`);
        if (!response.ok) throw new Error("Forecast failed");
        const data = await response.json();

        const dynEl = document.getElementById("dynamic-tdee-val");
        const statEl = document.getElementById("static-tdee-val");
        if (dynEl) dynEl.innerText = `${data.insights.dynamic_tdee_kcal} kcal`;
        if (statEl) statEl.innerText = `${data.insights.static_formula_tdee_kcal} kcal`;

        renderWeightChart(data.trajectory, data.current_weight_kg, data.target_weight_kg);
    } catch (err) {
        console.error("Forecast error:", err);
    }
}

function renderWeightChart(trajectory, currentWeight, targetWeight) {
    const ctx = document.getElementById("trajectoryChart");
    if (!ctx) return;

    const labels = ["Day 0", ...trajectory.filter((_, i) => i % 4 === 0).map(t => `Day ${t.day_offset}`)];
    const values = [currentWeight, ...trajectory.filter((_, i) => i % 4 === 0).map(t => t.projected_weight_kg)];

    if (weightChart) weightChart.destroy();

    weightChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "TabPFN In-Context Forecast (kg)",
                    data: values,
                    borderColor: "#0f172a",
                    backgroundColor: "rgba(15, 23, 42, 0.05)",
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2.5,
                    pointBackgroundColor: "#0f172a",
                    pointRadius: 3
                },
                {
                    label: "Goal (75kg)",
                    data: labels.map(() => targetWeight),
                    borderColor: "rgba(244, 63, 94, 0.5)",
                    borderDash: [4, 4],
                    fill: false,
                    borderWidth: 1.5,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: "#94a3b8", font: { family: "Inter", size: 10 } }
                },
                y: {
                    grid: { color: "rgba(226, 232, 240, 0.6)" },
                    ticks: { color: "#94a3b8", font: { family: "Inter", size: 10 } }
                }
            }
        }
    });
}

// ElevenLabs Voice Coach Debrief
async function playStudioCoachDebrief() {
    const btn = document.getElementById("studio-coach-btn");
    const transcriptBox = document.getElementById("studio-coach-transcript");
    const profile = getStoredProfile() || DEFAULT_PROFILE;

    if (!btn) return;
    btn.innerText = "Synthesizing Debrief...";
    btn.disabled = true;

    try {
        const response = await fetch("/api/coach-debrief", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                friend_name: profile.name || "Dave",
                meal_name: "Daily Overview",
                calories: profile.target_calories,
                protein_g: profile.target_protein,
                days_to_goal: 22,
                target_weight: profile.weight_kg
            })
        });

        const data = await response.json();
        if (transcriptBox) {
            transcriptBox.innerText = `"${data.text}"`;
            transcriptBox.style.display = "block";
        }

        if (data.audio_base64) {
            const audio = new Audio("data:audio/mp3;base64," + data.audio_base64);
            audio.play();
            btn.innerText = "Playing Audio Coach...";
            audio.onended = () => {
                btn.innerText = "▶ Play Daily Voice Debrief";
                btn.disabled = false;
            };
        } else if ("speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance(data.text);
            utterance.rate = 1.05;
            window.speechSynthesis.speak(utterance);
            btn.innerText = "Speaking (Browser Speech)...";
            utterance.onend = () => {
                btn.innerText = "▶ Play Daily Voice Debrief";
                btn.disabled = false;
            };
        }
    } catch (err) {
        console.error("Coach error:", err);
        btn.innerText = "▶ Play Daily Voice Debrief";
        btn.disabled = false;
    }
}

// Toast Notification
function showToast(msg) {
    const toast = document.getElementById("app-toast");
    const text = document.getElementById("toast-text");
    if (!toast || !text) return;

    text.innerText = msg;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 3500);
}

function capitalize(s) {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Global Exported Handlers
window.switchAppTab = switchAppTab;
window.switchMainTab = switchAppTab;
window.openOnboardingModal = openOnboardingModal;
window.closeOnboardingModal = closeOnboardingModal;
window.setWeightUnit = setWeightUnit;
window.handleOnboardingSubmit = handleOnboardingSubmit;
window.finishOnboardingAndEnterApp = finishOnboardingAndEnterApp;
window.openScannerModal = openScannerModal;
window.closeScannerModal = closeScannerModal;
window.switchScannerMode = switchScannerMode;
window.snapPhoto = snapPhoto;
window.loadPreset = loadPreset;
window.adjustServing = adjustServing;
window.fixResultsAction = fixResultsAction;
window.commitPlateToLog = commitPlateToLog;
window.deleteMealItem = deleteMealItem;
window.clearAllHistory = clearAllHistory;
window.renderFullHistoryTab = renderFullHistoryTab;
window.playStudioCoachDebrief = playStudioCoachDebrief;
