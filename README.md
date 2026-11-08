# Context-Aware Depression Screening Response

> **Center for Interdisciplinary Research (CIR), Varendra University**  
> **Institutional Research Ethics Clearance:** `Protocol #VU/ERC/2026/042`  
> **Thesis:** *An Explainable Machine Learning Framework for Context-Aware Depression Screening and Personalized Student Support among University Students in Bangladesh*

---
### Githuh page: https://gmkemon007.github.io/Depression-Screening-Response/

## 🏛️ Overview-

This web platform implements the **Warm Terracotta Sanctuary** UI/UX design in Figma then convert into a production-grade, highly responsive, accessible, and interactive clinical screening interface using semantic **HTML5**, modern **CSS3**, and **vanilla JavaScript**.

The aesthetic integrates the academic rigor of an institutional research publication with the warm, reassuring dignity of biophilic healthcare spaces.

---

## 📁 File Structure

```
final q/
├── index.html        # Complete questionnaire structure with bilingual Bengali & English typography
├── style.css         # Warm terracotta color system, pebble micro-interactions, animations, and modal styling
├── script.js         # Real-time PHQ-9 scoring engine, Web Audio soundscape, scroll-spy, and local storage
└── README.md         # Documentation and research protocol overview
```

---

## 🎨 Design System: Serene Oasis (Clinical Trust & Emotional Stability)

- **Canvas Background (#F8FAFC - Soft Cloud Gray):** Airy, clean, modern canvas that eliminates visual clutter and clinical glare.
- **Card Surface (#FFFFFF Pure White) & Borders (#E2E8F0 Slate Mist):** Crisp contrast and subtle separation reducing cognitive fatigue.
- **Primary Calm Anchor (#2B6CB0 Coastal Slate Blue):** Clinically trusted tone that lowers anxiety, promotes focus, and anchors interaction.
- **Warm Accent (#E08738 Soft Golden Apricot):** Gentle optimism and clear visual hierarchy for progress and action items.
- **Typography (#0F172A Deep Midnight Slate & #64748B Cool Slate):** High-contrast, photophobia-friendly typography for bilingual legibility (strictly exceeding WCAG 2.1 AAA ratios).
- **Typography Families:**
  - Fraunces & Noto Serif Bengali for serene editorial titles, quotes, and research headings.
  - Outfit & Plus Jakarta Sans for clean, readable form controls and numerical metrics.
  - Material Symbols Outlined for mindful and clinical iconography.

---

## 🧠 Clinical Modules & Instruments (All 54 Checkpoints)

1. **Module A — Demographic & Background Information (A1–A7):** Age, Height, Weight, Sex, University Type, Living Arrangements, and Academic Year/Semester.
2. **Module B — PHQ-9 Mindful Self-Inquiry (B1–B9):** Validated 9-item Patient Health Questionnaire scored dynamically from `0` to `27` with automatic clinical severity stratification:
   - `0–4`: Minimal (স্বাভাবিক / ন্যূনতম)
   - `5–9`: Mild (মৃদু বিষণ্ণতা)
   - `10–14`: Moderate (মাঝারি বিষণ্ণতা)
   - `15–19`: Moderately Severe (উচ্চ-মাঝারি বিষণ্ণতা)
   - `20–27`: Severe (তীব্র বিষণ্ণতা)
3. **Module C — Academic Rhythms & CGPA Anxiety (C1–C8):** 5-point Likert scale measuring workload, examination stress, and academic satisfaction.
4. **Module D — Future Horizons & AI Disruption (D1–D4):** Career certainty, economic anxiety, and perceptions of generative AI impact.
5. **Module E — Health & Lifestyle Rhythms (E1–E8):** Sleep schedules, physical exercise, screen time, nutrition, and health history.
6. **Module F — Multidimensional Scale of Perceived Social Support (MSPSS, F1–F12):** 7-point scale measuring support from Significant Others, Family, and Friends.
7. **Module G — Environmental & Financial Stressors (G1–G6):** Critical life events, family income, financial stress, and study environment conditions.

---

## ⚡ UI/UX & Interactive Engine Enhancements

- **Real-Time Progress Tracking:** Sticky slim top progress bar with dynamic checkpoint completion percentages.
- **Smart "Next Unanswered" Navigation:** Instantly scrolls to and pulses the next unanswered question.
- **Tactile Pebble Micro-Interactions:** Haptic-feel radial ripple effect and active espresso elevation.
- **Live Scoring Guide Linking:** Selecting a rating momentarily highlights the corresponding Likert scale column in the header guide.
- **Floating Zen Session HUD:** Non-intrusive desktop pill featuring real-time PHQ-9 score, soundscape toggle, quick review, and scroll-to-top controls.
- **Synthesized Ambient Soundscape:** Clickable courtyard rain soundscape generated via vanilla browser **Web Audio API** (432Hz harmonic drone + filtered pink noise with smooth exponential gain fading).
- **Comprehensive Reflection Dashboard:**
  - Visual PHQ-9 severity gauge meter.
  - Perceived Social Support 3-subscale visual breakdown bars (Significant Other, Family, Friends).
  - Cryptographic token generation (`VU-[hex]`) with one-click clipboard copy.
  - JSON data export for researchers.
  - 24/7 Bangladesh crisis support contacts (*Kaan Pete Roi: +8801779554391*, *National Health Center: 16263*).
- **Accessibility (WCAG 2.1 AA):** Full keyboard navigation (Arrow keys, Space/Enter, Tab), proper `role="radiogroup"` / `role="radio"`, and `aria-checked` states.
- **Session Auto-Save:** Automatically persists selections and inputs in browser `localStorage`.

---

## 🚀 How to Run

1. Open `index.html` directly in any modern web browser (Chrome, Edge, Firefox, Safari).
2. Or serve locally with any HTTP server:
   ```powershell
   python -m http.server 8000
   ```
   Then navigate to `http://localhost:8000`.
