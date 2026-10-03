/**
 * NutriScan AI - Dedicated Plate Scanner Studio Logic
 * Synchronized with Gemma Vision, USDA Grounding & TabPFN In-Context Engine
 */

let weightChart = null;
let cameraStream = null;

let selectedSex = "male";
let selectedGoal = "maintain";
let selectedActivity = "moderate";
let currentPortionMultiplier = 1.0;
let basePlateNutrition = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };

let currentPlateData = {
    meal_name: "",
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    days_to_goal: 22,
    target_weight: 75.0,
    daily_budget: 2100
};

// Initialize Storage and Purge Legacy Mock Data
function initStorageAndCleanMockData() {
    try {
        // Clean out any legacy mock seed meals from localStorage
        const savedHistory = localStorage.getItem("opencal_meal_history");
        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                const cleaned = parsed.filter(item => item.id !== "seed_1" && item.id !== "seed_2");
                localStorage.setItem("opencal_meal_history", JSON.stringify(cleaned));
            } catch (err) {
                localStorage.setItem("opencal_meal_history", "[]");
            }
        } else {
            localStorage.setItem("opencal_meal_history", "[]");
        }

        // Daily water intake: starts at 0 for each new day
        const todayStr = new Date().toISOString().split("T")[0];
        const storedWaterDate = localStorage.getItem("opencal_water_date");
        if (storedWaterDate !== todayStr) {
            localStorage.setItem("opencal_water_date", todayStr);
            localStorage.setItem("opencal_water_intake", "0");
        } else if (!localStorage.getItem("opencal_water_intake")) {
            localStorage.setItem("opencal_water_intake", "0");
        }

        // Clean out legacy mock water if it was 1750
        if (localStorage.getItem("opencal_water_intake") === "1750") {
            localStorage.setItem("opencal_water_intake", "0");
        }
    } catch (e) {
        console.warn("Storage init error:", e);
    }
}

// User Profile Storage Helper
function getUserProfile() {
    try {
        const saved = localStorage.getItem("opencal_user_profile");
        if (saved) return JSON.parse(saved);
    } catch (e) {
        console.warn("Error parsing user profile:", e);
    }
    return {
        sex: "male",
        weight_lbs: 165,
        height: "5'10\"",
        dob: "January 01, 2003",
        goal: "maintain",
        activity: "moderate",
        daily_calories: 2100,
        target_protein: 150,
        target_carbs: 220,
        target_fat: 65
    };
}

function getLoggedCaloriesTotal() {
    try {
        const history = JSON.parse(localStorage.getItem("opencal_meal_history") || "[]");
        return history.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
    } catch {
        return 0;
    }
}

function showScanResultsContainer() {
    const container = document.getElementById("scan-results-container");
    if (container) {
        container.classList.remove("hidden");
        setTimeout(() => {
            container.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
    }
}

function resetScannerState() {
    // 1. Hide scan results container
    const container = document.getElementById("scan-results-container");
    if (container) {
        container.classList.add("hidden");
    }

    // 2. Clear image preview
    const previewImg = document.getElementById("plate-preview-img");
    if (previewImg) {
        previewImg.src = "";
    }

    // 3. Reset title and macros to neutral placeholders
    const titleEl = document.getElementById("studio-plate-title");
    if (titleEl) {
        titleEl.innerText = "Ready to scan food plate";
    }

    const calEl = document.getElementById("macro-calories");
    const protEl = document.getElementById("macro-protein");
    const carbEl = document.getElementById("macro-carbs");
    const fatEl = document.getElementById("macro-fat");
    if (calEl) calEl.innerText = "--";
    if (protEl) protEl.innerText = "--g";
    if (carbEl) carbEl.innerText = "--g";
    if (fatEl) fatEl.innerText = "--g";

    // 4. Clear food items table
    const tableContainer = document.getElementById("studio-items-table");
    if (tableContainer) {
        tableContainer.innerHTML = '<div class="py-3 text-center text-slate-400 text-xs">Waiting for food plate scan...</div>';
    }

    // 5. Clear insights
    const insightsBox = document.getElementById("studio-insights-container");
    if (insightsBox) {
        insightsBox.innerHTML = "";
    }

    // 6. Reset portion multiplier and stored plate data
    currentPortionMultiplier = 1.0;
    const stepperVal = document.getElementById("portion-multiplier-val");
    if (stepperVal) stepperVal.innerText = "1";

    currentPlateData = {
        meal_name: "",
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        fiber_g: 0,
        days_to_goal: 22,
        target_weight: 75.0,
        daily_budget: 2100
    };
    basePlateNutrition = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };

    // 7. Reset visual progress stepper to neutral
    resetScanningProgressIndicators();

    // 8. Clear AR viewfinder tags
    const arTags = document.getElementById("camera-ar-tags");
    if (arTags) {
        arTags.innerHTML = "";
    }

    // 9. Reset file input
    const fileInput = document.getElementById("studio-file-input");
    if (fileInput) fileInput.value = "";
}

function resetScanningProgressIndicators() {
    const s1 = document.getElementById("step-1");
    const s2 = document.getElementById("step-2");
    const s3 = document.getElementById("step-3");
    const statusText = document.getElementById("scanner-status-text");

    if (s1) s1.className = "flex items-center gap-1.5 opacity-60";
    if (s2) s2.className = "flex items-center gap-1.5 opacity-60";
    if (s3) s3.className = "flex items-center gap-1.5 opacity-60";
    if (statusText) statusText.innerHTML = '<span>Ready to analyze food plate</span>';
}

function prepareScanLoadingState(previewSrc) {
    showScanResultsContainer();

    // Set freshly captured or uploaded photo preview
    const previewImg = document.getElementById("plate-preview-img");
    if (previewImg && previewSrc) {
        previewImg.src = previewSrc;
    }

    // Reset currentPlateData and basePlateNutrition so stale data is never carried over
    currentPlateData = {
        meal_name: "Analyzing plate...",
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        fiber_g: 0,
        days_to_goal: 22,
        target_weight: 75.0,
        daily_budget: 2100
    };
    basePlateNutrition = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };
    currentPortionMultiplier = 1.0;
    const stepperVal = document.getElementById("portion-multiplier-val");
    if (stepperVal) stepperVal.innerText = "1";

    // Show analyzing state on title with animated spinner
    const titleEl = document.getElementById("studio-plate-title");
    if (titleEl) {
        titleEl.innerHTML = '<span class="inline-flex items-center gap-2 text-slate-800 animate-pulse"><svg class="animate-spin w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25"/><path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" class="opacity-75"/></svg>Analyzing new food plate...</span>';
    }

    // Clear old numbers to "--"
    const calEl = document.getElementById("macro-calories");
    const protEl = document.getElementById("macro-protein");
    const carbEl = document.getElementById("macro-carbs");
    const fatEl = document.getElementById("macro-fat");
    if (calEl) calEl.innerText = "--";
    if (protEl) protEl.innerText = "--g";
    if (carbEl) carbEl.innerText = "--g";
    if (fatEl) fatEl.innerText = "--g";

    // Show loading skeleton in ingredients table
    const tableContainer = document.getElementById("studio-items-table");
    if (tableContainer) {
        tableContainer.innerHTML = `
            <div class="py-4 text-center text-xs font-semibold text-slate-400 space-y-2">
                <div class="h-3 bg-slate-100 rounded-full w-3/4 mx-auto animate-pulse"></div>
                <div class="h-3 bg-slate-100 rounded-full w-1/2 mx-auto animate-pulse"></div>
                <div class="text-[11px] text-slate-400 mt-2">Identifying food ingredients & calculating grams...</div>
            </div>
        `;
    }

    // Clear old insights
    const insightsBox = document.getElementById("studio-insights-container");
    if (insightsBox) {
        insightsBox.innerHTML = "";
    }

    // Set progress to step 1
    setScanningProgress(1);
}

function retakePhoto() {
    resetScannerState();
    const modal = document.getElementById("scanner-modal");
    if (modal) {
        const modalBody = modal.querySelector(".overflow-y-auto");
        if (modalBody) {
            modalBody.scrollTo({ top: 0, behavior: "smooth" });
        }
    }
    const cameraTabBtn = document.querySelector('.studio-tab-btn[data-tab="camera"]');
    if (cameraTabBtn) {
        cameraTabBtn.click();
    } else {
        startCamera();
    }
}

function showScanRetry() {
    retakePhoto();
}

// ========================================================
// ONBOARDING CONTROLLERS
// ========================================================
function selectSex(sex) {
    selectedSex = sex;
    const maleBtn = document.getElementById("sex-male-btn");
    const femaleBtn = document.getElementById("sex-female-btn");

    if (maleBtn && femaleBtn) {
        if (sex === "male") {
            maleBtn.className = "onboard-sex-btn py-3 px-4 rounded-2xl border-2 border-emerald-600 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs";
            femaleBtn.className = "onboard-sex-btn py-3 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all hover:border-slate-400";
        } else {
            femaleBtn.className = "onboard-sex-btn py-3 px-4 rounded-2xl border-2 border-emerald-600 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs";
            maleBtn.className = "onboard-sex-btn py-3 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all hover:border-slate-400";
        }
    }
}

function selectGoal(goal) {
    selectedGoal = goal;
    document.querySelectorAll(".onboard-goal-btn").forEach(btn => {
        const isMatch = btn.dataset.goal === goal;
        const radio = btn.querySelector(".goal-radio");
        if (isMatch) {
            btn.className = "onboard-goal-btn active w-full p-3.5 rounded-2xl border-2 border-emerald-600 bg-emerald-50/30 shadow-xs flex items-center justify-between text-left transition-all";
            if (radio) {
                radio.className = "goal-radio w-5 h-5 rounded-full border-2 border-emerald-600 bg-emerald-600 flex items-center justify-center";
                radio.innerHTML = '<div class="w-2 h-2 rounded-full bg-white"></div>';
            }
        } else {
            btn.className = "onboard-goal-btn w-full p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-400 flex items-center justify-between text-left transition-all";
            if (radio) {
                radio.className = "goal-radio w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center";
                radio.innerHTML = "";
            }
        }
    });
}

function selectActivity(act) {
    selectedActivity = act;
    document.querySelectorAll(".onboard-activity-btn").forEach(btn => {
        const isMatch = btn.dataset.act === act;
        if (isMatch) {
            btn.className = "onboard-activity-btn active flex-1 py-2.5 rounded-xl text-xs font-bold text-emerald-800 bg-white shadow-xs transition-all";
        } else {
            btn.className = "onboard-activity-btn flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 transition-all";
        }
    });
}

function completeOnboarding() {
    const weightVal = parseFloat(document.getElementById("onboard-weight")?.value || "165");
    const heightVal = document.getElementById("onboard-height")?.value || "5'10\"";
    const dobM = document.getElementById("onboard-dob-month")?.value || "January";
    const dobD = document.getElementById("onboard-dob-day")?.value || "01";
    const dobY = document.getElementById("onboard-dob-year")?.value || "2003";

    // Basal Metabolic Rate (BMR) calculation via Mifflin-St Jeor formula:
    // Men: (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
    // Women: (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161
    const weightKg = weightVal * 0.45359237;
    let heightCm = 175;
    const hMatch = String(heightVal).match(/(\d+)'(?:\s*(\d+)")?/);
    if (hMatch) {
        const feet = parseInt(hMatch[1]) || 5;
        const inches = parseInt(hMatch[2]) || 10;
        heightCm = (feet * 12 + inches) * 2.54;
    } else {
        const parsedCm = parseFloat(heightVal);
        if (!isNaN(parsedCm) && parsedCm > 100 && parsedCm < 250) heightCm = parsedCm;
    }
    const currentYear = new Date().getFullYear();
    const birthYear = parseInt(dobY) || 2000;
    const age = Math.max(16, Math.min(95, currentYear - birthYear));

    let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
    if (selectedSex === "female") {
        bmr -= 161;
    } else {
        bmr += 5;
    }

    // Daily activity expenditure multiplier
    let activityMult = 1.375; // moderate
    if (selectedActivity === "sedentary") activityMult = 1.2;
    if (selectedActivity === "high") activityMult = 1.55;

    const tdee = Math.round(bmr * activityMult);
    let dailyCals = tdee;
    let prot = Math.round(weightKg * 1.8);
    let fat = Math.round((dailyCals * 0.28) / 9);
    let carbs = Math.round((dailyCals - (prot * 4) - (fat * 9)) / 4);

    if (selectedGoal === "lose") {
        dailyCals = Math.round(tdee - 450);
        prot = Math.round(weightKg * 2.0); // preserve lean mass
        fat = Math.round((dailyCals * 0.25) / 9);
        carbs = Math.round((dailyCals - (prot * 4) - (fat * 9)) / 4);
    } else if (selectedGoal === "gain") {
        dailyCals = Math.round(tdee + 350);
        prot = Math.round(weightKg * 2.2); // support hypertrophy
        fat = Math.round((dailyCals * 0.25) / 9);
        carbs = Math.round((dailyCals - (prot * 4) - (fat * 9)) / 4);
    }

    // Safe physiological bounds
    dailyCals = Math.max(1300, Math.min(4200, dailyCals));
    prot = Math.max(60, Math.min(280, prot));
    fat = Math.max(35, Math.min(140, fat));
    carbs = Math.max(80, Math.min(500, carbs));

    const profile = {
        sex: selectedSex,
        weight_lbs: weightVal,
        height: heightVal,
        dob: `${dobM} ${dobD}, ${dobY}`,
        goal: selectedGoal,
        activity: selectedActivity,
        daily_calories: dailyCals,
        target_protein: prot,
        target_carbs: carbs,
        target_fat: fat
    };

    localStorage.setItem("opencal_user_profile", JSON.stringify(profile));
    localStorage.setItem("opencal_onboarded", "true");
    localStorage.setItem("nutriscan_onboarded_v2", "true");

    updateHomeScreen();
    if (typeof switchMainTab === "function") {
        switchMainTab("home");
    }
}

function skipOnboardingToHome() {
    const defaultProfile = {
        sex: "male",
        weight_lbs: 165,
        height: "5'10\"",
        dob: "January 01, 2003",
        goal: "maintain",
        activity: "moderate",
        daily_calories: 2100,
        target_protein: 150,
        target_carbs: 220,
        target_fat: 65
    };
    localStorage.setItem("opencal_user_profile", JSON.stringify(defaultProfile));
    localStorage.setItem("opencal_onboarded", "true");
    localStorage.setItem("nutriscan_onboarded_v2", "true");

    updateHomeScreen();
    if (typeof switchMainTab === "function") {
        switchMainTab("home");
    }
}

function populateDobOptions() {
    const daySelect = document.getElementById("onboard-dob-day");
    const yearSelect = document.getElementById("onboard-dob-year");
    if (daySelect && daySelect.options.length <= 8) {
        const currentDayVal = daySelect.value || "01";
        daySelect.innerHTML = "";
        for (let d = 1; d <= 31; d++) {
            const val = d < 10 ? "0" + d : "" + d;
            const opt = document.createElement("option");
            opt.value = val;
            opt.innerText = val;
            if (val === currentDayVal) opt.selected = true;
            daySelect.appendChild(opt);
        }
    }
    if (yearSelect && yearSelect.options.length <= 10) {
        const currentYearVal = yearSelect.value || "2003";
        yearSelect.innerHTML = "";
        const thisYear = new Date().getFullYear();
        for (let y = thisYear - 12; y >= 1940; y--) {
            const opt = document.createElement("option");
            opt.value = "" + y;
            opt.innerText = "" + y;
            if (("" + y) === currentYearVal) opt.selected = true;
            yearSelect.appendChild(opt);
        }
    }
}

function populateOnboardingFieldsFromProfile() {
    const profile = getUserProfile();
    if (!profile) return;
    if (profile.sex) selectSex(profile.sex);
    if (profile.goal) selectGoal(profile.goal);
    if (profile.activity) selectActivity(profile.activity);

    const wInput = document.getElementById("onboard-weight");
    if (wInput && profile.weight_lbs) {
        wInput.value = profile.weight_lbs;
        updateOnboardKg(profile.weight_lbs);
    }
    const hInput = document.getElementById("onboard-height");
    if (hInput && profile.height) {
        hInput.value = profile.height;
    }
    if (profile.dob) {
        const parts = profile.dob.replace(",", "").split(/\s+/);
        if (parts.length >= 3) {
            const mSelect = document.getElementById("onboard-dob-month");
            const dSelect = document.getElementById("onboard-dob-day");
            const ySelect = document.getElementById("onboard-dob-year");
            if (mSelect) mSelect.value = parts[0];
            if (dSelect) dSelect.value = parts[1].padStart(2, "0");
            if (ySelect) ySelect.value = parts[2];
        }
    }
}

function openOnboardingFromSettings() {
    closeSettingsModal();
    populateDobOptions();
    populateOnboardingFieldsFromProfile();
    if (typeof switchMainTab === "function") {
        switchMainTab("onboarding");
    }
}

// ========================================================
// HEALTH TRACKERS (WATER, CALENDAR, METABOLISM)
// ========================================================
// ========================================================
// HEALTH TRACKERS (WATER, CALENDAR, METABOLISM, FASTING)
// ========================================================
function addWater(amount) {
    try {
        const todayStr = new Date().toISOString().split("T")[0];
        const storedDate = localStorage.getItem("opencal_water_date");
        let currentWater = 0;
        if (storedDate === todayStr) {
            currentWater = parseInt(localStorage.getItem("opencal_water_intake") || "0", 10);
        }
        currentWater = Math.min(5000, currentWater + amount);
        localStorage.setItem("opencal_water_date", todayStr);
        localStorage.setItem("opencal_water_intake", currentWater.toString());
        updateWaterDisplay(currentWater);
    } catch (e) {
        console.error("Water tracker error:", e);
    }
}

function updateWaterDisplay(waterAmount) {
    const waterVal = document.getElementById("home-water-val");
    const waterBar = document.getElementById("home-water-bar");
    const val = Number(waterAmount) || 0;
    if (waterVal) waterVal.innerText = val.toLocaleString();
    if (waterBar) {
        const pct = Math.min(100, Math.round((val / 2500) * 100));
        waterBar.style.width = `${pct}%`;
    }
}

// Dynamic Streak Counting
function calculateStreak() {
    try {
        const history = JSON.parse(localStorage.getItem("opencal_meal_history") || "[]");
        if (!history || history.length === 0) return 0;

        const loggedDates = new Set();
        history.forEach(m => {
            if (m.date) {
                const d = new Date(m.date);
                if (!isNaN(d.getTime())) {
                    loggedDates.add(d.toISOString().split("T")[0]);
                }
            }
        });

        if (loggedDates.size === 0) return 0;

        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        let cursorDate = null;
        if (loggedDates.has(todayStr)) {
            cursorDate = new Date(today);
        } else if (loggedDates.has(yesterdayStr)) {
            cursorDate = new Date(yesterday);
        } else {
            return 0; // Streak broken or no meals logged yet
        }

        let streak = 0;
        while (true) {
            const checkStr = cursorDate.toISOString().split("T")[0];
            if (loggedDates.has(checkStr)) {
                streak++;
                cursorDate.setDate(cursorDate.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
    } catch (e) {
        return 0;
    }
}

// Dynamic Intermittent Fasting Calculation
function updateFastingDisplay() {
    const titleEl = document.getElementById("home-fasting-title");
    const subEl = document.getElementById("home-fasting-sub");
    const badgeEl = document.getElementById("home-fasting-badge");
    if (!titleEl) return;

    try {
        const history = JSON.parse(localStorage.getItem("opencal_meal_history") || "[]");
        if (!history || history.length === 0) {
            titleEl.innerText = "Fasting Window: Ready";
            if (subEl) subEl.innerText = "16:8 Protocol · Fast starts after your last meal";
            if (badgeEl) {
                badgeEl.innerText = "Ready";
                badgeEl.className = "text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full shrink-0";
            }
            return;
        }

        let latestTimestamp = 0;
        history.forEach(m => {
            if (m.date) {
                const t = new Date(m.date).getTime();
                if (!isNaN(t) && t > latestTimestamp) {
                    latestTimestamp = t;
                }
            }
        });

        if (latestTimestamp === 0) {
            titleEl.innerText = "Fasting Window: Ready";
            if (subEl) subEl.innerText = "16:8 Protocol · Active Tracking";
            if (badgeEl) {
                badgeEl.innerText = "Ready";
                badgeEl.className = "text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full shrink-0";
            }
            return;
        }

        const elapsedMs = Math.max(0, Date.now() - latestTimestamp);
        const totalMinutes = Math.floor(elapsedMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        titleEl.innerText = `Fasting Window: ${hours}h ${minutes}m`;

        if (hours >= 16) {
            if (subEl) subEl.innerText = "16:8 Protocol · 16h Target Achieved";
            if (badgeEl) {
                badgeEl.innerText = "Goal Met";
                badgeEl.className = "text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0";
            }
        } else if (hours >= 12) {
            if (subEl) subEl.innerText = "16:8 Protocol · Fat Oxidation Active";
            if (badgeEl) {
                badgeEl.innerText = "On Track";
                badgeEl.className = "text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0";
            }
        } else if (hours >= 4) {
            if (subEl) subEl.innerText = "16:8 Protocol · Digestive Rest";
            if (badgeEl) {
                badgeEl.innerText = "In Progress";
                badgeEl.className = "text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full shrink-0";
            }
        } else {
            if (subEl) subEl.innerText = "Postprandial Phase · Digesting Last Meal";
            if (badgeEl) {
                badgeEl.innerText = "Digesting";
                badgeEl.className = "text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full shrink-0";
            }
        }
    } catch (e) {
        console.warn("Fasting window calc error:", e);
    }
}

function deleteMeal(mealId) {
    try {
        const history = JSON.parse(localStorage.getItem("opencal_meal_history") || "[]");
        const filtered = history.filter(m => m.id !== mealId);
        localStorage.setItem("opencal_meal_history", JSON.stringify(filtered));
        updateHomeScreen();
        if (typeof renderHistoryView === "function") {
            renderHistoryView();
        }
    } catch (e) {
        console.error("Error deleting meal:", e);
    }
}
window.deleteMeal = deleteMeal;

function buildCalendarStrip() {
    const strip = document.getElementById("week-calendar-strip");
    if (!strip) return;

    const now = new Date();
    const today = now.getDate();
    const currentDay = now.getDay(); // 0=Sun, 6=Sat
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Find Sunday of the current week
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - currentDay);

    // Check which days have logged meals
    const history = JSON.parse(localStorage.getItem("opencal_meal_history") || "[]");
    const loggedDates = new Set();
    history.forEach(m => {
        if (m.date) loggedDates.add(m.date.split("T")[0]);
    });

    let html = "";
    for (let i = 0; i < 7; i++) {
        const d = new Date(sunday);
        d.setDate(sunday.getDate() + i);
        const dayNum = d.getDate();
        const dayName = dayNames[d.getDay()];
        const dateStr = d.toISOString().split("T")[0];
        const isToday = dayNum === today && d.getMonth() === now.getMonth();
        const isPast = d < new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const isFuture = !isToday && !isPast;
        const hasLogs = loggedDates.has(dateStr);

        let labelClass, circleClass;
        if (isToday) {
            labelClass = 'text-[10px] font-bold text-emerald-700';
            circleClass = 'w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-white mx-auto flex items-center justify-center text-xs font-black shadow-xs mt-1';
        } else if (isPast && hasLogs) {
            labelClass = 'text-[10px] font-medium text-slate-400';
            circleClass = 'w-8 h-8 rounded-full border border-emerald-400 bg-emerald-50 mx-auto flex items-center justify-center text-xs font-bold text-emerald-800 mt-1';
        } else if (isFuture) {
            labelClass = 'text-[10px] font-medium text-slate-300';
            circleClass = 'w-8 h-8 rounded-full mx-auto flex items-center justify-center text-xs font-semibold text-slate-400 mt-1';
        } else {
            labelClass = 'text-[10px] font-medium text-slate-400';
            circleClass = 'w-8 h-8 rounded-full border border-slate-200 mx-auto flex items-center justify-center text-xs font-bold text-slate-700 mt-1';
        }

        html += `<button type="button" class="week-day-btn${isToday ? ' active' : ''} flex-1 py-1 rounded-xl transition-all" data-date="${dateStr}" onclick="selectCalendarDay(${dayNum})">
            <div class="${labelClass}">${dayName}</div>
            <div class="${circleClass}">${dayNum}</div>
        </button>`;
    }
    strip.innerHTML = html;
}

function selectCalendarDay(day) {
    document.querySelectorAll(".week-day-btn").forEach(btn => {
        const dayLabel = btn.querySelector("div:first-child");
        const dayCircle = btn.querySelector("div:last-child");
        if (!dayCircle) return;

        const isTarget = dayCircle.innerText.trim() === day.toString();
        if (isTarget) {
            btn.classList.add("active");
            dayCircle.className = "w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-white mx-auto flex items-center justify-center text-xs font-black shadow-xs mt-1";
            if (dayLabel) dayLabel.className = "text-[10px] font-bold text-emerald-700";
        } else {
            btn.classList.remove("active");
            if (dayLabel) dayLabel.className = "text-[10px] font-medium text-slate-400";
            const dateStr = btn.dataset.date || "";
            const history = JSON.parse(localStorage.getItem("opencal_meal_history") || "[]");
            const hasLogs = history.some(m => m.date && m.date.startsWith(dateStr));
            if (hasLogs) {
                dayCircle.className = "w-8 h-8 rounded-full border border-emerald-400 bg-emerald-50 mx-auto flex items-center justify-center text-xs font-bold text-emerald-800 mt-1";
            } else {
                dayCircle.className = "w-8 h-8 rounded-full border border-slate-200 mx-auto flex items-center justify-center text-xs font-bold text-slate-700 mt-1";
            }
        }
    });
}

// ========================================================
// HOME SCREEN CONTROLLER & METRICS
// ========================================================
function updateHomeScreen() {
    const profile = getUserProfile();
    const history = JSON.parse(localStorage.getItem("opencal_meal_history") || "[]");

    // Filter today's meals
    const todayStr = new Date().toISOString().split("T")[0];
    const todayMeals = history.filter(item => item.date && item.date.startsWith(todayStr));

    let consumedCals = 0;
    let consumedProt = 0;
    let consumedCarb = 0;
    let consumedFat = 0;
    let consumedFiber = 0;

    todayMeals.forEach(m => {
        consumedCals += Number(m.calories) || 0;
        consumedProt += Number(m.protein_g) || 0;
        consumedCarb += Number(m.carbs_g) || 0;
        consumedFat += Number(m.fat_g) || 0;
        consumedFiber += Number(m.fiber_g) || 3.5;
    });

    // Update Calories Display
    const calConsumedEl = document.getElementById("home-cal-consumed");
    const calTargetEl = document.getElementById("home-cal-target");
    const goalLabelEl = document.getElementById("home-goal-label");

    if (calConsumedEl) calConsumedEl.innerText = Math.round(consumedCals).toLocaleString();
    if (calTargetEl) calTargetEl.innerText = Math.round(profile.daily_calories || 2100).toLocaleString();

    if (goalLabelEl) {
        const goalName = profile.goal === "lose" ? "Lose Weight" : profile.goal === "gain" ? "Gain Weight" : "Maintain Weight";
        const weightLbs = Number(profile.weight_lbs) || 165;
        const weightKg = (weightLbs * 0.45359237).toFixed(1);
        goalLabelEl.innerText = `${goalName} · ${weightLbs} lbs (${weightKg} kg)`;
    }

    // Hero Circular SVG Flame Ring (circumference = 2 * pi * 40 ≈ 251.2)
    const heroRing = document.getElementById("home-ring-circle");
    if (heroRing) {
        const circ = 251.2;
        const pct = Math.min(1, consumedCals / (profile.daily_calories || 2100));
        const offset = circ * (1 - pct);
        heroRing.style.strokeDashoffset = offset;
    }

    // Update Macro Values
    const protEatenEl = document.getElementById("home-prot-eaten");
    const protTargetEl = document.getElementById("home-prot-target");
    const carbEatenEl = document.getElementById("home-carb-eaten");
    const carbTargetEl = document.getElementById("home-carb-target");
    const fatEatenEl = document.getElementById("home-fat-eaten");
    const fatTargetEl = document.getElementById("home-fat-target");

    if (protEatenEl) protEatenEl.innerText = Math.round(consumedProt);
    if (protTargetEl) protTargetEl.innerText = profile.target_protein || 150;
    if (carbEatenEl) carbEatenEl.innerText = Math.round(consumedCarb);
    if (carbTargetEl) carbTargetEl.innerText = profile.target_carbs || 220;
    if (fatEatenEl) fatEatenEl.innerText = Math.round(consumedFat);
    if (fatTargetEl) fatTargetEl.innerText = profile.target_fat || 65;

    // Mini Macro Rings (circumference = 2 * pi * 14 ≈ 87.9)
    const protRing = document.getElementById("home-prot-ring");
    const carbRing = document.getElementById("home-carb-ring");
    const fatRing = document.getElementById("home-fat-ring");

    if (protRing) {
        const pct = Math.min(1, consumedProt / (profile.target_protein || 150));
        protRing.style.strokeDashoffset = 87.9 * (1 - pct);
    }
    if (carbRing) {
        const pct = Math.min(1, consumedCarb / (profile.target_carbs || 220));
        carbRing.style.strokeDashoffset = 87.9 * (1 - pct);
    }
    if (fatRing) {
        const pct = Math.min(1, consumedFat / (profile.target_fat || 65));
        fatRing.style.strokeDashoffset = 87.9 * (1 - pct);
    }

    // Update Water Tracker from today's real logged amount
    const storedWaterDate = localStorage.getItem("opencal_water_date");
    let currentWater = 0;
    if (storedWaterDate === todayStr) {
        currentWater = parseInt(localStorage.getItem("opencal_water_intake") || "0", 10);
    } else {
        localStorage.setItem("opencal_water_date", todayStr);
        localStorage.setItem("opencal_water_intake", "0");
    }
    updateWaterDisplay(currentWater);

    // Update Dynamic Streak
    const streak = calculateStreak();
    const streakBadge = document.getElementById("streak-badge-count");
    if (streakBadge) {
        streakBadge.innerText = `${streak} Day${streak === 1 ? "" : "s"}`;
    }

    // Update Fasting Window
    updateFastingDisplay();

    // Render Recently Uploaded Meals List
    const recentListEl = document.getElementById("home-recent-meals-list");
    const emptyMealsEl = document.getElementById("home-empty-meals");

    if (recentListEl && emptyMealsEl) {
        if (todayMeals.length === 0) {
            emptyMealsEl.style.display = "block";
            recentListEl.innerHTML = "";
            recentListEl.style.display = "none";
        } else {
            emptyMealsEl.style.display = "none";
            recentListEl.style.display = "block";
            recentListEl.innerHTML = todayMeals.slice().reverse().map(meal => {
                const timeStr = meal.date ? new Date(meal.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now";
                return `
                <div class="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow flex items-center justify-between group">
                  <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700 flex-shrink-0 shadow-2xs">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/>
                        <path d="M19 12a7 7 0 0 0-14 0"/>
                        <circle cx="12" cy="5" r="1"/>
                      </svg>
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-extrabold text-slate-900 text-xs tracking-tight">${meal.meal_name}</span>
                      </div>
                      <div class="text-[10px] text-slate-400 mt-0.5">${timeStr}</div>
                      <div class="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-semibold">
                        <span>🍗 <strong class="text-slate-800">${Math.round(meal.protein_g)}g</strong></span>
                        <span>🌾 <strong class="text-slate-800">${Math.round(meal.carbs_g)}g</strong></span>
                        <span>🥑 <strong class="text-slate-800">${Math.round(meal.fat_g)}g</strong></span>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <div class="text-right flex-shrink-0">
                      <span class="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" class="text-emerald-600"><path d="M12 2c.5 3 2 4.5 4 6 2.5 1.9 4 4.5 4 8a8 8 0 1 1-16 0c0-3.5 1.5-6.1 4-8 2-1.5 3.5-3 4-6Z"/></svg>
                        ${Math.round(meal.calories)}
                      </span>
                      <div class="text-[9px] text-slate-400 mt-1 font-medium">Calories</div>
                    </div>
                    <button type="button" onclick="deleteMeal('${meal.id}')" class="opacity-40 hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 transition-all" title="Remove meal">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
                `;
            }).join("");
        }
    }
}

// ========================================================
// MODAL CONTROLLERS (SCANNER & SETTINGS)
// ========================================================
function openScannerModal() {
    resetScannerState();
    const modal = document.getElementById("scanner-modal");
    if (modal) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
        const modalBody = modal.querySelector(".overflow-y-auto");
        if (modalBody) {
            modalBody.scrollTop = 0;
        }
    }
    const cameraTabBtn = document.querySelector('.studio-tab-btn[data-tab="camera"]');
    if (cameraTabBtn && cameraTabBtn.classList.contains("active")) {
        startCamera();
    }
}

function closeScannerModal() {
    resetScannerState();
    const modal = document.getElementById("scanner-modal");
    if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
    }
    stopCamera();
}

function openSettingsModal() {
    populateSettingsModal();
    const modal = document.getElementById("settings-modal");
    if (modal) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
    }
}

function closeSettingsModal() {
    const modal = document.getElementById("settings-modal");
    if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
    }
}

function populateSettingsModal() {
    const profile = getUserProfile();
    const sexEl = document.getElementById("settings-sex-val");
    const bodyEl = document.getElementById("settings-body-val");
    const goalEl = document.getElementById("settings-goal-val");
    const calsEl = document.getElementById("settings-cals-val");

    if (sexEl) sexEl.innerText = profile.sex === "female" ? "Female" : "Male";
    const weightLbs = Number(profile.weight_lbs) || 165;
    const weightKg = (weightLbs * 0.45359237).toFixed(1);
    if (bodyEl) bodyEl.innerText = `${weightLbs} lbs (${weightKg} kg) · ${profile.height}`;
    if (goalEl) {
        const goalMap = { lose: "Lose Weight", maintain: "Maintain", gain: "Gain Weight / Muscle" };
        goalEl.innerText = goalMap[profile.goal] || "Maintain";
    }
    if (calsEl) calsEl.innerText = `${(profile.daily_calories || 2100).toLocaleString()} kcal`;
}

// ========================================================
// PORTION STEPPER & CONFIRMATION
// ========================================================
function adjustPortion(delta) {
    currentPortionMultiplier = Math.max(0.25, Math.min(4.0, +(currentPortionMultiplier + delta).toFixed(2)));
    const stepperVal = document.getElementById("portion-multiplier-val");
    if (stepperVal) stepperVal.innerText = currentPortionMultiplier;

    // Recalculate based on base plate nutrition
    currentPlateData.calories = basePlateNutrition.calories * currentPortionMultiplier;
    currentPlateData.protein_g = basePlateNutrition.protein_g * currentPortionMultiplier;
    currentPlateData.carbs_g = basePlateNutrition.carbs_g * currentPortionMultiplier;
    currentPlateData.fat_g = basePlateNutrition.fat_g * currentPortionMultiplier;

    const calEl = document.getElementById("macro-calories");
    const protEl = document.getElementById("macro-protein");
    const carbEl = document.getElementById("macro-carbs");
    const fatEl = document.getElementById("macro-fat");

    if (calEl) calEl.innerText = Math.round(currentPlateData.calories);
    if (protEl) protEl.innerText = Math.round(currentPlateData.protein_g) + "g";
    if (carbEl) carbEl.innerText = Math.round(currentPlateData.carbs_g) + "g";
    if (fatEl) fatEl.innerText = Math.round(currentPlateData.fat_g) + "g";
}

function confirmPlateAndLog() {
    try {
        if (!currentPlateData.meal_name || currentPlateData.meal_name === "Ready to scan food plate" || currentPlateData.meal_name.includes("Analyzing") || (currentPlateData.calories === 0 && currentPlateData.protein_g === 0)) {
            alert("Please take a photo or upload an image to scan your food plate first.");
            return;
        }

        const history = JSON.parse(localStorage.getItem("opencal_meal_history") || "[]");
        const entry = {
            id: "meal_" + Date.now(),
            date: new Date().toISOString(),
            meal_name: currentPlateData.meal_name || "Verified Plate",
            calories: currentPlateData.calories || 0,
            protein_g: currentPlateData.protein_g || 0,
            carbs_g: currentPlateData.carbs_g || 0,
            fat_g: currentPlateData.fat_g || 0,
            portion_multiplier: currentPortionMultiplier
        };
        history.push(entry);
        localStorage.setItem("opencal_meal_history", JSON.stringify(history));

        // Update home screen metrics, rings, and recently uploaded list
        updateHomeScreen();

        // Close scanner modal and completely reset scanner state
        closeScannerModal();
        resetScannerState();

        // If on history tab, refresh history
        if (typeof renderHistoryView === "function") {
            renderHistoryView();
        }
    } catch (e) {
        console.error("Error logging plate:", e);
    }
}

// ========================================================
// CORE APP LIFECYCLE
// ========================================================
document.addEventListener("DOMContentLoaded", () => {
    resetScannerState();
    initStorageAndCleanMockData();
    populateDobOptions();
    initTabs();
    initDropzone();
    initPresets();
    initSlider();
    loadMetabolicForecast(2100);

    // Build the calendar strip with real current-week dates
    buildCalendarStrip();

    // Check if user has completed personalized onboarding v2
    const isOnboarded = localStorage.getItem("nutriscan_onboarded_v2") === "true";
    if (isOnboarded) {
        if (typeof switchMainTab === "function") {
            switchMainTab("home");
        }
        updateHomeScreen();
    } else {
        populateOnboardingFieldsFromProfile();
        if (typeof switchMainTab === "function") {
            switchMainTab("onboarding");
        }
    }
});

// Segmented Control Tabs (Upload, Camera, Presets)
function initTabs() {
    const tabButtons = document.querySelectorAll(".studio-tab-btn");
    const tabPanels = document.querySelectorAll(".studio-tab-panel");

    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.dataset.tab;

            tabButtons.forEach(b => b.classList.remove("active"));
            tabPanels.forEach(p => p.classList.remove("active"));

            btn.classList.add("active");
            const activePanel = document.getElementById(`panel-${targetTab}`);
            if (activePanel) activePanel.classList.add("active");

            // Reset any previous scan results when switching tabs
            resetScannerState();

            // Handle Camera Lifecycle
            if (targetTab === "camera") {
                startCamera();
            } else {
                stopCamera();
            }
        });
    });
}

// Camera Controls
async function startCamera() {
    const video = document.getElementById("camera-video");
    const statusMsg = document.getElementById("camera-status-msg");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (statusMsg) statusMsg.innerText = "Camera API not supported in this browser. Please use upload.";
        return;
    }

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (video) {
            video.srcObject = cameraStream;
            video.play();
        }
        if (statusMsg) statusMsg.innerText = "Camera active. Align food plate within the frame.";
    } catch (err) {
        console.warn("Camera access denied or unavailable:", err);
        if (statusMsg) statusMsg.innerText = "Camera access unavailable. Using verified meal presets or upload.";
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

function showScanError(errorMessage) {
    showScanResultsContainer();
    const titleEl = document.getElementById("studio-plate-title");
    if (titleEl) {
        titleEl.innerHTML = `<span class="text-rose-600 font-bold flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Scan Failed: ${errorMessage}</span>`;
    }
    const statusText = document.getElementById("scanner-status-text");
    if (statusText) {
        statusText.innerHTML = `
            <div class="text-rose-600 flex items-center justify-center gap-2 mt-1">
                <span>Please ensure the food image is clear and under 15MB.</span>
                <button type="button" onclick="retakePhoto()" class="px-2.5 py-0.5 bg-slate-900 text-white rounded-md text-[10px] font-bold">Try Again</button>
            </div>
        `;
    }
    const tableContainer = document.getElementById("studio-items-table");
    if (tableContainer) {
        tableContainer.innerHTML = '<div class="py-3 text-center text-slate-400 text-xs">No food items detected. Please retake photo with good lighting.</div>';
    }
}

function snapPhoto() {
    const video = document.getElementById("camera-video");
    const statusMsg = document.getElementById("camera-status-msg");
    if (!video || !cameraStream) {
        if (statusMsg) statusMsg.innerText = "Camera not active. Please tap below to upload an image from your gallery.";
        const fileInput = document.getElementById("studio-file-input");
        if (fileInput) fileInput.click();
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
        if (!blob) return;
        const timestamp = Date.now();
        const file = new File([blob], `camera_capture_${timestamp}.jpg`, { type: "image/jpeg" });
        const blobUrl = URL.createObjectURL(blob);
        
        // Immediately wipe previous data and set up clean analyzing state with the new capture!
        prepareScanLoadingState(blobUrl);

        handlePlateUpload(file);
    }, "image/jpeg", 0.92);
}

// File Upload & Dropzone
function initDropzone() {
    const dropzone = document.getElementById("studio-dropzone");
    const fileInput = document.getElementById("studio-file-input");

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
            processSelectedFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processSelectedFile(e.target.files[0]);
        }
    });
}

function processSelectedFile(file) {
    const blobUrl = URL.createObjectURL(file);
    // Immediately wipe previous data and set up clean analyzing state with the uploaded image!
    prepareScanLoadingState(blobUrl);
    handlePlateUpload(file);
}

async function handlePlateUpload(file) {
    setScanningProgress(1); // Gemma vision
    const formData = new FormData();
    formData.append("file", file);

    try {
        setTimeout(() => setScanningProgress(2), 350); // USDA Grounding

        const response = await fetch("/api/analyze-plate", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            throw new Error(errJson.detail || `Server returned ${response.status}`);
        }

        const data = await response.json();
        setScanningProgress(3); // TabPFN sync
        setTimeout(() => {
            renderScanResult(data);
            resetStepper();
        }, 300);
    } catch (err) {
        console.error("Plate analysis API error:", err);
        showScanError(err.message || "Failed to analyze meal plate.");
    }
}

// Preset Buttons
function initPresets() {
    const chips = document.querySelectorAll(".preset-chip");
    chips.forEach(chip => {
        chip.addEventListener("click", () => {
            const type = chip.dataset.preset;
            loadPreset(type);
        });
    });
}

function loadPreset(type) {
    let previewSrc = "";
    if (type === "chicken") {
        previewSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%23d97706' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z'/%3E%3Ccircle cx='12' cy='12' r='4'/%3E%3C/svg%3E";
    } else if (type === "steak") {
        previewSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%23e11d48' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z'/%3E%3Cpath d='M8 12h8'/%3E%3C/svg%3E";
    } else {
        previewSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%23059669' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z'/%3E%3Cpath d='M19 12a7 7 0 0 0-14 0'/%3E%3Ccircle cx='12' cy='5' r='1'/%3E%3C/svg%3E";
    }

    // Immediately clear old meal data and show clean loading state
    prepareScanLoadingState(previewSrc);

    setTimeout(() => setScanningProgress(2), 300);

    setTimeout(() => {
        let result;
        if (type === "chicken") {
            result = {
                meal_name: "Grilled Chicken Breast & Jasmine Rice Macro Plate",
                total_nutrition: { calories: 512.0, protein_g: 58.6, carbs_g: 46.2, fat_g: 6.8, fiber_g: 3.0 },
                health_insights: [
                    "High protein density meal (45% calories from protein) — optimal for cutting deficits.",
                    "Low fat, clean fuel plate ideal for post-workout glycogen replenishment.",
                    "Rich in bioavailable zinc, phosphorus, and B-complex vitamins."
                ],
                items: [
                    { name: "Grilled Chicken Breast", weight_g: 180, food_group: "Poultry", nutrition: { calories: 297.0, protein_g: 55.8, carbs_g: 0, fat_g: 6.5 } },
                    { name: "Cooked White Jasmine Rice", weight_g: 160, food_group: "Grains", nutrition: { calories: 208.0, protein_g: 4.3, carbs_g: 45.1, fat_g: 0.5 } },
                    { name: "Steamed Organic Broccoli", weight_g: 90, food_group: "Vegetables", nutrition: { calories: 31.5, protein_g: 2.2, carbs_g: 6.5, fat_g: 0.4 } }
                ],
                inference_source: "Gemma 2 Multimodal + USDA Grounding"
            };
        } else if (type === "steak") {
            result = {
                meal_name: "Sirloin Steak, Hass Avocado & Brown Rice Power Plate",
                total_nutrition: { calories: 735.0, protein_g: 52.4, carbs_g: 42.0, fat_g: 38.6, fiber_g: 8.5 },
                health_insights: [
                    "High micronutrient and healthy fat profile supporting natural hormonal synthesis.",
                    "Substantial meal volume with 8.5g dietary fiber. Great for sustained fullness across intermittent fasts.",
                    "Abundant in bioavailable heme iron, creatine, and potassium."
                ],
                items: [
                    { name: "Pan-Seared Sirloin Steak", weight_g: 170, food_group: "Meat", nutrition: { calories: 368.9, protein_g: 44.4, carbs_g: 0, fat_g: 20.1 } },
                    { name: "Cooked Brown Rice", weight_g: 140, food_group: "Grains", nutrition: { calories: 156.8, protein_g: 3.6, carbs_g: 32.9, fat_g: 1.3 } },
                    { name: "Fresh Hass Avocado (Sliced)", weight_g: 75, food_group: "Healthy Fats", nutrition: { calories: 120.0, protein_g: 1.5, carbs_g: 6.4, fat_g: 11.0 } }
                ],
                inference_source: "Gemma 2 Multimodal + USDA Grounding"
            };
        } else {
            result = {
                meal_name: "Pan-Seared Salmon & Sweet Potato Fuel Plate",
                total_nutrition: { calories: 645.0, protein_g: 48.2, carbs_g: 58.5, fat_g: 22.4, fiber_g: 7.2 },
                health_insights: [
                    "High protein density meal (>30% calories from protein) — optimal for lean muscle preservation.",
                    "Rich in Omega-3 fatty acids (EPA/DHA) and complex slow-digesting carbohydrates.",
                    "Excellent dietary fiber (7.2g) helps blunt glycemic spike and sustains energy."
                ],
                items: [
                    { name: "Pan-Seared Atlantic Salmon", weight_g: 185, food_group: "Seafood", nutrition: { calories: 384.8, protein_g: 37.7, carbs_g: 0, fat_g: 24.8 } },
                    { name: "Baked Japanese Sweet Potato", weight_g: 200, food_group: "Vegetables & Roots", nutrition: { calories: 180.0, protein_g: 4.0, carbs_g: 41.4, fat_g: 0.4 } },
                    { name: "Sautéed Fresh Asparagus", weight_g: 80, food_group: "Vegetables & Greens", nutrition: { calories: 17.6, protein_g: 1.9, carbs_g: 3.3, fat_g: 0.2 } }
                ],
                inference_source: "Gemma 2 Multimodal + USDA Grounding"
            };
        }

        setScanningProgress(3);
        renderScanResult(result);
        resetStepper();
    }, 500);
}

// Visual Stepper States
function setScanningProgress(step) {
    const s1 = document.getElementById("step-1");
    const s2 = document.getElementById("step-2");
    const s3 = document.getElementById("step-3");
    const statusText = document.getElementById("scanner-status-text");

    if (step === 1) {
        if (s1) { s1.classList.add("active"); s1.classList.remove("completed"); }
        if (s2) { s2.classList.remove("active", "completed"); }
        if (s3) { s3.classList.remove("active", "completed"); }
        if (statusText) statusText.innerText = "Step 1/3: Gemma 2 segmenting plate geometry & estimating gram volume...";
    } else if (step === 2) {
        if (s1) { s1.classList.remove("active"); s1.classList.add("completed"); }
        if (s2) { s2.classList.add("active"); s2.classList.remove("completed"); }
        if (s3) { s3.classList.remove("active", "completed"); }
        if (statusText) statusText.innerText = "Step 2/3: Querying USDA FoodData Central deterministic database...";
    } else if (step === 3) {
        if (s1) s1.classList.add("completed");
        if (s2) s2.classList.add("completed");
        if (s3) { s3.classList.add("active"); }
        if (statusText) statusText.innerText = "Step 3/3: Synchronizing with TabPFN in-context metabolic trajectory...";
    }
}

function resetStepper() {
    const statusText = document.getElementById("scanner-status-text");
    const s3 = document.getElementById("step-3");
    if (s3) {
        s3.classList.remove("active");
        s3.classList.add("completed");
    }
    if (statusText) statusText.innerText = "Plate analysis complete · 100% Deterministic Grounding Verified";
}

// Render Results (Cal AI Screenshot 3)
function renderScanResult(data) {
    showScanResultsContainer();
    const titleEl = document.getElementById("studio-plate-title");
    if (titleEl) titleEl.innerText = data.meal_name;

    // Cache base nutrition for portion multiplier
    basePlateNutrition = {
        calories: data.total_nutrition.calories,
        protein_g: data.total_nutrition.protein_g,
        carbs_g: data.total_nutrition.carbs_g,
        fat_g: data.total_nutrition.fat_g,
        fiber_g: data.total_nutrition.fiber_g || 4.0
    };
    currentPortionMultiplier = 1.0;
    const stepperVal = document.getElementById("portion-multiplier-val");
    if (stepperVal) stepperVal.innerText = "1";

    const calEl = document.getElementById("macro-calories");
    const protEl = document.getElementById("macro-protein");
    const carbEl = document.getElementById("macro-carbs");
    const fatEl = document.getElementById("macro-fat");

    if (calEl) calEl.innerText = Math.round(data.total_nutrition.calories);
    if (protEl) protEl.innerText = Math.round(data.total_nutrition.protein_g) + "g";
    if (carbEl) carbEl.innerText = Math.round(data.total_nutrition.carbs_g) + "g";
    if (fatEl) fatEl.innerText = Math.round(data.total_nutrition.fat_g) + "g";

    // Update global state
    currentPlateData.meal_name = data.meal_name;
    currentPlateData.calories = data.total_nutrition.calories;
    currentPlateData.protein_g = data.total_nutrition.protein_g;
    currentPlateData.carbs_g = data.total_nutrition.carbs_g;
    currentPlateData.fat_g = data.total_nutrition.fat_g;
    currentPlateData.fiber_g = data.total_nutrition.fiber_g || 4.0;

    // Render Food items table
    const container = document.getElementById("studio-items-table");
    if (container) {
        container.innerHTML = "";
        data.items.forEach(item => {
            const row = document.createElement("div");
            row.className = "py-2.5 flex items-center justify-between";
            row.innerHTML = `
                <div>
                    <div class="font-bold text-slate-800">${item.name}</div>
                    <div class="text-[10px] text-slate-400">${item.weight_g}g • ${item.food_group} (USDA Grounded)</div>
                </div>
                <div class="text-right">
                    <div class="font-black text-slate-800">${Math.round(item.nutrition.calories)} kcal</div>
                    <div class="text-[10px] text-slate-500">${Math.round(item.nutrition.protein_g)}g P / ${Math.round(item.nutrition.carbs_g)}g C / ${Math.round(item.nutrition.fat_g)}g F</div>
                </div>
            `;
            container.appendChild(row);
        });
    }

    // Render Insights
    const insightsBox = document.getElementById("studio-insights-container");
    if (insightsBox) {
        insightsBox.innerHTML = "";
        data.health_insights.forEach(insight => {
            const pill = document.createElement("div");
            pill.className = "p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 flex items-start gap-2";
            pill.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5 flex-shrink-0 text-emerald-600"><polyline points="20 6 9 17 4 12"/></svg><span>${insight}</span>`;
            insightsBox.appendChild(pill);
        });
    }
}

// TabPFN Metabolic Forecast & Chart
let cachedTrajectoryData = null;
let isForecastLoading = false;

async function loadMetabolicForecast(caloriesTarget) {
    const loader = document.getElementById("trajectory-chart-loader");
    if (loader) {
        loader.style.display = "flex";
        loader.innerHTML = `
            <div class="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2"></div>
            <span class="text-xs font-semibold text-slate-500">Forecasting TabPFN Trajectory...</span>
        `;
    }
    isForecastLoading = true;

    try {
        const profile = getUserProfile();
        const weightLbs = Number(profile.weight_lbs) || 165;
        const targetKg = +(weightLbs * 0.45359237).toFixed(1);
        const targetCals = caloriesTarget || profile.daily_calories || 2100;

        const response = await fetch(`/api/metabolic-forecast?friend_name=Dave&target_weight_kg=${targetKg}&daily_calories_target=${targetCals}`);
        if (!response.ok) throw new Error("Forecast request failed");
        const data = await response.json();

        // Update TDEE cards (both mobile and widescreen desktop IDs)
        const dynamicEl = document.getElementById("dynamic-tdee-val");
        const staticEl = document.getElementById("static-tdee-val");
        const dynamicDesktopEl = document.getElementById("dynamic-tdee-val-desktop");
        const staticDesktopEl = document.getElementById("static-tdee-val-desktop");

        if (dynamicEl) dynamicEl.innerText = data.insights.dynamic_tdee_kcal + " kcal";
        if (staticEl) staticEl.innerText = data.insights.static_formula_tdee_kcal + " kcal";
        if (dynamicDesktopEl) dynamicDesktopEl.innerText = data.insights.dynamic_tdee_kcal + " kcal";
        if (staticDesktopEl) staticDesktopEl.innerText = data.insights.static_formula_tdee_kcal + " kcal";

        currentPlateData.days_to_goal = data.insights.projected_days_to_goal;
        currentPlateData.daily_budget = parseInt(caloriesTarget);

        cachedTrajectoryData = {
            trajectory: data.trajectory,
            currentWeight: data.current_weight_kg,
            targetWeight: data.target_weight_kg
        };
        window.cachedTrajectoryData = cachedTrajectoryData;

        // Render Chart.js Trajectory
        renderWeightChart(data.trajectory, data.current_weight_kg, data.target_weight_kg);
    } catch (err) {
        console.error("Error loading metabolic forecast:", err);
        if (loader) {
            loader.style.display = "flex";
            loader.innerHTML = `
                <div class="text-center p-3">
                    <span class="text-xs text-rose-500 font-semibold block mb-2">Failed to load metabolic forecast</span>
                    <button type="button" onclick="loadMetabolicForecast(${caloriesTarget})" class="text-[11px] px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors">Retry</button>
                </div>
            `;
        }
    } finally {
        isForecastLoading = false;
        if (loader && !loader.querySelector("button")) {
            loader.style.display = "none";
        }
    }
}

function initSlider() {
    const slider = document.getElementById("calories-slider");
    const display = document.getElementById("slider-calories-display");

    if (!slider) return;

    slider.addEventListener("input", (e) => {
        const val = e.target.value;
        if (display) display.innerText = val + " kcal/day";
    });

    slider.addEventListener("change", (e) => {
        loadMetabolicForecast(e.target.value);
    });
}

function renderWeightChart(trajectory, currentWeight, targetWeight) {
    const ctx = document.getElementById("trajectoryChart");
    if (!ctx) return;

    if (typeof Chart === "undefined") {
        console.warn("Chart.js is not loaded yet");
        return;
    }

    const loader = document.getElementById("trajectory-chart-loader");
    if (loader) loader.style.display = "none";

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
            // Fallback for custom array structures
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
    // Dynamic Y-axis scale to emphasize progress without flattening bars
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

    window.weightChart = weightChart;
}

window.renderWeightChart = renderWeightChart;
window.loadMetabolicForecast = loadMetabolicForecast;

// ElevenLabs Coach Voice Debrief
async function playStudioCoachDebrief() {
    const btn = document.getElementById("studio-coach-btn");
    const transcriptBox = document.getElementById("studio-coach-transcript");

    if (!btn) return;
    const originalBtnContent = btn.innerHTML;
    btn.innerHTML = `<svg class="animate-spin w-4 h-4 text-white inline-block mr-1.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25"/><path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" class="opacity-75"/></svg><span>Synthesizing Debrief...</span>`;
    btn.disabled = true;

    try {
        const profile = getUserProfile();
        const history = JSON.parse(localStorage.getItem("opencal_meal_history") || "[]");
        let mealName = currentPlateData.meal_name;
        let cals = currentPlateData.calories;
        let prot = currentPlateData.protein_g;

        // If no active scanned plate, debrief on latest logged meal or profile goals
        if (!mealName || mealName === "Ready to scan food plate" || mealName.includes("Analyzing")) {
            if (history.length > 0) {
                const latest = history[history.length - 1];
                mealName = latest.meal_name;
                cals = latest.calories;
                prot = latest.protein_g;
            } else {
                mealName = "Daily Metabolic Nutrition";
                cals = profile.daily_calories || 2100;
                prot = profile.target_protein || 150;
            }
        }

        const weightLbs = Number(profile.weight_lbs) || 165;
        const weightKg = +(weightLbs * 0.45359237).toFixed(1);

        const response = await fetch("/api/coach-debrief", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                friend_name: "Dave",
                meal_name: mealName,
                calories: Number(cals) || 600,
                protein_g: Number(prot) || 45,
                days_to_goal: currentPlateData.days_to_goal || 22,
                target_weight: weightKg
            })
        });

        if (!response.ok) {
            throw new Error(`Coach debrief error (${response.status})`);
        }

        const data = await response.json();
        if (transcriptBox) {
            transcriptBox.innerText = `"${data.text}"`;
            transcriptBox.style.display = "block";
        }

        if (data.audio_base64) {
            const audio = new Audio("data:audio/mp3;base64," + data.audio_base64);
            audio.play();
            btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" class="inline-block mr-1.5"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg><span>Playing Audio Coach...</span>`;
            audio.onended = () => {
                btn.innerHTML = originalBtnContent;
                btn.disabled = false;
            };
        } else if ("speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance(data.text);
            utterance.rate = 1.05;
            window.speechSynthesis.speak(utterance);
            btn.innerHTML = `<span>Speaking (Browser Speech)...</span>`;
            utterance.onend = () => {
                btn.innerHTML = originalBtnContent;
                btn.disabled = false;
            };
        }
    } catch (err) {
        console.error("Coach error:", err);
        btn.innerHTML = originalBtnContent;
        btn.disabled = false;
    }
}

// Global Window Exports
window.snapPhoto = snapPhoto;
window.playStudioCoachDebrief = playStudioCoachDebrief;
window.loadPreset = loadPreset;
window.openScannerModal = openScannerModal;
window.closeScannerModal = closeScannerModal;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.adjustPortion = adjustPortion;
window.confirmPlateAndLog = confirmPlateAndLog;
window.showScanRetry = showScanRetry;
window.retakePhoto = retakePhoto;
window.selectSex = selectSex;
window.selectGoal = selectGoal;
window.selectActivity = selectActivity;
window.completeOnboarding = completeOnboarding;
window.skipOnboardingToHome = skipOnboardingToHome;
window.openOnboardingFromSettings = openOnboardingFromSettings;
window.updateHomeScreen = updateHomeScreen;
window.addWater = addWater;
window.selectCalendarDay = selectCalendarDay;
window.buildCalendarStrip = buildCalendarStrip;

function updateOnboardKg(val) {
    const kgEl = document.getElementById("onboard-weight-kg");
    if (kgEl) {
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0) {
            kgEl.innerText = `≈ ${(num * 0.45359237).toFixed(1)} kg`;
        } else {
            kgEl.innerText = "";
        }
    }
}
window.populateDobOptions = populateDobOptions;
window.populateOnboardingFieldsFromProfile = populateOnboardingFieldsFromProfile;
window.updateOnboardKg = updateOnboardKg;
