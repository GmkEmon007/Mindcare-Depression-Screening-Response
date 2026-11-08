# MindCare — Student Wellbeing Research

> **Center for Interdisciplinary Research (CIR), Varendra University**  
> **Institutional Research Ethics Clearance:** `Protocol #VU/ERC/2026/042`  
> **Research Study:** *An Explainable Machine Learning Framework for Context-Aware Depression Screening and Personalized Student Support among University Students in Bangladesh*

---

### 🌐 Live Platform Preview
**GitHub Pages:** [https://gmkemon007.github.io/Depression-Screening-Response/](https://gmkemon007.github.io/Depression-Screening-Response/)

---

## 🌿 Overview

**MindCare** is a compassionate, evidence-based depression screening web platform designed to eliminate participant anxiety and cognitive fatigue. Built with semantic **HTML5**, modern **Tailwind CSS / CSS3**, and high-performance **vanilla JavaScript**, MindCare translates clinical mental health research into an accessible, warm, and restorative experience for university students.

The design faithfully implements the 3 primary design views:
1. **Screen 1 (Mindful Hero Portal):** Reassuring hero welcoming students with the core message *"You deserve to be heard."*, 3 confidentiality trust pills, 432Hz ambient soundscape toggle, and comforting nature illustration.
2. **Screen 2 (Stepped Questionnaire Flow):** Modular 7-step progressive screening (`Step X of 7`) with real-time percentage tracking, soft celadon question containers (`#EEF2E8`), and tactile circular radio indicators.
3. **Screen 3 (Thank You & Support Dashboard):** Warm post-submission celebration featuring the signature green heart badge, instant access to emergency helplines (16363, Kaan Pete Roi), campus counseling cell connections, and an expandable clinical PHQ-9 & MSPSS breakdown.

---

## 🎨 MindCare Design System Tokens

| Role | Token Name | Hex Code | Visual & Psychological Purpose |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | Soft Sage Mist | `#F4F7F2` | Soothing, airy, nature-tinted backdrop; eliminates clinical white glare |
| **Section Surface** | Pure White | `#FFFFFF` | Crisp, elevated floating cards for cognitive clarity |
| **Question Card** | Soft Celadon Mint | `#EEF2E8` | Enclosed, comforting containers for question prompts matching Screen 2 |
| **Primary Headings & CTAs** | Deep Forest Slate | `#243725` | Grounding, high-contrast, photophobia-friendly typography |
| **Vibrant Accent** | MindCare Healing Green | `#3E7245` | Uplifting highlight tone for *"heard."*, active rings, and progress fills |
| **Borders & Dividers** | Botanical Sand & Mint | `#D8E3D5` / `#CBDAC8` | Whisper-soft, organic boundaries without rigid harshness |

---

## 📁 Project Structure

```
final q/
├── index.html                           # MindCare HTML layout with 3 design views & bilingual Bengali/English
├── style.css                            # Stepped flow animations, pebble radio pills, and custom variables
├── script.js                            # Stepper navigation, PHQ-9 scoring, 432Hz synthesizer, and Google Sheet sync
├── assets/
│   ├── mindcare-hero-illustration.jpg   # Screen 1 Hero character illustration with doodle heart
│   ├── thank-you-heart.jpg              # Screen 3 Green heart with checkmark badge
│   ├── mindcare-logo-mark.jpg           # MindCare lotus logo mark
│   └── design-reference.jpg             # Full 3-screen reference design image
└── README.md                            # Documentation and research protocol overview
```

---

## 🧠 Clinical Modules & Instruments (54 Total Items)

1. **Module A — Demographic & Background Information (A1–A7):** Age, Height, Weight, Sex, University Type, Living Arrangements, Academic Year and Semester.
2. **Module B — PHQ-9 Mental Wellbeing Screening (B1–B9):** Validated 9-item Patient Health Questionnaire scored dynamically from `0` to `27` with automatic clinical severity stratification:
   - `0–4`: Minimal (স্বাভাবিক / ন্যূনতম)
   - `5–9`: Mild (মৃদু বিষণ্ণতা)
   - `10–14`: Moderate (মাঝারি বিষণ্ণতা)
   - `15–19`: Moderately Severe (উচ্চ-মাঝারি বিষণ্ণতা)
   - `20–27`: Severe (তীব্র বিষণ্ণতা)
3. **Module C — Academic Experience & Study Environment (C1–C8):** 5-point Likert scale assessing workload, examination pressure, and academic satisfaction.
4. **Module D — Future Outlook & AI Sentiment (D1–D4):** Career certainty, economic anxiety, and perceptions of generative AI impact.
5. **Module E — Rest, Sleep & Vitality (E1–E8):** Sleep schedules, physical exercise, screen time, nutrition, and health history.
6. **Module F — Social Support (MSPSS, F1–F12):** Multidimensional Scale of Perceived Social Support with subscales for Significant Others, Family, and Friends.
7. **Module G — Living Environment, Earth & Hearth (G1–G6):** Critical life events, family income, financial stress, and study environment quality.

---

## 🛡️ Privacy & Cryptographic Hash Anonymization

- **Client-Side Hashing:** Every submission generates an irreversible unique research token (e.g. `VU-7a8b9c0d`).
- **Zero PII:** No student names, roll numbers, IP addresses, or contact information are collected or stored.
- **Institutional Ethics:** Conducted under Center for Interdisciplinary Research (CIR) Protocol **VU/ERC/2026/042**.
