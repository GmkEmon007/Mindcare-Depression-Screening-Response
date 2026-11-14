# MindCare — Student Wellbeing Research Platform

> **Center for Interdisciplinary Research (CIR), Varendra University**  
> **Institutional Research Ethics Clearance:** `Protocol #VU/ERC/2026/042`  
> **Research Study:** *An Explainable Machine Learning Framework for Context-Aware Depression Screening and Personalized Student Support among University Students in Bangladesh*

---

### 🌐 Live Platform Preview
**GitHub Pages:** [https://gmkemon007.github.io/Mindcare-Depression-Screening-Response/](https://gmkemon007.github.io/Mindcare-Depression-Screening-Response/)

---

## 🌿 Overview

**MindCare** is a clinical depression screening and student wellbeing research platform designed to combine institutional academic authority with the reassuring dignity of modern healthcare spaces. Built with semantic **HTML5**, modern **Tailwind CSS / CSS3**, and high-performance **vanilla JavaScript**.

---

## 🎨 Clinical Sanctuary Design Tokens

| Role | Token Name | Hex Code | Purpose |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | Airy Porcelain Ivory | `#F8FAF7` | Soothing, bright backdrop with zero clinical glare |
| **Card Surface** | Pure Floating White | `#FFFFFF` | Crisp, elevated floating cards for cognitive clarity and breathing room |
| **Primary Headings & Body** | Deep Midnight Forest Slate | `#152418` | High-contrast, photophobia-friendly, WCAG 2.1 AAA legible typography |
| **Jewel Accent (CTAs & Active)** | MindCare Healing Emerald | `#2D6A4F` | Dignified jewel tone for selected states, progress, and primary CTAs |
| **Soft Celadon Tint** | Pale Celadon Mist | `#EAF2EC` | Gentle non-alarmist pill highlights and badge backgrounds |
| **Borders & Dividers** | Razor-thin Whisper Border | `#E2E8DF` | Whisper-soft, organic boundaries eliminating harsh contrast lines |

---

## 📁 File Structure

```
Mindcare-Depression-Screening-Response/
├── index.html        # Complete questionnaire structure with bilingual Bengali & English typography
├── style.css         # Clinical sanctuary color system, mobile typography, and animations
├── script.js         # Real-time PHQ-9 & MSPSS scoring engine, validation, and submission
├── animations.js     # Atmospheric botanical particles, 2D/3D breathing orb, and micro-physics
├── env/
│   └── env.js        # Google Sheets webhook configuration
└── README.md         # Documentation and research protocol overview
```

---

## 🧠 Clinical Modules & Instruments (All 54 Checkpoints)

1. **Module A — Demographic & Background Information (A1–A7):** Age, Height, Weight, Sex, University Type, Living Arrangements, and Academic Year/Semester.
2. **Module B — PHQ-9 Mental Wellbeing Screening (B1–B9):** Validated 9-item Patient Health Questionnaire scored dynamically from `0` to `27` with automatic clinical severity stratification:
   - `0–4`: Minimal (স্বাভাবিক / ন্যূনতম)
   - `5–9`: Mild (মৃদু বিষণ্ণতা)
   - `10–14`: Moderate (মাঝারি বিষণ্ণতা)
   - `15–19`: Moderately Severe (উচ্চ-মাঝারি বিষণ্ণতা)
   - `20–27`: Severe (তীব্র বিষণ্ণতা)
3. **Module C — Academic Experience & Study Environment (C1–C8):** 5-point Likert scale assessing workload, examination pressure, and academic satisfaction.
4. **Module D — Future Outlook & AI Sentiment (D1–D4):** Career certainty, economic anxiety, and perceptions of generative AI impact.
5. **Module E — Rest, Sleep & Vitality (E1–E8):** Sleep schedules, physical exercise, screen time, nutrition, and health history.
6. **Module F — Multidimensional Scale of Perceived Social Support (MSPSS, F1–F12):** 7-point scale measuring support from Significant Others, Family, and Friends.
7. **Module G — Living Environment, Earth & Hearth (G1–G6):** Critical life events, family income, financial stress, and study environment quality.

---

## 🛡️ Privacy & Cryptographic Hash Anonymization

- **Client-Side Hashing:** Every submission generates an irreversible unique research token (e.g. `VU-7a8b9c0d`).
- **Zero PII:** No student names, roll numbers, IP addresses, or contact information are collected or stored.
- **Institutional Ethics:** Conducted under Center for Interdisciplinary Research (CIR) Protocol **VU/ERC/2026/042**.
