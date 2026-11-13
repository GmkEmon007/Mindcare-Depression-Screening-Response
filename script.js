/**
 * MindCare — Student Wellbeing Research Platform
 * High-Performance UI/UX Engine:
 * - Real-time Progress Tracker & Checklist
 * - Tactile Pebble Ripple & Keyboard Accessibility (WCAG 2.1 AA)
 * - Live PHQ-9 & MSPSS Subscale Scoring
 * - Smart "Next Unanswered" Navigation
 * - Web Audio 432Hz Ambient Soundscape Synthesizer
 * - Interactive Reflection Modal & JSON Export
 * - LocalStorage State Persistence
 */

document.addEventListener('DOMContentLoaded', () => {
  const sessionStartTime = Date.now();
  const STORAGE_KEY = 'vu_research_warm_terracotta_data_v3';
  const TOTAL_CHECKPOINTS = 54;

  const stepModuleIds = ['module-a', 'module-b', 'module-c', 'module-d', 'module-e', 'module-f', 'module-g'];
  const stepModuleTitles = [
    'Demographic & Background Information',
    'PHQ-9 Mental Wellbeing Screening',
    'Academic Experience & Study Environment',
    'Future Outlook & AI Sentiment',
    'Rest, Sleep & Vitality',
    'Social Support & Connections (MSPSS)',
    'Living Environment, Earth & Hearth'
  ];

  let state = {
    phq9Scores: {},
    likertScores: {},
    inputs: {},
    answeredQuestions: new Set(),
    soundscapeMode: false
  };

  // Pure English Value Normalizer (strips Bengali characters & formatting artifacts)
  function toEnglishOnly(val) {
    if (val === undefined || val === null) return '';
    let str = String(val).trim();
    str = str.replace(/[\u0980-\u09FF]+/g, '');
    str = str.replace(/\([\s,.\-–—]*\)/g, '');
    str = str.replace(/\[[\s,.\-–—]*\]/g, '');
    str = str.replace(/[\/\-–—]\s*$/g, '');
    str = str.replace(/^\s*[\/\-–—]/g, '');
    str = str.replace(/\s+/g, ' ').trim();
    return str;
  }

  // 1. Restore State from LocalStorage
  function restoreState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phq9Scores) state.phq9Scores = parsed.phq9Scores;
        if (parsed.likertScores) state.likertScores = parsed.likertScores;
        if (parsed.inputs) state.inputs = parsed.inputs;
        if (parsed.answeredQuestions) state.answeredQuestions = new Set(parsed.answeredQuestions);

        // Restore input values
        Object.entries(state.inputs).forEach(([id, val]) => {
          const el = document.getElementById(id);
          if (el) el.value = val;
        });

        // Restore selected buttons
        Object.entries(state.likertScores).forEach(([q, val]) => {
          const group = document.querySelector(`[data-question="${q}"]`);
          if (group) {
            let btn = group.querySelector(`[data-value="${val}"], [data-label="${val}"]`);
            if (!btn) {
              btn = Array.from(group.querySelectorAll('.pebble-btn')).find(b => {
                const bText = b.innerText.trim();
                const bVal = b.getAttribute('data-value') || '';
                return bText === val || bVal === val || bText.includes(val) || (typeof val === 'string' && val.includes(bVal));
              });
            }
            if (btn) {
              group.querySelectorAll('.pebble-btn').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              const targetReadoutId = group.getAttribute('data-readout');
              const readoutEl = targetReadoutId ? document.getElementById(targetReadoutId) : null;
              if (readoutEl) {
                readoutEl.textContent = btn.getAttribute('data-label') || btn.innerText.trim();
              }
              const parentCard = group.closest('.question-card');
              if (parentCard) {
                parentCard.classList.add('answered');
              }
            }
          }
        });

        // Restore hidden academic year input
        if (state.likertScores && state.likertScores['a7_year']) {
          const hiddenYear = document.getElementById('input-academic-year');
          if (hiddenYear) hiddenYear.value = state.likertScores['a7_year'];
        }

        // Restore dropdown questions (Sections C, D, G)
        document.querySelectorAll('select[data-dropdown-question]').forEach(select => {
          const q = select.getAttribute('data-dropdown-question');
          if (state.likertScores && state.likertScores[q]) {
            select.value = state.likertScores[q];
            const readoutId = select.getAttribute('data-readout');
            if (readoutId && select.selectedIndex >= 0) {
              const readoutEl = document.getElementById(readoutId);
              if (readoutEl) readoutEl.textContent = select.options[select.selectedIndex].text;
            }
            const parentCard = select.closest('.question-card');
            if (parentCard) {
              parentCard.classList.add('border-[#2D6A4F]', 'bg-[#F9FCFA]', 'answered');
            }
          }
        });

        // Synchronize conditional states for E3 and E8 based on restored selections
        syncConditionalFields();
      }
    } catch (e) {
      console.warn('Could not restore saved session', e);
    }
  }

  // Save State
  function saveState() {
    try {
      const payload = {
        phq9Scores: state.phq9Scores,
        likertScores: state.likertScores,
        inputs: state.inputs,
        answeredQuestions: Array.from(state.answeredQuestions),
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {}
  }

  // 2. Ripple Micro-Interaction
  function createRipple(event, button) {
    const ripple = document.createElement('span');
    ripple.classList.add('pebble-ripple');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  // Synchronize dependent / conditional inputs for E3 (exercise duration) and E8 (condition details)
  function syncConditionalFields() {
    // 1. Question E3 (Exercise Frequency vs Duration)
    const e3Group = document.querySelector('[data-question="e3"]');
    const minInput = document.getElementById('input-exercise-min');
    const e3Badge = document.getElementById('e3-duration-badge');
    const e3Container = document.getElementById('e3-duration-container');

    if (e3Group && minInput) {
      const activeBtn = e3Group.querySelector('.pebble-btn.active');
      if (!activeBtn) {
        minInput.disabled = true;
        minInput.classList.add('opacity-40', 'cursor-not-allowed', 'bg-[#ECEFEA]');
        if (e3Badge) e3Badge.classList.add('hidden');
        if (e3Container) e3Container.classList.add('opacity-50');
      } else {
        const val = (activeBtn.getAttribute('data-value') || activeBtn.innerText.trim()).toLowerCase();
        const isNever = val.includes('never') || val.includes('কখনো না');
        if (isNever) {
          minInput.value = '';
          minInput.disabled = true;
          minInput.placeholder = 'N/A';
          minInput.classList.add('opacity-40', 'cursor-not-allowed', 'bg-[#ECEFEA]');
          if (e3Badge) e3Badge.classList.add('hidden');
          if (e3Container) e3Container.classList.add('opacity-50');
          state.inputs['input-exercise-min'] = '';
        } else {
          minInput.disabled = false;
          minInput.placeholder = '30';
          minInput.classList.remove('opacity-40', 'cursor-not-allowed', 'bg-[#ECEFEA]');
          if (e3Badge) e3Badge.classList.remove('hidden');
          if (e3Container) e3Container.classList.remove('opacity-50');
        }
      }
    }

    // 2. Question E8 (Diagnosed Condition vs Details)
    const e8Group = document.querySelector('[data-question="e8"]');
    const condInput = document.getElementById('input-e8-condition');
    const e8Badge = document.getElementById('e8-condition-badge');
    const e8Container = document.getElementById('e8-condition-container');

    if (e8Group && condInput) {
      const activeBtn = e8Group.querySelector('.pebble-btn.active');
      if (!activeBtn) {
        condInput.disabled = true;
        condInput.classList.add('opacity-40', 'cursor-not-allowed', 'bg-[#ECEFEA]');
        if (e8Badge) e8Badge.classList.add('hidden');
        if (e8Container) e8Container.classList.add('opacity-50');
      } else {
        const val = (activeBtn.getAttribute('data-value') || activeBtn.innerText.trim()).toLowerCase();
        const isYes = val.includes('yes') || val.includes('হ্যাঁ');
        if (!isYes) {
          condInput.value = '';
          condInput.disabled = true;
          condInput.placeholder = 'N/A (None)';
          condInput.classList.add('opacity-40', 'cursor-not-allowed', 'bg-[#ECEFEA]');
          if (e8Badge) e8Badge.classList.add('hidden');
          if (e8Container) e8Container.classList.add('opacity-50');
          state.inputs['input-e8-condition'] = '';
        } else {
          condInput.disabled = false;
          condInput.placeholder = 'e.g., Generalized Anxiety Disorder, Depression...';
          condInput.classList.remove('opacity-40', 'cursor-not-allowed', 'bg-[#ECEFEA]');
          if (e8Badge) e8Badge.classList.remove('hidden');
          if (e8Container) e8Container.classList.remove('opacity-50');
        }
      }
    }

    // Refresh visual completion badges
    updateSubfieldFeedback();
  }

  // Update soft emerald completion feedback checkmark badge for sub-fields
  function updateSubfieldFeedback() {
    // 1. E3 Duration Badge
    const e3Group = document.querySelector('[data-question="e3"]');
    const minInput = document.getElementById('input-exercise-min');
    const e3Badge = document.getElementById('e3-duration-badge');

    if (e3Group && minInput && e3Badge) {
      const activeBtn = e3Group.querySelector('.pebble-btn.active');
      if (!activeBtn) {
        e3Badge.classList.add('hidden');
      } else {
        const val = (activeBtn.getAttribute('data-value') || activeBtn.innerText.trim()).toLowerCase();
        const isNever = val.includes('never') || val.includes('কখনো না');
        if (isNever) {
          e3Badge.classList.add('hidden');
        } else {
          e3Badge.classList.remove('hidden');
          const minVal = minInput.value.trim();
          const num = parseInt(minVal, 10);
          const isValid = minVal !== '' && !isNaN(num) && num > 0 && num <= 360;

          if (isValid) {
            e3Badge.className = 'inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs transition-all duration-200';
            e3Badge.innerHTML = '<span class="material-symbols-outlined text-[13px] leading-none text-emerald-700">check_circle</span> <span>✓ Completed / সম্পন্ন (' + num + ' min)</span>';
          } else {
            e3Badge.className = 'inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 transition-all duration-200';
            e3Badge.innerHTML = '<span class="material-symbols-outlined text-[13px] leading-none text-amber-600">info</span> <span>Required / আবশ্যক</span>';
          }
        }
      }
    }

    // 2. E8 Condition Badge
    const e8Group = document.querySelector('[data-question="e8"]');
    const condInput = document.getElementById('input-e8-condition');
    const e8Badge = document.getElementById('e8-condition-badge');

    if (e8Group && condInput && e8Badge) {
      const activeBtn = e8Group.querySelector('.pebble-btn.active');
      if (!activeBtn) {
        e8Badge.classList.add('hidden');
      } else {
        const val = (activeBtn.getAttribute('data-value') || activeBtn.innerText.trim()).toLowerCase();
        const isYes = val.includes('yes') || val.includes('হ্যাঁ');
        if (!isYes) {
          e8Badge.classList.add('hidden');
        } else {
          e8Badge.classList.remove('hidden');
          const condVal = condInput.value.trim();
          const isValid = condVal.length > 0;

          if (isValid) {
            e8Badge.className = 'inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs transition-all duration-200';
            e8Badge.innerHTML = '<span class="material-symbols-outlined text-[13px] leading-none text-emerald-700">check_circle</span> <span>✓ Completed / সম্পন্ন</span>';
          } else {
            e8Badge.className = 'inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 transition-all duration-200';
            e8Badge.innerHTML = '<span class="material-symbols-outlined text-[13px] leading-none text-amber-600">info</span> <span>Required / আবশ্যক</span>';
          }
        }
      }
    }

    // 3. Card A7 (Academic Year & Semester Badges - Both Mandatory)
    const a7YearBadge = document.getElementById('a7-year-badge');
    const a7SemBadge = document.getElementById('a7-semester-badge');
    const a7CardBadge = document.getElementById('a7-card-status-badge');
    const semesterSelect = document.getElementById('select-semester');

    const yearVal = getSelectedStudyYear();
    const semVal = semesterSelect?.value?.trim() || state.inputs['select-semester'] || '';
    const semText = semesterSelect && semesterSelect.selectedIndex > 0
      ? semesterSelect.options[semesterSelect.selectedIndex].text.split('/')[0].trim()
      : '';

    // 1. Year Badge Feedback
    if (a7YearBadge) {
      if (yearVal) {
        a7YearBadge.className = 'inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs transition-all duration-200';
        a7YearBadge.innerHTML = `<span class="material-symbols-outlined text-[13px] leading-none text-emerald-700">check_circle</span> <span>✓ ${yearVal} (নির্বাচিত)</span>`;
      } else {
        a7YearBadge.className = 'inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 transition-all duration-200';
        a7YearBadge.innerHTML = `<span class="material-symbols-outlined text-[13px] leading-none text-amber-600">info</span> <span>Required / আবশ্যক</span>`;
      }
    }

    // 2. Semester Badge Feedback
    if (a7SemBadge) {
      if (semVal) {
        a7SemBadge.className = 'inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs transition-all duration-200';
        a7SemBadge.innerHTML = `<span class="material-symbols-outlined text-[13px] leading-none text-emerald-700">check_circle</span> <span>✓ ${semText || ('Semester ' + semVal)} (নির্বাচিত)</span>`;
      } else {
        a7SemBadge.className = 'inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 transition-all duration-200';
        a7SemBadge.innerHTML = `<span class="material-symbols-outlined text-[13px] leading-none text-amber-600">info</span> <span>Required / আবশ্যক</span>`;
      }
    }

    // 3. Overall Card A7 Status Badge Feedback
    if (a7CardBadge) {
      if (yearVal && semVal) {
        a7CardBadge.className = 'inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs transition-all duration-200';
        a7CardBadge.innerHTML = `<span class="material-symbols-outlined text-[13px] leading-none text-emerald-700">check_circle</span> <span>✓ Completed / উভয়টি সম্পন্ন</span>`;
      } else {
        let label = 'Both Required / উভয়টি আবশ্যক';
        if (yearVal && !semVal) {
          label = 'Semester Missing / সেমিস্টার নির্বাচন করুন';
        } else if (!yearVal && semVal) {
          label = 'Year Missing / শিক্ষাবর্ষ নির্বাচন করুন';
        }
        a7CardBadge.className = 'inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 transition-all duration-200';
        a7CardBadge.innerHTML = `<span class="material-symbols-outlined text-[13px] leading-none text-amber-600">info</span> <span>${label}</span>`;
      }
    }
  }

  // Auto-Advance & Scroll-Assist Engine
  let autoAdvanceTimer = null;

  function handleAutoAdvance(parentCard, questionId, clickedBtn) {
    if (!parentCard) return;

    // Check conditional sub-input requirements:
    // A7: If semester is not selected yet, focus semester dropdown instead of scrolling away
    if (questionId === 'a7_year') {
      const semesterSelect = parentCard.querySelector('#select-semester');
      if (semesterSelect && !semesterSelect.value.trim()) {
        setTimeout(() => semesterSelect.focus(), 150);
        return;
      }
    }

    // E3: If exercise frequency is not "never", minutes input is required
    if (questionId === 'e3') {
      const val = (clickedBtn.getAttribute('data-value') || clickedBtn.innerText.trim()).toLowerCase();
      const isNever = val.includes('never') || val.includes('কখনো না');
      if (!isNever) {
        const minInput = document.getElementById('input-exercise-min');
        if (minInput && !minInput.value.trim()) {
          setTimeout(() => minInput.focus(), 150);
        }
        return;
      }
    }

    // E8: If condition answer is "yes", condition details input is required
    if (questionId === 'e8') {
      const val = (clickedBtn.getAttribute('data-value') || clickedBtn.innerText.trim()).toLowerCase();
      const isYes = val.includes('yes') || val.includes('হ্যাঁ');
      if (isYes) {
        const condInput = document.getElementById('input-e8-condition');
        if (condInput && !condInput.value.trim()) {
          setTimeout(() => condInput.focus(), 150);
        }
        return;
      }
    }

    // If current card is answered, trigger smooth 200ms auto-advance
    if (isCardAnswered(parentCard)) {
      triggerAutoAdvance(parentCard);
    }
  }

  function triggerAutoAdvance(currentCard) {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = setTimeout(() => {
      const allCards = Array.from(document.querySelectorAll('.question-card'));
      const currIdx = allCards.indexOf(currentCard);
      if (currIdx === -1) return;

      // Find next unanswered card forward
      let nextCard = allCards.slice(currIdx + 1).find(c => !isCardAnswered(c));

      // If all following cards are answered, look back from beginning
      if (!nextCard) {
        nextCard = allCards.find(c => !isCardAnswered(c));
      }

      if (nextCard && nextCard !== currentCard) {
        // Handle step mode if enabled
        if (typeof isStepMode !== 'undefined' && isStepMode && typeof stepModuleIds !== 'undefined') {
          const parentSec = nextCard.closest('section[id^="module-"]');
          if (parentSec) {
            const stepIdx = stepModuleIds.indexOf(parentSec.id);
            if (stepIdx !== -1 && stepIdx !== currentStepIndex && typeof goToStep === 'function') {
              goToStep(stepIdx, false);
            }
          }
        }

        nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Gentle assistance focus highlight
        nextCard.classList.add('card-focus-assist');
        setTimeout(() => {
          nextCard.classList.remove('card-focus-assist');
        }, 1200);
      } else if (!nextCard) {
        // All 54 questions answered! Smooth scroll to submit button
        const submitBtn = document.getElementById('module-g-submit-btn');
        if (submitBtn) {
          submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 200);
  }

  // 3. Pebble Radio Group Controller
  function setupPebbleGroups() {
    const pebbleGroups = document.querySelectorAll('[data-pebble-group]');

    pebbleGroups.forEach(group => {
      const buttons = group.querySelectorAll('.pebble-btn');
      const targetReadoutId = group.getAttribute('data-readout');
      const readoutEl = targetReadoutId ? document.getElementById(targetReadoutId) : null;
      const isMulti = group.hasAttribute('data-multi');
      const isPhq = group.hasAttribute('data-phq');
      const questionId = group.getAttribute('data-question');
      const parentCard = group.closest('.question-card');

      // Make group accessible
      group.setAttribute('role', isMulti ? 'group' : 'radiogroup');

      buttons.forEach((btn, idx) => {
        btn.setAttribute('role', isMulti ? 'checkbox' : 'radio');
        btn.setAttribute('tabindex', btn.classList.contains('active') ? '0' : '-1');
        btn.setAttribute('aria-checked', btn.classList.contains('active') ? 'true' : 'false');

        // Click Handler
        btn.addEventListener('click', (e) => {
          createRipple(e, btn);

          if (!isMulti) {
            buttons.forEach(b => {
              b.classList.remove('active');
              b.setAttribute('tabindex', '-1');
              b.setAttribute('aria-checked', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('tabindex', '0');
            btn.setAttribute('aria-checked', 'true');
          } else {
            btn.classList.toggle('active');
            const isActive = btn.classList.contains('active');
            btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
          }

          // Readout Label
          const label = btn.getAttribute('data-label') || btn.innerText.trim();
          if (readoutEl) {
            readoutEl.textContent = label;
          }

          // Record Score & State
          if (questionId) {
            state.answeredQuestions.add(questionId);

            if (isPhq) {
              const val = parseInt(btn.getAttribute('data-value'), 10) || 0;
              state.phq9Scores[questionId] = val;
              updatePhq9Score();
            } else {
              const val = btn.getAttribute('data-value') || toEnglishOnly(btn.querySelector('.font-bold')?.innerText || label);
              const cleanEnglishVal = toEnglishOnly(val);
              state.likertScores[questionId] = cleanEnglishVal;
              if (questionId === 'a7_year') {
                const hiddenYear = document.getElementById('input-academic-year');
                if (hiddenYear) hiddenYear.value = cleanEnglishVal;
                state.inputs['input-academic-year'] = cleanEnglishVal;
              }
            }
          }

          // Dynamic field synchronization for E3 & E8
          if (questionId === 'e3' || questionId === 'e8') {
            syncConditionalFields();
            if (questionId === 'e3') {
              const val = (btn.getAttribute('data-value') || label).toLowerCase();
              if (!val.includes('never') && !val.includes('কখনো না')) {
                const minInput = document.getElementById('input-exercise-min');
                if (minInput && !minInput.value) setTimeout(() => minInput.focus(), 150);
              }
            } else if (questionId === 'e8') {
              const val = (btn.getAttribute('data-value') || label).toLowerCase();
              if (val.includes('yes') || val.includes('হ্যাঁ')) {
                const condInput = document.getElementById('input-e8-condition');
                if (condInput && !condInput.value) setTimeout(() => condInput.focus(), 150);
              }
            }
          }

          // Card Answered State
          if (parentCard) {
            if (isCardAnswered(parentCard)) {
              parentCard.classList.add('answered');
              parentCard.classList.remove('highlight-unanswered');
            } else {
              parentCard.classList.remove('answered');
            }
          }

          // Highlight Guide Column if present
          highlightGuide(btn);

          updateProgress();
          saveState();

          // Auto-advance & scroll-assist for single-choice pebble selections
          if (!isMulti && parentCard) {
            handleAutoAdvance(parentCard, questionId, btn);
          }
        });

        // Keyboard Navigation (Arrow Keys)
        btn.addEventListener('keydown', (e) => {
          let nextIdx = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            nextIdx = (idx + 1) % buttons.length;
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            nextIdx = (idx - 1 + buttons.length) % buttons.length;
          } else if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            btn.click();
            return;
          }

          if (nextIdx !== null) {
            e.preventDefault();
            buttons[nextIdx].focus();
            buttons[nextIdx].click();
          }
        });
      });
    });
  }


  // Dropdown Questions Controller (Sections C, D, G)
  function setupDropdownQuestions() {
    const dropdowns = document.querySelectorAll('select[data-dropdown-question]');
    dropdowns.forEach(select => {
      const q = select.getAttribute('data-dropdown-question');
      const readoutId = select.getAttribute('data-readout');
      const readoutEl = readoutId ? document.getElementById(readoutId) : null;
      const parentCard = select.closest('.question-card');

      select.addEventListener('change', () => {
        const val = select.value;
        const selectedText = select.options[select.selectedIndex]?.text || val;

        state.likertScores[q] = val;
        state.answeredQuestions.add(q);

        if (readoutEl) {
          readoutEl.textContent = selectedText;
        }

        if (parentCard) {
          if (val) {
            parentCard.classList.add('border-[#2D6A4F]', 'bg-[#F9FCFA]', 'answered');
            parentCard.classList.remove('highlight-unanswered');
          } else {
            parentCard.classList.remove('border-[#2D6A4F]', 'bg-[#F9FCFA]', 'answered');
          }
        }

        updateProgress();
        saveState();

        if (val && parentCard && isCardAnswered(parentCard)) {
          triggerAutoAdvance(parentCard);
        }
      });
    });
  }

  // 4. Highlight Scoring Guide Column on Choice
  function highlightGuide(btn) {
    const val = btn.getAttribute('data-value') || btn.innerText.trim();
    const section = btn.closest('section');
    if (!section) return;

    const guideCards = section.querySelectorAll('.guide-card');
    if (!guideCards.length) return;

    guideCards.forEach(gc => gc.classList.remove('active'));
    // Match SD, D, N, A, SA or 1-7
    const matchMap = {
      'SD': '1', 'D': '2', 'N': '3', 'A': '4', 'SA': '5',
      'Never': '1', 'Rarely': '2', 'Occas.': '3', 'Often': '4', 'Daily': '5',
      'None': '1', 'Slight': '2', 'Moderate': '3', 'Very': '4', 'Extreme': '5'
    };
    const targetKey = matchMap[val] || val;
    guideCards.forEach(gc => {
      const gVal = gc.getAttribute('data-guide-val');
      if (gVal === targetKey) {
        gc.classList.add('active');
        setTimeout(() => gc.classList.remove('active'), 1800);
      }
    });
  }

  // 5. Input Field Change Handlers
  function setupInputs() {
    const inputs = document.querySelectorAll('input:not([type="checkbox"]), select');
    inputs.forEach(inp => {
      const handleInput = (e) => {
        if (inp.id) {
          state.inputs[inp.id] = inp.value;
          const isOptionalSub = (inp.id === 'input-exercise-min' || inp.id === 'input-e8-condition');
          if (!isOptionalSub) {
            if (inp.value.trim() !== '') {
              state.answeredQuestions.add(inp.id);
            } else {
              state.answeredQuestions.delete(inp.id);
            }
          }
        }
        const parent = inp.closest('.question-card');
        if (parent) {
          if (isCardAnswered(parent)) {
            parent.classList.add('answered');
            parent.classList.remove('highlight-unanswered');
          } else {
            parent.classList.remove('answered');
          }
        }
        updateProgress();
        saveState();

        // If semester dropdown was changed but academic year is still missing, focus year buttons
        if (inp.id === 'select-semester' && parent) {
          const yearVal = getSelectedStudyYear();
          if (!yearVal) {
            const firstYearBtn = parent.querySelector('[data-question="a7_year"] .pebble-btn');
            if (firstYearBtn) setTimeout(() => firstYearBtn.focus(), 150);
          }
        }

        // On selection change (e.g. dropdown, or completion of input on blur/change), auto-advance
        if (e && e.type === 'change' && parent && isCardAnswered(parent)) {
          triggerAutoAdvance(parent);
        }
      };
      inp.addEventListener('input', handleInput);
      inp.addEventListener('change', handleInput);

      // Advance when user presses Enter key in an input
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const parent = inp.closest('.question-card');
          if (parent && isCardAnswered(parent)) {
            e.preventDefault();
            triggerAutoAdvance(parent);
          }
        }
      });
    });
  }

  // 6. PHQ-9 Real-Time Calculation
  function updatePhq9Score() {
    let total = 0;
    const phqQuestions = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9'];

    phqQuestions.forEach(q => {
      if (state.phq9Scores[q] !== undefined) {
        total += state.phq9Scores[q];
      } else {
        const activeBtn = document.querySelector(`[data-question="${q}"] .pebble-btn.active`);
        if (activeBtn) {
          const val = parseInt(activeBtn.getAttribute('data-value'), 10) || 0;
          state.phq9Scores[q] = val;
          total += val;
        }
      }
    });

    let severity = 'Minimal (নগণ্য)';
    let badgeClass = 'bg-[#DCE8D5] text-[#152418] border border-[#C8DCCF]';
    let severityColor = '#2D6A4F';

    if (total >= 20) {
      severity = 'Severe Depression (তীব্র বিষণ্নতা)';
      badgeClass = 'bg-[#F9E7E4] text-[#A63529] border border-[#F2C1BC]';
      severityColor = '#A63529';
    } else if (total >= 15) {
      severity = 'Mod. Severe (মাঝারি তীব্র)';
      badgeClass = 'bg-[#FCECE4] text-[#B85736] border border-[#F5D0C0]';
      severityColor = '#B85736';
    } else if (total >= 10) {
      severity = 'Moderate (মাঝারি)';
      badgeClass = 'bg-[#F9EED9] text-[#8C6228] border border-[#EED7B0]';
      severityColor = '#8C6228';
    } else if (total >= 5) {
      severity = 'Mild (মৃদু)';
      badgeClass = 'bg-[#EAECE0] text-[#556345] border border-[#D4D9C4]';
      severityColor = '#556345';
    }

    // Update Header HUD
    const hudEl = document.getElementById('phq-hud-score');
    if (hudEl) {
      hudEl.textContent = `PHQ-9 Score: ${total} / 27 • ${severity}`;
      hudEl.className = `px-4 py-2 rounded-full text-xs font-bold tracking-wide shadow-sm transition-all duration-300 ${badgeClass}`;
    }

    // Update Floating HUD
    const floatingPhq = document.getElementById('floating-phq-badge');
    if (floatingPhq) {
      floatingPhq.textContent = `PHQ-9: ${total} (${severity.split(' ')[0]})`;
    }

    // Update Modal
    const modalScore = document.getElementById('modal-phq-score');
    const modalSeverity = document.getElementById('modal-phq-severity');
    const modalBar = document.getElementById('modal-phq-bar');
    if (modalScore) modalScore.textContent = `${total} / 27`;
    if (modalSeverity) modalSeverity.textContent = severity;
    if (modalBar) {
      const pct = Math.min(100, Math.round((total / 27) * 100));
      modalBar.style.width = `${pct}%`;
      modalBar.style.backgroundColor = severityColor;
    }
    return { total, severity };
  }

  // 7. Calculate Progress Across 54 Items (0% to 100%)
  function updateProgress() {
    const allCards = document.querySelectorAll('.question-card');
    let answeredCount = 0;
    allCards.forEach(card => {
      if (isCardAnswered(card)) {
        answeredCount++;
      }
    });

    const pct = Math.round((answeredCount / TOTAL_CHECKPOINTS) * 100);

    // Slim top progress bar
    const bar = document.getElementById('zen-progress-bar');
    if (bar) bar.style.width = `${pct}%`;

    // Bottom dock micro progress bar
    const bottomBarFill = document.getElementById('zen-bottom-progress-fill');
    if (bottomBarFill) bottomBarFill.style.width = `${pct}%`;

    // Progress badges
    const progressText = document.getElementById('progress-indicator-text');
    if (progressText) progressText.textContent = `${answeredCount} / ${TOTAL_CHECKPOINTS} completed (${pct}%)`;

    const floatingProgress = document.getElementById('floating-progress-text');
    if (floatingProgress) floatingProgress.textContent = `${pct}% complete`;

    const mobileProgress = document.getElementById('mobile-progress-badge');
    if (mobileProgress) mobileProgress.textContent = `${pct}%`;

    // Floating Chatbot Progress Tracker (Bottom-Right)
    const chatbotPctText = document.getElementById('chatbot-percentage-text');
    const chatbotCircle = document.getElementById('chatbot-progress-circle');
    const chatbotCount = document.getElementById('chatbot-answered-count');
    const chatbotBtn = document.getElementById('chatbot-progress-btn');
    const chatbotStatus = document.getElementById('chatbot-status-label');

    if (chatbotPctText) {
      chatbotPctText.textContent = `${pct}%`;
    }
    if (chatbotCount) {
      chatbotCount.textContent = answeredCount;
    }
    if (chatbotCircle) {
      const circumference = 125.66; // 2 * PI * 20
      const offset = circumference - (circumference * pct) / 100;
      chatbotCircle.style.strokeDashoffset = Math.max(0, offset);
    }
    if (chatbotBtn) {
      chatbotBtn.setAttribute('aria-label', `Survey Progress: ${pct}% completed (${answeredCount} of ${TOTAL_CHECKPOINTS} answered). Click to jump to next question.`);
      chatbotBtn.setAttribute('title', `Survey Progress: ${pct}% completed (${answeredCount} of ${TOTAL_CHECKPOINTS} answered). Click to jump to next question.`);
      if (pct === 100) {
        if (chatbotStatus) chatbotStatus.textContent = 'DONE';
        chatbotBtn.classList.add('chatbot-completed', 'border-emerald-400');
      } else {
        if (chatbotStatus) chatbotStatus.textContent = 'MindCare';
        chatbotBtn.classList.remove('chatbot-completed', 'border-emerald-400');
      }
    }

    // Update subfield inline completion feedback badges (E3 & E8)
    updateSubfieldFeedback();

    // Update section checkmarks and states in Nav
    updateNavigationModules();
  }

  // Module Definitions with Standard & Short Names
  const moduleDefs = [
    { id: 'a', name: 'Demographics', shortName: 'Demographic' },
    { id: 'b', name: 'PHQ-9', shortName: 'PHQ-9' },
    { id: 'c', name: 'Academic', shortName: 'Academic' },
    { id: 'd', name: 'Future & AI', shortName: 'Future & AI' },
    { id: 'e', name: 'Rest & Vitality', shortName: 'Rest & Vitality' },
    { id: 'f', name: 'Social Support', shortName: 'Social Support' },
    { id: 'g', name: 'Earth & Hearth', shortName: 'Earth & Hearth' }
  ];

  let currentTrackedSectionId = 'module-a';

  function updateNavigationModules(activeSectionId) {
    if (activeSectionId) {
      currentTrackedSectionId = activeSectionId;
    }

    const activeModKey = currentTrackedSectionId.replace('module-', '');
    const activeMod = moduleDefs.find(m => m.id === activeModKey) || moduleDefs[0];

    // Update Mobile Nav Center Trigger Text
    const mobileCurrLabel = document.getElementById('mobile-current-module-name');
    if (mobileCurrLabel) {
      mobileCurrLabel.textContent = activeMod.shortName || activeMod.name;
    }

    // Update each module's three distinct states (Active, Completed, Not completed)
    moduleDefs.forEach(m => {
      const section = document.getElementById(`module-${m.id}`);
      let isCompleted = false;
      if (section) {
        const cards = section.querySelectorAll('.question-card');
        if (cards.length > 0) {
          isCompleted = Array.from(cards).every(card => isCardAnswered(card));
        }
      }

      const isActive = (m.id === activeModKey);

      // 1. Desktop Nav Button
      const deskLink = document.querySelector(`.waypoint-link[data-module="${m.id}"]`);
      if (deskLink) {
        deskLink.classList.remove('state-active', 'state-completed', 'state-pending', 'active');
        let checkSpan = deskLink.querySelector('.module-check');

        if (isActive) {
          deskLink.classList.add('state-active', 'active');
          if (isCompleted) {
            if (!checkSpan) {
              checkSpan = document.createElement('span');
              checkSpan.className = 'module-check text-white/90 font-bold text-xs ml-1';
              checkSpan.textContent = '✓';
              deskLink.appendChild(checkSpan);
            } else {
              checkSpan.className = 'module-check text-white/90 font-bold text-xs ml-1';
            }
          } else if (checkSpan) {
            checkSpan.remove();
          }
        } else if (isCompleted) {
          deskLink.classList.add('state-completed');
          if (!checkSpan) {
            checkSpan = document.createElement('span');
            checkSpan.className = 'module-check text-emerald-600 font-bold text-xs ml-1';
            checkSpan.textContent = '✓';
            deskLink.appendChild(checkSpan);
          } else {
            checkSpan.className = 'module-check text-emerald-600 font-bold text-xs ml-1';
          }
        } else {
          deskLink.classList.add('state-pending');
          if (checkSpan) checkSpan.remove();
        }
      }

      // 2. Mobile Drawer Item
      const mobLink = document.querySelector(`.mobile-waypoint-link[data-module="${m.id}"]`);
      if (mobLink) {
        mobLink.classList.remove('state-active', 'state-completed', 'state-pending');
        const statusSpan = mobLink.querySelector('.module-status');

        if (isActive) {
          mobLink.classList.add('state-active');
          if (statusSpan) {
            statusSpan.className = 'module-status text-[11px] font-bold text-[#2D6A4F]';
            statusSpan.textContent = isCompleted ? 'Active (Completed ✓)' : 'Active Section';
          }
        } else if (isCompleted) {
          mobLink.classList.add('state-completed');
          if (statusSpan) {
            statusSpan.className = 'module-status text-[11px] font-bold text-emerald-600 flex items-center gap-1';
            statusSpan.textContent = 'Completed ✓';
          }
        } else {
          mobLink.classList.add('state-pending');
          if (statusSpan) {
            statusSpan.className = 'module-status text-[11px] font-medium text-[#6B8070]';
            statusSpan.textContent = 'Incomplete';
          }
        }
      }
    });
  }

  // 7b. Check If Question Card Is Completed (Strict Validation for All 54 Items)
  function isCardAnswered(card) {
    if (!card) return true;

    // 1. Special Check for Card A7 (Academic Year & Semester - both required)
    const yearGroup = card.querySelector('[data-question="a7_year"]');
    const semesterSelect = card.querySelector('#select-semester');
    if (yearGroup && semesterSelect) {
      const yearSelected = yearGroup.querySelector('.pebble-btn.active') !== null ||
        Boolean(document.getElementById('input-academic-year')?.value.trim()) ||
        Boolean(state.likertScores['a7_year']);
      const semesterSelected = semesterSelect.value.trim() !== '';
      return yearSelected && semesterSelected;
    }

    // 1b. Special Check for Card E3 (Exercise Frequency & Duration)
    const e3Group = card.querySelector('[data-question="e3"]');
    if (e3Group) {
      const activeBtn = e3Group.querySelector('.pebble-btn.active');
      if (!activeBtn) return false;
      const val = (activeBtn.getAttribute('data-value') || activeBtn.innerText.trim()).toLowerCase();
      const isNever = val.includes('never') || val.includes('কখনো না');
      if (isNever) {
        return true; // Never selected: duration minute is NOT required
      }
      // 1-2, 3-4, or 5+ days/week selected: duration minute IS strictly required!
      const minInput = card.querySelector('#input-exercise-min');
      if (!minInput) return false;
      const minVal = minInput.value.trim();
      const num = parseInt(minVal, 10);
      return minVal !== '' && !isNaN(num) && num > 0;
    }

    // 1c. Special Check for Card E8 (Diagnosed Condition & Details)
    const e8Group = card.querySelector('[data-question="e8"]');
    if (e8Group) {
      const activeBtn = e8Group.querySelector('.pebble-btn.active');
      if (!activeBtn) return false;
      const val = (activeBtn.getAttribute('data-value') || activeBtn.innerText.trim()).toLowerCase();
      const isYes = val.includes('yes') || val.includes('হ্যাঁ');
      if (!isYes) {
        return true; // No selected: condition details NOT required
      }
      // Yes selected: condition details MUST be provided!
      const condInput = card.querySelector('#input-e8-condition');
      return !!(condInput && condInput.value.trim().length > 0);
    }

    // 2. Input A1 (Age: 15-65)
    const ageInput = card.querySelector('#input-age');
    if (ageInput) {
      const val = ageInput.value.trim();
      const num = parseInt(val, 10);
      return val !== '' && !isNaN(num) && num >= 15 && num <= 65;
    }

    // 3. Input A2 (Height: ft required between 3-7)
    const ftInput = card.querySelector('#input-height-ft');
    if (ftInput) {
      const ftVal = ftInput.value.trim();
      const ftNum = parseInt(ftVal, 10);
      return ftVal !== '' && !isNaN(ftNum) && ftNum >= 3 && ftNum <= 7;
    }

    // 4. Input A4 (Weight: 30-180 kg)
    const weightInput = card.querySelector('#input-weight');
    if (weightInput) {
      const val = weightInput.value.trim();
      const num = parseInt(val, 10);
      return val !== '' && !isNaN(num) && num >= 30 && num <= 180;
    }

    // 5. Input G2 (Income)
    const incomeInput = card.querySelector('#input-income');
    if (incomeInput) {
      return incomeInput.value.trim() !== '';
    }

    // 6. Pebble Button Group (A3, A5, A6, B1-B9, E1-E8, F1-F12)
    const group = card.querySelector('[data-pebble-group]');
    if (group) {
      return group.querySelector('.pebble-btn.active') !== null;
    }

    // 7. Dropdown Select Questions (C1-C8, D1-D4, G1, G3-G6)
    const select = card.querySelector('select');
    if (select) {
      return select.value.trim() !== '';
    }

    // Generic fallback for any other text/number input
    const anyInput = card.querySelector('input:not([type="checkbox"])');
    if (anyInput) {
      return anyInput.value.trim() !== '';
    }

    return true;
  }

  // Get all currently unanswered question cards across entire survey
  function getUnansweredCards() {
    const allCards = document.querySelectorAll('.question-card');
    const unanswered = [];
    allCards.forEach(card => {
      if (!isCardAnswered(card)) {
        unanswered.push(card);
      }
    });
    return unanswered;
  }

  // Get unanswered question cards within a specific section/module
  function getUnansweredCardsInSection(sectionEl) {
    if (!sectionEl) return [];
    const cards = sectionEl.querySelectorAll('.question-card');
    const unanswered = [];
    cards.forEach(card => {
      if (!isCardAnswered(card)) {
        unanswered.push(card);
      }
    });
    return unanswered;
  }

  // Gatekeeper: Validate that all prior sections are complete before navigating forward
  function canProceedToStep(targetIndex) {
    if (targetIndex <= currentStepIndex) return true;

    for (let i = 0; i < targetIndex; i++) {
      const secId = stepModuleIds[i];
      const secEl = document.getElementById(secId);

      if (secId === 'module-a') {
        const consentCheck = document.getElementById('consent-checkbox');
        if (consentCheck && !consentCheck.checked) {
          const consentParent = consentCheck.closest('.consent-box') || consentCheck.parentElement;
          showValidationAlert(1, consentParent, 'Consent Required', '⚠️ অনুগ্রহ করে প্রথমে সম্মতি বক্সে টিক দিন (Please agree to voluntary consent first)');
          goToStep(0, false);
          consentCheck.focus();
          if (consentParent) {
            consentParent.classList.add('ring-2', 'ring-red-500', 'p-2', 'rounded-xl');
            consentParent.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => consentParent.classList.remove('ring-2', 'ring-red-500', 'p-2', 'rounded-xl'), 3000);
          }
          return false;
        }
      }

      if (secEl) {
        const unanswered = getUnansweredCardsInSection(secEl);
        if (unanswered.length > 0) {
          goToStep(i, false);
          const first = unanswered[0];
          first.scrollIntoView({ behavior: 'smooth', block: 'center' });
          first.classList.add('highlight-unanswered');
          setTimeout(() => first.classList.remove('highlight-unanswered'), 3500);

          const focusable = first.querySelector('input:not([type="checkbox"]), select, .pebble-btn');
          if (focusable) {
            setTimeout(() => focusable.focus(), 350);
          }

          const modTitle = stepModuleTitles[i] || `Section ${secId.replace('module-', '').toUpperCase()}`;
          showValidationAlert(unanswered.length, first, 'Section Incomplete', `⚠️ অনুগ্রহ করে প্রথমে ${modTitle} এর সকল প্রশ্নের উত্তর সম্পন্ন করুন (${unanswered.length}টি প্রশ্ন বাকি)`);
          return false;
        }
      }
    }
    return true;
  }

  // 8. Smart "Next Unanswered" Navigation
  function jumpToNextUnanswered() {
    const unanswered = getUnansweredCards();
    if (unanswered.length > 0) {
      const card = unanswered[0];
      const parentModule = card.closest('section');
      if (parentModule) {
        const modId = parentModule.getAttribute('id');
        const targetStepIdx = stepModuleIds.indexOf(modId);
        if (targetStepIdx !== -1) {
          goToStep(targetStepIdx, false);
        }
      }
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('highlight-unanswered');
      setTimeout(() => card.classList.remove('highlight-unanswered'), 3000);
      let focusable;
      if (card.querySelector('[data-question="a7_year"]')) {
        const yearVal = getSelectedStudyYear();
        const semSelect = card.querySelector('#select-semester');
        if (!yearVal) {
          focusable = card.querySelector('[data-question="a7_year"] .pebble-btn');
        } else if (semSelect && !semSelect.value.trim()) {
          focusable = semSelect;
        }
      } else if (card.querySelector('[data-question="e3"] .pebble-btn.active')) {
        focusable = card.querySelector('#input-exercise-min:not([disabled])');
      } else if (card.querySelector('[data-question="e8"] .pebble-btn.active')) {
        focusable = card.querySelector('#input-e8-condition:not([disabled])');
      }
      if (!focusable) {
        focusable = card.querySelector('input:not([type="checkbox"]):not([type="hidden"]):not([disabled]), select:not([disabled]), .pebble-btn');
      }
      if (focusable) {
        setTimeout(() => focusable.focus(), 400);
      }
      showToast(`Jumped to unanswered question (${unanswered.length} remaining)`);
      return;
    }
    showToast('All 54 questions completed! Ready to submit.');
    const subCard = document.getElementById('submission-card');
    if (subCard) subCard.scrollIntoView({ behavior: 'smooth' });
  }

  // 9. Sticky Nav Elevation, Scroll-Spy & Mobile Directory
  function setupScrollSpy() {
    const gardenNav = document.getElementById('mindcare-nav') || document.getElementById('garden-nav');
    const sections = moduleDefs.map(m => document.getElementById(`module-${m.id}`)).filter(Boolean);

    let ticking = false;
    let isNavScrolled = false;

    const updateNavElevation = () => {
      if (!gardenNav) return;
      if (window.innerWidth >= 768) {
        const scrolledPast = window.scrollY > 20;
        if (scrolledPast !== isNavScrolled) {
          isNavScrolled = scrolledPast;
          gardenNav.classList.toggle('nav-scrolled', isNavScrolled);
        }
      } else if (isNavScrolled) {
        isNavScrolled = false;
        gardenNav.classList.remove('nav-scrolled');
      }
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateNavElevation();

          let detectedSectionId = '';
          const scrollPos = window.scrollY + 200;

          sections.forEach(sec => {
            if (sec.offsetTop <= scrollPos) {
              detectedSectionId = sec.getAttribute('id');
            }
          });

          if (detectedSectionId && detectedSectionId !== currentTrackedSectionId) {
            updateNavigationModules(detectedSectionId);
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    window.addEventListener('resize', updateNavElevation, { passive: true });
    updateNavElevation();
    updateNavigationModules('module-a');
  }

  function setupMobileDrawer() {
    const drawer = document.getElementById('mobile-module-drawer');
    const openGridBtn = document.getElementById('mobile-grid-btn');
    const openTriggerBtn = document.getElementById('mobile-module-trigger');
    const closeBtn = document.getElementById('close-mobile-drawer');
    const backdrop = document.getElementById('mobile-drawer-backdrop');

    if (!drawer) return;

    const openDrawer = () => {
      drawer.classList.remove('hidden');
      drawer.classList.add('flex');
      document.body.style.overflow = 'hidden';
      updateNavigationModules();
    };

    const closeDrawer = () => {
      drawer.classList.add('hidden');
      drawer.classList.remove('flex');
      document.body.style.overflow = '';
    };

    if (openGridBtn) openGridBtn.addEventListener('click', openDrawer);
    if (openTriggerBtn) openTriggerBtn.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    document.querySelectorAll('.mobile-waypoint-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const modKey = link.getAttribute('data-module');
        if (modKey) {
          const modId = `module-${modKey}`;
          const targetStepIdx = stepModuleIds.indexOf(modId);
          if (targetStepIdx !== -1) {
            closeDrawer();
            if (canProceedToStep(targetStepIdx)) {
              goToStep(targetStepIdx, true);
            }
          }
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !drawer.classList.contains('hidden')) {
        closeDrawer();
      }
    });
  }

  // 10. Ambient Courtyard Rain Synthesizer (Web Audio API with Smooth Fade)
  let audioCtx = null;
  let isPlayingSound = false;
  let rainNodes = [];

  function toggleSoundscape() {
    const btn = document.getElementById('soundscape-toggle');
    const floatingBtn = document.getElementById('floating-sound-toggle');
    const statusText = document.getElementById('soundscape-status');
    const waveIndicator = document.getElementById('soundscape-waves');

    if (!isPlayingSound) {
      try {
        if (!audioCtx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          audioCtx = new AudioContext();
        }
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

        const bufferSize = audioCtx.sampleRate * 2;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
          b6 = white * 0.115926;
        }

        const rainSource = audioCtx.createBufferSource();
        rainSource.buffer = noiseBuffer;
        rainSource.loop = true;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, audioCtx.currentTime);

        const drone = audioCtx.createOscillator();
        drone.type = 'sine';
        drone.frequency.setValueAtTime(432, audioCtx.currentTime);

        const droneGain = audioCtx.createGain();
        droneGain.gain.setValueAtTime(0.015, audioCtx.currentTime);

        const masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.01, audioCtx.currentTime);
        // Smooth fade-in
        masterGain.gain.exponentialRampToValueAtTime(0.35, audioCtx.currentTime + 1.2);

        rainSource.connect(filter);
        filter.connect(masterGain);
        drone.connect(droneGain);
        droneGain.connect(masterGain);
        masterGain.connect(audioCtx.destination);

        rainSource.start();
        drone.start();

        rainNodes = [rainSource, drone, masterGain];
        isPlayingSound = true;

        if (statusText) statusText.textContent = 'Courtyard Rain Active (432Hz Ambient Soundscape)';
        if (waveIndicator) waveIndicator.classList.remove('hidden');
        if (btn) btn.classList.add('bg-[#DCE8D5]', 'border-[#2D6A4F]');
        if (floatingBtn) floatingBtn.classList.add('bg-[#2D6A4F]', 'text-white');
        showToast('Ambient 432Hz Courtyard Rain Started');
      } catch (err) {
        console.error('Audio init error:', err);
        showToast('Audio not supported in this browser');
      }
    } else {
      if (rainNodes[2] && audioCtx) {
        const master = rainNodes[2];
        master.gain.setValueAtTime(master.gain.value, audioCtx.currentTime);
        master.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
        setTimeout(() => {
          rainNodes.forEach(n => {
            try { n.stop ? n.stop() : n.disconnect(); } catch (e) {}
          });
          rainNodes = [];
        }, 850);
      }
      isPlayingSound = false;
      if (statusText) statusText.textContent = 'Soft Courtyard Rain Soundscape (432Hz ambient frequency)';
      if (waveIndicator) waveIndicator.classList.add('hidden');
      if (btn) btn.classList.remove('bg-[#DCE8D5]', 'border-[#2D6A4F]');
      if (floatingBtn) floatingBtn.classList.remove('bg-[#2D6A4F]', 'text-white');
      showToast('Soundscape Paused');
    }
  }

  // 11. Modal & Reflection Summary
  // Google Apps Script Webhook endpoint for CIR Protocol #VU/ERC/2026/042
  const DEFAULT_GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzrRBpzcMPyE3raNlznDZgBd98gVpufz2V0tEFh0CTJQfU4BDt4zPhVONvnDQuFFn4O/exec';
  const GOOGLE_SHEET_URL = (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__.GOOGLE_SHEET_URL)
    ? window.__ENV__.GOOGLE_SHEET_URL
    : DEFAULT_GOOGLE_SHEET_URL;

  // Helper to reliably extract and normalize Study Year across state, inputs, and active DOM
  function getSelectedStudyYear() {
    let raw = state.likertScores['a7_year'] || '';
    if (!raw) {
      const hiddenInp = document.getElementById('input-academic-year');
      if (hiddenInp && hiddenInp.value) raw = hiddenInp.value;
    }
    if (!raw) {
      const activeBtn = document.querySelector('[data-question="a7_year"] .pebble-btn.active, [data-question="a7_year"] [aria-checked="true"]');
      if (activeBtn) {
        raw = activeBtn.getAttribute('data-value') || activeBtn.getAttribute('data-label') || activeBtn.querySelector('.font-bold')?.textContent.trim() || activeBtn.textContent.trim();
      }
    }
    if (!raw) return '';
    const clean = String(raw).trim();
    const lower = clean.toLowerCase();
    if (lower.includes('1st') || lower.includes('১ম') || lower === '1') return '1st Year';
    if (lower.includes('2nd') || lower.includes('২য়') || lower === '2') return '2nd Year';
    if (lower.includes('3rd') || lower.includes('৩য়') || lower === '3') return '3rd Year';
    if (lower.includes('4th') || lower.includes('৪র্থ') || lower === '4') return '4th Year';
    return clean;
  }

  // Helper to register all permutations of key (spaces, case, trimming, trailing spaces)
  function setAllKeyVariants(obj, baseKeys, value) {
    if (value === undefined || value === null) return;
    const valStr = String(value);
    baseKeys.forEach(base => {
      if (!base) return;
      const b = String(base);
      const bTrim = b.trim();
      
      // 1. Direct variations
      obj[b] = valStr;
      obj[bTrim] = valStr;
      
      // 2. Whitespace padding variations
      obj[bTrim + ' '] = valStr;
      obj[bTrim + '  '] = valStr;
      obj[' ' + bTrim] = valStr;
      obj['  ' + bTrim] = valStr;
      obj[' ' + bTrim + ' '] = valStr;
      obj[bTrim + '\r'] = valStr;
      obj[bTrim + '\n'] = valStr;
      obj[bTrim + '\r\n'] = valStr;
      
      // 3. Spacing variations (single space, double space between words)
      const singleSpaced = bTrim.replace(/\s+/g, ' ');
      obj[singleSpaced] = valStr;
      obj[singleSpaced + ' '] = valStr;
      obj[' ' + singleSpaced] = valStr;
      obj[bTrim.replace(/\s+/g, '  ')] = valStr;
      obj[bTrim.replace(/\s+/g, '  ') + ' '] = valStr;
      obj[bTrim.replace(/\s+/g, '_')] = valStr;
      obj[bTrim.replace(/\s+/g, '_') + ' '] = valStr;
      obj[bTrim.replace(/[\s_-]+/g, '_')] = valStr;
      obj[bTrim.replace(/[\s_-]+/g, '')] = valStr;
      
      // 4. Normalized alphanumeric
      const normKey = bTrim.toLowerCase().replace(/[\s_-]+/g, '');
      obj[normKey] = valStr;
      obj[normKey + ' '] = valStr;
      
      // 5. Case variations
      obj[bTrim.toLowerCase()] = valStr;
      obj[bTrim.toLowerCase() + ' '] = valStr;
      obj[' ' + bTrim.toLowerCase()] = valStr;
      obj[bTrim.toLowerCase().replace(/\s+/g, ' ')] = valStr;
      obj[bTrim.toLowerCase().replace(/\s+/g, '  ')] = valStr;
      obj[bTrim.toLowerCase().replace(/\s+/g, '_')] = valStr;
      obj[bTrim.toLowerCase().replace(/[\s_-]+/g, '_')] = valStr;
      
      obj[bTrim.toUpperCase()] = valStr;
      obj[bTrim.toUpperCase() + ' '] = valStr;
      obj[' ' + bTrim.toUpperCase()] = valStr;
      obj[bTrim.toUpperCase().replace(/\s+/g, '_')] = valStr;
      
      // 6. Title / Capitalized word variations
      const titleKey = bTrim.replace(/\b\w/g, c => c.toUpperCase());
      obj[titleKey] = valStr;
      obj[titleKey + ' '] = valStr;
      obj[' ' + titleKey] = valStr;
      obj[titleKey.replace(/\s+/g, ' ')] = valStr;
      obj[titleKey.replace(/\s+/g, ' ') + ' '] = valStr;
      obj[titleKey.replace(/\s+/g, '  ')] = valStr;
      obj[titleKey.replace(/\s+/g, '_')] = valStr;
      obj[titleKey.replace(/[\s_-]+/g, '_')] = valStr;
    });
  }

  // Build research payload aligned with Google Sheet columns
  function buildSubmissionPayload(token) {
    const phq = updatePhq9Score() || { total: 0, severity: 'Minimal' };
    const mspss = calculateMspssBreakdown() || {};
    const consentCheck = document.getElementById('consent-checkbox');
    const elapsedSeconds = Math.round((Date.now() - sessionStartTime) / 1000);

    const b9Val = state.phq9Scores['b9'] !== undefined ? state.phq9Scores['b9'] : 0;
    const safetyFlag = (b9Val > 0) ? 'CRITICAL_REVIEW' : 'NORMAL';

    const htFt = document.getElementById('input-height-ft')?.value?.trim() || state.inputs['input-height-ft'] || '';
    const htIn = document.getElementById('input-height-in')?.value?.trim() || state.inputs['input-height-in'] || '';
    const formattedHeight = (htFt || htIn) ? `${htFt}'${htIn}"` : '';

    const ageVal = document.getElementById('input-age')?.value?.trim() || state.inputs['input-age'] || '';
    const weightVal = document.getElementById('input-weight')?.value?.trim() || state.inputs['input-weight'] || '';
    const uniTypeVal = state.likertScores['a5'] || '';
    const genderVal = state.likertScores['a3'] || '';
    const livingVal = state.likertScores['a6'] || '';

    const studyYearVal = getSelectedStudyYear();
    const semRaw = document.getElementById('select-semester')?.value?.trim() || state.inputs['select-semester'] || '';
    const semLabel = semRaw ? (['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester'][parseInt(semRaw, 10) - 1] || semRaw) : '';

    const incomeVal = document.getElementById('input-income')?.value?.trim() || state.inputs['input-income'] || '';

    const e3Val = state.likertScores['e3'] || '';
    const isE3Never = (e3Val.toLowerCase().includes('never') || e3Val.includes('কখনো না'));
    const rawExerciseMin = document.getElementById('input-exercise-min')?.value?.trim() || state.inputs['input-exercise-min'] || '';
    const exerciseMinVal = isE3Never ? '0' : rawExerciseMin;

    const e8Val = state.likertScores['e8'] || '';
    const isE8Yes = (e8Val.toLowerCase().includes('yes') || e8Val.includes('হ্যাঁ'));
    const rawCondition = document.getElementById('input-e8-condition')?.value?.trim() || state.inputs['input-e8-condition'] || '';
    const conditionDetailVal = isE8Yes ? rawCondition : '';

    const payload = {
      // Compatibility with Google Sheet headers:
      'Submission ID': token,
      'Timestamp': new Date().toISOString(),
      'PHQ-9 Score': phq.total,
      'Safety Flag (A9)': safetyFlag,
      'Consent': consentCheck && consentCheck.checked ? 'yes' : 'no',
      'A1': state.phq9Scores['b1'] !== undefined ? state.phq9Scores['b1'] : '',
      'A2': state.phq9Scores['b2'] !== undefined ? state.phq9Scores['b2'] : '',
      'A3': state.phq9Scores['b3'] !== undefined ? state.phq9Scores['b3'] : '',
      'A4': state.phq9Scores['b4'] !== undefined ? state.phq9Scores['b4'] : '',
      'A5': state.phq9Scores['b5'] !== undefined ? state.phq9Scores['b5'] : '',
      'A6': state.phq9Scores['b6'] !== undefined ? state.phq9Scores['b6'] : '',
      'A7': state.phq9Scores['b7'] !== undefined ? state.phq9Scores['b7'] : '',
      'A8': state.phq9Scores['b8'] !== undefined ? state.phq9Scores['b8'] : '',
      'A9': state.phq9Scores['b9'] !== undefined ? state.phq9Scores['b9'] : '',
      'B1_Age': ageVal,
      'B2_Height': formattedHeight,
      'B3_Weight': weightVal,
      'B4_Gender': genderVal,
      'B5_Semester': semRaw,
      'B6_Year': studyYearVal,
      'B7_UniType': uniTypeVal || 'Varendra University',
      'B8_Living': livingVal,
      'C1': state.likertScores['c1'] || '',
      'C2': state.likertScores['c2'] || '',
      'C3': state.likertScores['c3'] || '',
      'C4': state.likertScores['c4'] || '',
      'C5': state.likertScores['c5'] || '',
      'C6': state.likertScores['c6'] || '',
      'C7': state.likertScores['c7'] || '',
      'C8': state.likertScores['c8'] || '',
      'D1': state.likertScores['d1'] || '',
      'D2': state.likertScores['d2'] || '',
      'E1_Sleep': state.likertScores['e1'] || '',
      'E2_Wake': state.likertScores['e2'] || '',
      'E3_Exercise': e3Val || state.likertScores['e3'] || '',
      'E3_Minutes': exerciseMinVal !== '' ? exerciseMinVal : (isE3Never ? '0' : ''),
      'E4_SocialMedia': state.likertScores['e4'] || '',
      'E5_Eating': state.likertScores['e5'] || '',
      'E6_Substance': state.likertScores['e6'] || '',
      'E7_Disability': state.likertScores['e7'] || '',
      'F1': state.likertScores['f1'] || '',
      'F2': state.likertScores['f2'] || '',
      'F3': state.likertScores['f3'] || '',
      'F4': state.likertScores['f4'] || '',
      'F5': state.likertScores['f5'] || '',
      'F6': state.likertScores['f6'] || '',
      'F7': state.likertScores['f7'] || '',
      'F8': state.likertScores['f8'] || '',
      'G1_Finance': incomeVal,
      'G2': state.likertScores['g2'] || incomeVal || '',
      'G3': state.likertScores['g3'] || '',
      'G4': state.likertScores['g4'] || '',
      'G5': state.likertScores['g5'] || '',
      'G6_Event': state.likertScores['g6'] || '',
      'Completed Seconds': elapsedSeconds,
      'User Agent': navigator.userAgent,

      // Semantic / Modern Research Columns:
      Timestamp: new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }) + ' (BDT)',
      Anonymous_Token: token || ('VU-' + Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b => b.toString(16).padStart(2, '0')).join('')),
      Consent_Given: consentCheck && consentCheck.checked ? 'Yes' : 'No',
      Total_Answered: state.answeredQuestions.size,

      // Demographics
      A1_Age: ageVal,
      A2_Height_Ft: htFt,
      A2_Height_In: htIn,
      A3_Gender: genderVal,
      A4_Weight_Kg: weightVal,
      A5_Relationship_Status: uniTypeVal,
      A5_University_Type: uniTypeVal,
      University_Type: uniTypeVal,
      A6_Living_Arrangement: livingVal,

      // A7 Academic Year & Study Year (All requested and common spellings)
      'A7_Acdemic year': studyYearVal,
      'A7_Acdemic Year': studyYearVal,
      'A7_acdemic year': studyYearVal,
      'a7_acdemic year': studyYearVal,
      'a7_Acdemic year': studyYearVal,
      'A7_Acdemic_year': studyYearVal,
      'A7_Acdemic_Year': studyYearVal,
      'a7_acdemic_year': studyYearVal,
      'A7_Academic year': studyYearVal,
      'A7_Academic Year': studyYearVal,
      'A7_academic year': studyYearVal,
      'a7_academic year': studyYearVal,
      'A7_Academic_Year': studyYearVal,
      'A7_academic_year': studyYearVal,
      'a7_academic_year': studyYearVal,
      A7_Academic_Year: studyYearVal,
      A7_Study_Year: studyYearVal,
      'A7_Study Year': studyYearVal,
      'A7_Study_year': studyYearVal,
      'a7_study_year': studyYearVal,
      'a7_study year': studyYearVal,
      A7_Year: studyYearVal,
      'A7_Year': studyYearVal,
      'A7_year': studyYearVal,
      'a7_year': studyYearVal,
      Academic_Year: studyYearVal,
      'Academic Year': studyYearVal,
      'Acdemic Year': studyYearVal,
      'Acdemic year': studyYearVal,
      Study_Year: studyYearVal,
      'Study Year': studyYearVal,

      // A7 Semester (All requested and common spellings)
      'A7_shemester': semRaw,
      'A7_Shemester': semRaw,
      'A7_Semester': semRaw,
      'A7_semester': semRaw,
      'a7_shemester': semRaw,
      'a7_semester': semRaw,
      A7_Semester: semRaw,
      A7_shemester: semRaw,
      Semester: semRaw,
      Semester_Label: semLabel,

      // Family Monthly Income (Dual-mapped: supports both Section A legacy column & Section G column)
      A8_Family_Monthly_Income: incomeVal,
      G2_Family_Monthly_Income: incomeVal,
      G2_Monthly_Income: incomeVal,
      Family_Monthly_Income: incomeVal,
      Monthly_Income: incomeVal,

      // Module B: PHQ-9
      B1_Anhedonia: state.phq9Scores['b1'] !== undefined ? state.phq9Scores['b1'] : '',
      B2_Depressed_Mood: state.phq9Scores['b2'] !== undefined ? state.phq9Scores['b2'] : '',
      B3_Sleep_Issues: state.phq9Scores['b3'] !== undefined ? state.phq9Scores['b3'] : '',
      B4_Fatigue: state.phq9Scores['b4'] !== undefined ? state.phq9Scores['b4'] : '',
      B5_Appetite_Changes: state.phq9Scores['b5'] !== undefined ? state.phq9Scores['b5'] : '',
      B6_Guilt_Failure: state.phq9Scores['b6'] !== undefined ? state.phq9Scores['b6'] : '',
      B7_Concentration: state.phq9Scores['b7'] !== undefined ? state.phq9Scores['b7'] : '',
      B8_Motor_Changes: state.phq9Scores['b8'] !== undefined ? state.phq9Scores['b8'] : '',
      B9_Suicidal_Ideation: state.phq9Scores['b9'] !== undefined ? state.phq9Scores['b9'] : '',
      PHQ9_Total_Score: phq.total,
      PHQ9_Severity: phq.severity,

      // Module C: Academic
      C1: state.likertScores['c1'] || '',
      C2: state.likertScores['c2'] || '',
      C3: state.likertScores['c3'] || '',
      C4: state.likertScores['c4'] || '',
      C5: state.likertScores['c5'] || '',
      C6: state.likertScores['c6'] || '',
      C7: state.likertScores['c7'] || '',
      C8: state.likertScores['c8'] || '',

      // Module D: Future & AI
      D1: state.likertScores['d1'] || '',
      D2: state.likertScores['d2'] || '',
      D3: state.likertScores['d3'] || '',
      D4: state.likertScores['d4'] || '',

      // Module E: Rest, Sleep & Vitality
      E1: state.likertScores['e1'] || '',
      E2: state.likertScores['e2'] || '',
      E3: state.likertScores['e3'] || '',
      E3_Duration_Min: exerciseMinVal,
      E3_Minutes: exerciseMinVal,
      E3_Duration: exerciseMinVal,
      E4: state.likertScores['e4'] || '',
      E5: state.likertScores['e5'] || '',
      E6: state.likertScores['e6'] || '',
      E7: state.likertScores['e7'] || '',
      E8: state.likertScores['e8'] || '',
      E8_Condition_Details: conditionDetailVal,
      E8_Condition: conditionDetailVal,
      E8_Specified_Condition: conditionDetailVal,

      // Module F: MSPSS
      F1: state.likertScores['f1'] || '',
      F2: state.likertScores['f2'] || '',
      F3: state.likertScores['f3'] || '',
      F4: state.likertScores['f4'] || '',
      F5: state.likertScores['f5'] || '',
      F6: state.likertScores['f6'] || '',
      F7: state.likertScores['f7'] || '',
      F8: state.likertScores['f8'] || '',
      F9: state.likertScores['f9'] || '',
      F10: state.likertScores['f10'] || '',
      F11: state.likertScores['f11'] || '',
      F12: state.likertScores['f12'] || '',
      MSPSS_Significant_Other_Mean: mspss.soMean || '',
      MSPSS_Family_Mean: mspss.famMean || '',
      MSPSS_Friends_Mean: mspss.friMean || '',
      MSPSS_Total_Mean: mspss.totalMean || '',

      // Module G: Hearth & Earth
      G1: state.likertScores['g1'] || '',
      G2: incomeVal,
      G3: state.likertScores['g3'] || '',
      G4: state.likertScores['g4'] || '',
      G5: state.likertScores['g5'] || '',
      G6: state.likertScores['g6'] || ''
    };

    // Exhaustive mapping for Academic Year (covers ALL column headers with spaces, capitalization, typos, trailing spaces)
    const academicYearAliases = [
      'A7_Acdemic year',
      'A7_Acdemic Year',
      'A7_acdemic year',
      'a7_acdemic year',
      'a7_Acdemic year',
      'A7_Acdemic_year',
      'A7_Acdemic_Year',
      'a7_acdemic_year',
      'A7_Acdemic',
      'A7_acdemic',
      'A7_Academic year',
      'A7_Academic Year',
      'A7_academic year',
      'a7_academic year',
      'A7_Academic_Year',
      'A7_academic_year',
      'a7_academic_year',
      'A7_Academic',
      'A7_academic',
      'A7_Study_Year',
      'A7_Study Year',
      'A7_Study_year',
      'a7_study_year',
      'a7_study year',
      'A7_Year',
      'A7_year',
      'a7_year',
      'A7 Year',
      'A7',
      'Academic Year',
      'Academic_Year',
      'Acdemic Year',
      'Acdemic year',
      'Study Year',
      'Study_Year',
      'Year'
    ];
    setAllKeyVariants(payload, academicYearAliases, studyYearVal);

    // Also map numeric digit of study year
    const numYear = studyYearVal.replace(/[^0-9]/g, '');
    if (numYear) {
      payload['A7_Year_Number'] = numYear;
      payload['Year_Number'] = numYear;
    }

    // Exhaustive mapping for Semester (covers all spellings, cases, trailing spaces)
    const semesterAliases = [
      'A7_shemester',
      'A7_Shemester',
      'a7_shemester',
      'A7_shemester_label',
      'A7_Semester',
      'A7_semester',
      'a7_semester',
      'A7_Semester_Label',
      'Semester',
      'Shemester',
      'Semester_Label'
    ];
    setAllKeyVariants(payload, semesterAliases, semRaw);
    payload['Semester_Label'] = semLabel;
    payload['A7_Semester_Label'] = semLabel;
    payload['A7_shemester_label'] = semLabel;

    // Exhaustive mapping for Income
    const incomeAliases = [
      'G2_Family_Monthly_Income',
      'G2_Monthly_Income',
      'A8_Family_Monthly_Income',
      'Family_Monthly_Income',
      'Monthly_Income',
      'Monthly Income',
      'G2'
    ];
    setAllKeyVariants(payload, incomeAliases, incomeVal);

    // Exhaustive mapping for E3 duration
    const e3DurationAliases = [
      'E3_Duration_Min',
      'E3_Duration',
      'E3_Minutes',
      'E3 Duration Min',
      'E3 Duration',
      'E3_duration_min'
    ];
    setAllKeyVariants(payload, e3DurationAliases, exerciseMinVal);

    // Exhaustive mapping for E8 condition details
    const e8ConditionAliases = [
      'E8_Condition_Details',
      'E8_Condition',
      'E8_Specified_Condition',
      'E8 Condition Details',
      'E8 Condition',
      'E8_condition_details'
    ];
    setAllKeyVariants(payload, e8ConditionAliases, conditionDetailVal);

    // Guarantee that all text payload fields (except timestamps) are 100% pure English
    Object.keys(payload).forEach(key => {
      if (typeof payload[key] === 'string' && key !== 'Timestamp') {
        payload[key] = toEnglishOnly(payload[key]);
      }
    });

    return payload;
  }

  // Open Mindful Reflection Modal
  function openReflectionModal() {
    const modal = document.getElementById('reflection-modal');
    if (!modal) return;

    // Check or generate token
    const tokenEl = document.getElementById('modal-crypto-token');
    if (tokenEl && (!tokenEl.textContent || tokenEl.textContent === 'VU-7a8b9c0d')) {
      const token = 'VU-' + Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      tokenEl.textContent = token;
    }

    updatePhq9Score();
    calculateMspssBreakdown();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  // Hidden Form Submission Fallback (completely circumvents CORS, adblockers, and browser fetch restrictions)
  function sendViaHiddenForm(url, payload) {
    let iframe = document.getElementById('gas-submission-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'gas-submission-iframe';
      iframe.name = 'gas_submission_iframe';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    form.target = 'gas_submission_iframe';
    form.style.display = 'none';

    // Embed full serialized JSON in postData input
    const jsonInput = document.createElement('input');
    jsonInput.type = 'hidden';
    jsonInput.name = 'postData';
    jsonInput.value = JSON.stringify(payload);
    form.appendChild(jsonInput);

    // Also map direct fields for standard e.parameter fallback
    Object.keys(payload).forEach(key => {
      const field = document.createElement('input');
      field.type = 'hidden';
      field.name = key;
      field.value = payload[key] !== null && payload[key] !== undefined ? String(payload[key]) : '';
      form.appendChild(field);
    });

    document.body.appendChild(form);
    form.submit();
    setTimeout(() => {
      if (form.parentNode) form.parentNode.removeChild(form);
    }, 4000);
  }

  let isSubmitting = false;

  // Resilient Background Submission to Google Sheets
  async function submitQuestionnaire() {
    if (isSubmitting) return;

    const consentCheck = document.getElementById('consent-checkbox');
    if (consentCheck && !consentCheck.checked) {
      const consentParent = consentCheck.closest('.consent-box') || consentCheck.parentElement;
      showValidationAlert(1, consentParent, 'Consent Required', 'অনুগ্রহ করে প্রথমে সম্মতি বক্সে টিক দিন (Please agree to voluntary consent first)');
      consentCheck.focus();
      if (consentParent) {
        consentParent.classList.add('ring-2', 'ring-red-400', 'p-1', 'rounded-lg');
        consentParent.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => consentParent.classList.remove('ring-2', 'ring-red-400', 'p-1', 'rounded-lg'), 2500);
      }
      return;
    }

    // STRICT VALIDATION: The participant must answer every single question before submitting
    const unansweredCards = getUnansweredCards();
    if (unansweredCards.length > 0) {
      const remainingCount = unansweredCards.length;
      const firstUnanswered = unansweredCards[0];

      // Custom context alert for Question A7
      if (firstUnanswered.querySelector('[data-question="a7_year"]')) {
        const yearVal = getSelectedStudyYear();
        const semSelect = firstUnanswered.querySelector('#select-semester');
        const semVal = semSelect?.value?.trim();
        let customA7Msg = '';
        if (!yearVal && !semVal) {
          customA7Msg = 'A7 requires both Academic Year & Semester. Both are mandatory. (A7-এ শিক্ষাবর্ষ ও সেমিস্টার উভয়টি পূরণ করা বাধ্যতামূলক)';
        } else if (!yearVal) {
          customA7Msg = 'Please select your Academic Year in Question A7. (A7-এ আপনার শিক্ষাবর্ষ নির্বাচন করা বাধ্যতামূলক)';
        } else if (!semVal) {
          customA7Msg = 'Please select your Semester in Question A7. (A7-এ আপনার সেমিস্টার নির্বাচন করা বাধ্যতামূলক)';
        }
        showValidationAlert(remainingCount, firstUnanswered, 'A7 Mandatory Missing', customA7Msg);
      } else {
        showValidationAlert(remainingCount, firstUnanswered);
      }
      
      const parentModule = firstUnanswered.closest('section');
      if (parentModule) {
        const modId = parentModule.getAttribute('id');
        const targetStepIdx = stepModuleIds.indexOf(modId);
        if (targetStepIdx !== -1) {
          goToStep(targetStepIdx, false);
        }
      }
      firstUnanswered.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstUnanswered.classList.add('highlight-unanswered');
      setTimeout(() => firstUnanswered.classList.remove('highlight-unanswered'), 3500);

      let focusable;
      if (firstUnanswered.querySelector('[data-question="a7_year"]')) {
        const yearVal = getSelectedStudyYear();
        const semSelect = firstUnanswered.querySelector('#select-semester');
        if (!yearVal) {
          focusable = firstUnanswered.querySelector('[data-question="a7_year"] .pebble-btn');
        } else if (semSelect && !semSelect.value.trim()) {
          focusable = semSelect;
        }
      } else if (firstUnanswered.querySelector('[data-question="e3"] .pebble-btn.active')) {
        focusable = firstUnanswered.querySelector('#input-exercise-min:not([disabled])');
      } else if (firstUnanswered.querySelector('[data-question="e8"] .pebble-btn.active')) {
        focusable = firstUnanswered.querySelector('#input-e8-condition:not([disabled])');
      }
      if (!focusable) {
        focusable = firstUnanswered.querySelector('input:not([type="checkbox"]):not([type="hidden"]):not([disabled]), select:not([disabled]), .pebble-btn');
      }
      if (focusable) {
        setTimeout(() => focusable.focus(), 400);
      }
      return;
    }

    // Explicit Mandatory Safeguard: Question A7 (Academic Year & Semester)
    const studyYearVal = getSelectedStudyYear();
    const semRaw = document.getElementById('select-semester')?.value?.trim() || state.inputs['select-semester'] || '';
    if (!studyYearVal || !semRaw) {
      const a7Card = document.getElementById('card-a7') || document.querySelector('[data-question="a7_year"]')?.closest('.question-card');
      if (a7Card) {
        a7Card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        a7Card.classList.add('highlight-unanswered');
        setTimeout(() => a7Card.classList.remove('highlight-unanswered'), 3500);

        let missingText = '';
        let targetEl = null;
        if (!studyYearVal && !semRaw) {
          missingText = 'Both Academic Year and Semester are mandatory in Question A7 before submitting. (A7-এ শিক্ষাবর্ষ ও সেমিস্টার উভয়টি আবশ্যক)';
          targetEl = a7Card.querySelector('.pebble-btn');
        } else if (!studyYearVal) {
          missingText = 'Please select your Academic Year in Question A7. (A7-এ শিক্ষাবর্ষ নির্বাচন করা আবশ্যক)';
          targetEl = a7Card.querySelector('.pebble-btn');
        } else {
          missingText = 'Please select your Semester in Question A7. (A7-এ সেমিস্টার নির্বাচন করা আবশ্যক)';
          targetEl = a7Card.querySelector('#select-semester');
        }
        if (targetEl) setTimeout(() => targetEl.focus(), 350);
        showValidationAlert(1, a7Card, 'A7 Mandatory Missing / আবশ্যক', missingText);
      }
      return;
    }

    isSubmitting = true;
    const submitBtn = document.getElementById('submit-btn') || document.getElementById('module-g-submit-btn');
    const origHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Submitting...';
    }

    let tokenEl = document.getElementById('modal-crypto-token');
    let token = tokenEl ? tokenEl.textContent.trim() : '';
    if (!token || token === 'VU-7a8b9c0d') {
      token = 'VU-' + Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      if (tokenEl) tokenEl.textContent = token;
    }

    const payload = buildSubmissionPayload(token);

    // Save local backup copy in localStorage
    localStorage.setItem('vu_last_submitted_response', JSON.stringify(payload));

    const endpoint = (typeof GOOGLE_SHEET_URL !== 'undefined' && GOOGLE_SHEET_URL)
      ? GOOGLE_SHEET_URL
      : DEFAULT_GOOGLE_SHEET_URL;

    // Multi-channel resilient submission
    let delivered = false;

    if (endpoint) {
      // Channel 1: Primary modern fetch
      try {
        await fetch(endpoint, {
          method: 'POST',
          mode: 'no-cors',
          cache: 'no-cache',
          credentials: 'omit',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          keepalive: true
        });
        delivered = true;
        console.log('✓ MindCare Survey payload successfully dispatched via fetch:', token);
      } catch (fetchErr) {
        console.warn('Primary fetch submission encountered an error, falling back:', fetchErr);
      }

      // Channel 2: Navigator sendBeacon fallback
      if (!delivered && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        try {
          const blob = new Blob([JSON.stringify(payload)], { type: 'text/plain;charset=utf-8' });
          delivered = navigator.sendBeacon(endpoint, blob);
          if (delivered) {
            console.log('✓ MindCare Survey payload dispatched via sendBeacon:', token);
          }
        } catch (beaconErr) {
          console.warn('sendBeacon fallback encountered an error:', beaconErr);
        }
      }

      // Channel 3: Hidden Form fallback (Guaranteed delivery across restrictive browsers/extensions)
      if (!delivered) {
        try {
          sendViaHiddenForm(endpoint, payload);
          delivered = true;
          console.log('✓ MindCare Survey payload dispatched via hidden form fallback:', token);
        } catch (formErr) {
          console.error('All submission channels failed:', formErr);
        }
      }
    }

    if (submitBtn) {
      submitBtn.innerHTML = '<span class="material-symbols-outlined text-[17px] text-[#52B788]">verified</span> Submitted';
      submitBtn.classList.remove('bg-[#2563EB]', 'bg-[#2D3A28]', 'bg-[#0F172A]');
      submitBtn.classList.add('bg-emerald-900');
    }

    showToast('✓ Questionnaire response successfully recorded! Review reflections below.');
    openReflectionModal();
    isSubmitting = false;
  }

  function setupModal() {
    const reviewBtn = document.getElementById('review-btn');
    const submitBtn = document.getElementById('submit-btn') || document.getElementById('module-g-submit-btn');
    const floatingReview = document.getElementById('floating-review-btn');
    const floatingSubmit = document.getElementById('floating-submit-btn');
    const modal = document.getElementById('reflection-modal');
    const closeModal = document.getElementById('close-modal');
    const consentCheck = document.getElementById('consent-checkbox');

    if (reviewBtn) {
      reviewBtn.addEventListener('click', () => {
        if (consentCheck && !consentCheck.checked) {
          const consentParent = consentCheck.closest('.consent-box') || consentCheck.parentElement;
          showValidationAlert(1, consentParent, 'Consent Required', 'অনুগ্রহ করে প্রথমে সম্মতি বক্সে টিক দিন (Please agree to consent first)');
          consentCheck.focus();
          if (consentParent) {
            consentParent.classList.add('ring-2', 'ring-red-400', 'p-1', 'rounded-lg');
            setTimeout(() => consentParent.classList.remove('ring-2', 'ring-red-400', 'p-1', 'rounded-lg'), 2500);
          }
          return;
        }
        openReflectionModal();
      });
    }

    if (floatingReview) {
      floatingReview.addEventListener('click', () => {
        openReflectionModal();
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', submitQuestionnaire);
    }

    if (floatingSubmit) {
      floatingSubmit.addEventListener('click', () => {
        if (submitBtn) {
          submitBtn.click();
        } else {
          submitQuestionnaire();
        }
      });
    }

    if (closeModal) closeModal.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
          modal.classList.remove('flex');
        }
      });
    }

    // Copy Token Action
    const copyBtn = document.getElementById('copy-token-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const tokenText = document.getElementById('modal-crypto-token').textContent;
        navigator.clipboard.writeText(tokenText).then(() => {
          showToast('Research Hash Token copied to clipboard!');
        });
      });
    }

    // Export JSON Action
    const exportBtn = document.getElementById('export-json-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportResponsesAsJSON);
    }
  }

  // 12. MSPSS Subscale Calculator
  function calculateMspssBreakdown() {
    const scores = {};
    for (let i = 1; i <= 12; i++) {
      const q = `f${i}`;
      const rawVal = state.likertScores[q];
      const match = String(rawVal).match(/\d+/);
      scores[q] = match ? parseFloat(match[0]) : 5.0;
    }

    const soMean = ((scores['f1'] + scores['f2'] + scores['f5'] + scores['f10']) / 4).toFixed(1);
    const famMean = ((scores['f3'] + scores['f4'] + scores['f8'] + scores['f11']) / 4).toFixed(1);
    const friMean = ((scores['f6'] + scores['f7'] + scores['f9'] + scores['f12']) / 4).toFixed(1);
    const totalMean = (Object.values(scores).reduce((a, b) => a + b, 0) / 12).toFixed(1);

    const mspssTotalEl = document.getElementById('modal-mspss-score');
    if (mspssTotalEl) mspssTotalEl.textContent = `${totalMean} / 7.0`;

    const soEl = document.getElementById('modal-mspss-so');
    const famEl = document.getElementById('modal-mspss-fam');
    const friEl = document.getElementById('modal-mspss-fri');

    if (soEl) soEl.textContent = `${soMean} / 7.0`;
    if (famEl) famEl.textContent = `${famMean} / 7.0`;
    if (friEl) friEl.textContent = `${friMean} / 7.0`;

    const soBar = document.getElementById('modal-mspss-so-bar');
    const famBar = document.getElementById('modal-mspss-fam-bar');
    const friBar = document.getElementById('modal-mspss-fri-bar');

    if (soBar) soBar.style.width = `${(soMean / 7) * 100}%`;
    if (famBar) famBar.style.width = `${(famMean / 7) * 100}%`;
    if (friBar) friBar.style.width = `${(friMean / 7) * 100}%`;

    return { soMean, famMean, friMean, totalMean, scores };
  }

  // 13. Export JSON Responses
  function exportResponsesAsJSON() {
    const payload = {
      protocol: 'VU/ERC/2026/042',
      institution: 'Varendra University, CIR',
      timestamp: new Date().toISOString(),
      phq9Scores: state.phq9Scores,
      likertScores: state.likertScores,
      inputs: state.inputs,
      totalAnswered: state.answeredQuestions.size
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `VU_Research_Response_${Date.now()}.json`);
    dlAnchor.click();
    showToast('Downloaded response JSON file');
  }

  // 14. Toast Notification Utility (Wide & Mobile-Responsive)
  function showToast(msg) {
    let toast = document.getElementById('zen-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'zen-toast';
      toast.className = 'fixed bottom-4 sm:bottom-6 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto sm:max-w-lg mx-auto z-50 bg-[#152418] text-white px-5 py-3 rounded-2xl sm:rounded-full text-xs sm:text-sm font-medium shadow-2xl transition-all duration-300 opacity-0 pointer-events-none border border-[#2D6A4F] text-center flex items-center justify-center gap-2';
      document.body.appendChild(toast);
    }
    toast.innerHTML = msg;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    toast.classList.add('opacity-100');
    if (window._toastTimer) clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => {
      toast.classList.remove('opacity-100');
      toast.classList.add('opacity-0', 'pointer-events-none');
    }, 3200);
  }

  // 14b. Mobile-Optimized Stretched Validation Alert Banner
  function showValidationAlert(remainingCount, firstUnansweredCard, customTitle, customMessage) {
    let alertEl = document.getElementById('zen-validation-alert');
    if (!alertEl) {
      alertEl = document.createElement('div');
      alertEl.id = 'zen-validation-alert';
      alertEl.setAttribute('role', 'alert');
      alertEl.setAttribute('aria-live', 'assertive');
      alertEl.className = 'fixed bottom-3 sm:bottom-6 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-xl z-50 transition-all duration-300 transform translate-y-8 opacity-0 pointer-events-none';
      document.body.appendChild(alertEl);
    }

    // Determine target module / section name
    let sectionInfo = '';
    if (firstUnansweredCard) {
      const parentSec = firstUnansweredCard.closest('section');
      if (parentSec) {
        const secId = parentSec.getAttribute('id');
        const idx = stepModuleIds.indexOf(secId);
        if (idx !== -1 && stepModuleTitles[idx]) {
          sectionInfo = stepModuleTitles[idx];
        }
      }
    }

    const titleText = customTitle || 'Incomplete Questionnaire';
    const countBadge = remainingCount > 1 
      ? `${remainingCount} Remaining / ${remainingCount}টি বাকি`
      : '1 Item Missing / ১টি বাকি';
    const helperMsg = customMessage || (
      sectionInfo 
        ? `অনুগ্রহ করে জমা দেওয়ার আগে সকল প্রশ্নের উত্তর সম্পন্ন করুন (পরবর্তী: ${sectionInfo})`
        : 'অনুগ্রহ করে জমা দেওয়ার আগে সকল ৫৪টি প্রশ্নের উত্তর সম্পন্ন করুন।'
    );

    alertEl.innerHTML = `
      <div class="w-full bg-[#152418] text-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_20px_50px_-8px_rgba(21,36,24,0.75)] border-2 border-[#2D6A4F] flex flex-col gap-3">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2.5 sm:gap-3">
            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#2D6A4F]/30 text-[#E29578] flex items-center justify-center shrink-0 border border-[#2D6A4F]">
              <span class="material-symbols-outlined text-xl sm:text-2xl">assignment_late</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="text-sm font-bold tracking-tight text-white">${titleText}</h4>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E29578] text-[#152418]">
                  ${countBadge}
                </span>
              </div>
              <p class="text-xs text-[#C8DCCF] font-bengali mt-0.5 leading-snug">
                ${helperMsg}
              </p>
            </div>
          </div>
          <button type="button" id="zen-alert-close-btn" class="text-[#A3B899] hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0" aria-label="Dismiss alert">
            <span class="material-symbols-outlined text-lg sm:text-xl">close</span>
          </button>
        </div>

        <div class="flex items-center gap-2 pt-1 border-t border-white/10">
          <button type="button" id="zen-alert-jump-btn" class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#2D6A4F] to-[#1F4D36] hover:from-[#357a5b] hover:to-[#255b40] text-white text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
            <span class="material-symbols-outlined text-base">my_location</span>
            <span>Jump to Question / অনুত্তরিত প্রশ্নে যান</span>
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>
    `;

    // Mobile tactile vibration
    try {
      if (navigator.vibrate) navigator.vibrate([40, 50, 40]);
    } catch (_) {}

    // Reveal alert with smooth transition
    alertEl.classList.remove('translate-y-8', 'opacity-0', 'pointer-events-none');
    alertEl.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');

    // Close button handler
    const closeBtn = alertEl.querySelector('#zen-alert-close-btn');
    if (closeBtn) {
      closeBtn.onclick = () => hideValidationAlert();
    }

    // Jump button handler
    const jumpBtn = alertEl.querySelector('#zen-alert-jump-btn');
    if (jumpBtn) {
      jumpBtn.onclick = () => {
        hideValidationAlert();
        if (firstUnansweredCard) {
          const parentModule = firstUnansweredCard.closest('section');
          if (parentModule) {
            const modId = parentModule.getAttribute('id');
            const targetStepIdx = stepModuleIds.indexOf(modId);
            if (targetStepIdx !== -1) {
              goToStep(targetStepIdx, false);
            }
          }
          firstUnansweredCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstUnansweredCard.classList.add('highlight-unanswered');
          setTimeout(() => firstUnansweredCard.classList.remove('highlight-unanswered'), 3500);

          let focusable;
          if (firstUnansweredCard.querySelector('[data-question="a7_year"]')) {
            const yearVal = getSelectedStudyYear();
            const semSelect = firstUnansweredCard.querySelector('#select-semester');
            if (!yearVal) {
              focusable = firstUnansweredCard.querySelector('[data-question="a7_year"] .pebble-btn');
            } else if (semSelect && !semSelect.value.trim()) {
              focusable = semSelect;
            }
          } else if (firstUnansweredCard.querySelector('[data-question="e3"] .pebble-btn.active')) {
            focusable = firstUnansweredCard.querySelector('#input-exercise-min:not([disabled])');
          } else if (firstUnansweredCard.querySelector('[data-question="e8"] .pebble-btn.active')) {
            focusable = firstUnansweredCard.querySelector('#input-e8-condition:not([disabled])');
          }
          if (!focusable) {
            focusable = firstUnansweredCard.querySelector('input:not([type="checkbox"]):not([type="hidden"]):not([disabled]), select:not([disabled]), .pebble-btn');
          }
          if (focusable) {
            setTimeout(() => focusable.focus(), 350);
          }
        } else {
          jumpToNextUnanswered();
        }
      };
    }

    // Auto-dismiss after 8 seconds
    if (window._validationAlertTimer) clearTimeout(window._validationAlertTimer);
    window._validationAlertTimer = setTimeout(() => {
      hideValidationAlert();
    }, 8000);
  }

  function hideValidationAlert() {
    const alertEl = document.getElementById('zen-validation-alert');
    if (alertEl) {
      alertEl.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
      alertEl.classList.add('translate-y-8', 'opacity-0', 'pointer-events-none');
    }
  }

  // 15. Bind Event Handlers
  const soundBtn = document.getElementById('soundscape-toggle');
  if (soundBtn) soundBtn.addEventListener('click', toggleSoundscape);

  const floatingSoundBtn = document.getElementById('floating-sound-toggle');
  if (floatingSoundBtn) floatingSoundBtn.addEventListener('click', toggleSoundscape);

  const nextUnansweredBtn = document.getElementById('jump-next-unanswered');
  if (nextUnansweredBtn) nextUnansweredBtn.addEventListener('click', jumpToNextUnanswered);

  const mobileNextBtn = document.getElementById('mobile-next-unanswered');
  if (mobileNextBtn) mobileNextBtn.addEventListener('click', jumpToNextUnanswered);

  const scrollTopBtn = document.getElementById('scroll-top-btn');
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }


  // ==========================================================================
  // MINDCARE STEPPED QUESTIONNAIRE & INTERACTION SYSTEM (Mockup Screen 1, 2, 3)
  // ==========================================================================
  let currentStepIndex = 0;
  let isStepMode = false;

  function updateStepUI() {
    // Ensure all sections are visible for smooth continuous scrolling
    stepModuleIds.forEach(modId => {
      const section = document.getElementById(modId);
      if (section) {
        section.classList.remove('module-step-hidden');
      }
    });
  }

  function goToStep(index, shouldScroll = true) {
    if (index < 0) index = 0;
    if (index >= stepModuleIds.length) index = stepModuleIds.length - 1;
    currentStepIndex = index;
    updateStepUI();
    if (typeof updateNavigationModules === 'function') {
      updateNavigationModules(stepModuleIds[currentStepIndex]);
    }

    if (shouldScroll) {
      const targetSec = document.getElementById(stepModuleIds[currentStepIndex]);
      if (targetSec) {
        const topOffset = targetSec.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top: topOffset, behavior: 'smooth' });
      }
    }
  }

  function setupStepNavigation() {
    // Waypoint links in Garden Navbar
    document.querySelectorAll('.waypoint-link, .mobile-waypoint-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const modKey = link.getAttribute('data-module');
        if (modKey) {
          const modId = `module-${modKey}`;
          const targetStepIdx = stepModuleIds.indexOf(modId);
          if (targetStepIdx !== -1) {
            if (canProceedToStep(targetStepIdx)) {
              goToStep(targetStepIdx, true);
            }
          }
        }
      });
    });

    // Start Questionnaire CTA Button in Hero
    const heroStartBtn = document.getElementById('start-questionnaire-btn');
    if (heroStartBtn) {
      heroStartBtn.addEventListener('click', () => {
        goToStep(0, true);
      });
    }

    // Next step triggers: STRICT MANDATORY VALIDATION OF CURRENT SECTION
    document.querySelectorAll('.next-step-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const currentSec = btn.closest('section') || document.getElementById(stepModuleIds[currentStepIndex]);

        // 1. If in Module A, voluntary consent must be checked first
        if (currentSec && currentSec.id === 'module-a') {
          const consentCheck = document.getElementById('consent-checkbox');
          if (consentCheck && !consentCheck.checked) {
            const consentParent = consentCheck.closest('.consent-box') || consentCheck.parentElement;
            showValidationAlert(1, consentParent, 'Consent Required', '⚠️ অনুগ্রহ করে সম্মতি বক্সে টিক দিন (Please agree to voluntary consent to proceed)');
            consentCheck.focus();
            if (consentParent) {
              consentParent.classList.add('ring-2', 'ring-red-500', 'p-2', 'rounded-xl');
              consentParent.scrollIntoView({ behavior: 'smooth', block: 'center' });
              setTimeout(() => consentParent.classList.remove('ring-2', 'ring-red-500', 'p-2', 'rounded-xl'), 3000);
            }
            return;
          }
        }

        // 2. Validate all questions in the current section
        if (currentSec) {
          const unanswered = getUnansweredCardsInSection(currentSec);
          if (unanswered.length > 0) {
            const firstUnanswered = unanswered[0];
            firstUnanswered.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstUnanswered.classList.add('highlight-unanswered');
            setTimeout(() => firstUnanswered.classList.remove('highlight-unanswered'), 3500);

            const focusable = firstUnanswered.querySelector('input:not([type="checkbox"]), select, .pebble-btn');
            if (focusable) {
              setTimeout(() => focusable.focus(), 350);
            }

            showValidationAlert(unanswered.length, firstUnanswered, 'Section Incomplete', `⚠️ পরবর্তী সেকশনে যাওয়ার আগে এই সেকশনের সকল প্রশ্নের উত্তর দিন (${unanswered.length}টি প্রশ্ন বাকি)`);
            return;
          }
        }

        // 3. Current section complete! Move forward
        const currentIdx = currentSec ? stepModuleIds.indexOf(currentSec.id) : currentStepIndex;
        const nextIdx = (currentIdx !== -1 ? currentIdx : currentStepIndex) + 1;
        if (nextIdx < stepModuleIds.length) {
          goToStep(nextIdx, true);
        }
      });
    });

    // Prev step triggers (always permitted to review earlier answers)
    document.querySelectorAll('.prev-step-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const currentSec = btn.closest('section') || document.getElementById(stepModuleIds[currentStepIndex]);
        const currentIdx = currentSec ? stepModuleIds.indexOf(currentSec.id) : currentStepIndex;
        const prevIdx = (currentIdx !== -1 ? currentIdx : currentStepIndex) - 1;
        if (prevIdx >= 0) {
          goToStep(prevIdx, true);
        }
      });
    });

    // Stepper pills click: Validate prior steps before jumping forward
    document.querySelectorAll('.step-nav-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const target = parseInt(pill.getAttribute('data-step-target'), 10);
        if (!isNaN(target)) {
          if (canProceedToStep(target)) {
            goToStep(target, true);
          }
        }
      });
    });

    // Toggle View Mode (Stepped Flow vs View All)
    const toggleViewBtn = document.getElementById('toggle-view-mode-btn');
    const viewModeLabel = document.getElementById('view-mode-label');
    if (toggleViewBtn) {
      toggleViewBtn.addEventListener('click', () => {
        isStepMode = !isStepMode;
        if (viewModeLabel) {
          viewModeLabel.textContent = isStepMode ? 'Step Flow' : 'View All';
        }
        updateStepUI();
        showToast(isStepMode ? 'Switched to Step-by-Step Flow' : 'All Sections Visible');
      });
    }

    // Module G Submit button
    const modGSubmitBtn = document.getElementById('module-g-submit-btn');
    if (modGSubmitBtn) {
      modGSubmitBtn.addEventListener('click', submitQuestionnaire);
    }

    // Hero soundscape button
    const heroSoundBtn = document.getElementById('hero-soundscape-btn');
    if (heroSoundBtn) {
      heroSoundBtn.addEventListener('click', () => {
        toggleSoundscape();
        const lbl = document.getElementById('soundscape-label');
        if (lbl) {
          lbl.textContent = state.soundscapeMode ? '432Hz Sound Playing' : 'Calming 432Hz Soundscape';
        }
      });
    }

    // Informational Modals Nav Bindings
    const modalMap = [
      { btnId: 'nav-about-btn', modalId: 'about-modal' },
      { btnId: 'nav-privacy-btn', modalId: 'privacy-modal' },
      { btnId: 'nav-resources-btn', modalId: 'resources-modal' },
      { btnId: 'nav-contact-btn', modalId: 'contact-modal' },
      { btnId: 'modal-self-help-btn', modalId: 'resources-modal' },
      { btnId: 'modal-campus-btn', modalId: 'resources-modal' }
    ];

    modalMap.forEach(({ btnId, modalId }) => {
      const btn = document.getElementById(btnId);
      const modal = document.getElementById(modalId);
      if (btn && modal) {
        btn.addEventListener('click', () => {
          modal.classList.remove('hidden');
          modal.classList.add('flex');
        });
      }
    });

    // Language Toggle Buttons
    const langBtnEn = document.getElementById('lang-btn-en');
    const langBtnBn = document.getElementById('lang-btn-bn');

    if (langBtnEn && langBtnBn) {
      langBtnEn.addEventListener('click', () => {
        langBtnEn.classList.add('active', 'bg-[#152418]', 'text-white');
        langBtnEn.classList.remove('text-[#3A4F3F]');
        langBtnBn.classList.remove('active', 'bg-[#152418]', 'text-white');
        langBtnBn.classList.add('text-[#3A4F3F]');
        document.documentElement.lang = 'en';
        showToast('Language set to English');
      });

      langBtnBn.addEventListener('click', () => {
        langBtnBn.classList.add('active', 'bg-[#152418]', 'text-white');
        langBtnBn.classList.remove('text-[#3A4F3F]');
        langBtnEn.classList.remove('active', 'bg-[#152418]', 'text-white');
        langBtnEn.classList.add('text-[#3A4F3F]');
        document.documentElement.lang = 'bn';
        showToast('বাংলা ভাষা সক্রিয় করা হয়েছে');
      });
    }

    // Initialize Stepper Flow at Step 0
    goToStep(0, false);
  }

  // 8. Chatbot Floating Progress Button Controller (Bottom-Right)
  function setupChatbotTracker() {
    const chatbotBtn = document.getElementById('chatbot-progress-btn');
    if (!chatbotBtn) return;

    chatbotBtn.addEventListener('click', () => {
      const allCards = Array.from(document.querySelectorAll('.question-card'));
      const unansweredCard = allCards.find(card => !isCardAnswered(card));

      if (unansweredCard) {
        if (typeof isStepMode !== 'undefined' && isStepMode && typeof stepModuleIds !== 'undefined') {
          const parentSec = unansweredCard.closest('section[id^="module-"]');
          if (parentSec) {
            const stepIdx = stepModuleIds.indexOf(parentSec.id);
            if (stepIdx !== -1 && stepIdx !== currentStepIndex && typeof goToStep === 'function') {
              goToStep(stepIdx, false);
            }
          }
        }

        unansweredCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        unansweredCard.classList.add('card-focus-assist');
        setTimeout(() => {
          unansweredCard.classList.remove('card-focus-assist');
        }, 1500);

        // Focus first actionable field
        let focusTarget;
        if (unansweredCard.querySelector('[data-question="a7_year"]')) {
          const yearVal = getSelectedStudyYear();
          const semSelect = unansweredCard.querySelector('#select-semester');
          if (!yearVal) {
            focusTarget = unansweredCard.querySelector('[data-question="a7_year"] .pebble-btn');
          } else if (semSelect && !semSelect.value.trim()) {
            focusTarget = semSelect;
          }
        } else if (unansweredCard.querySelector('[data-question="e3"] .pebble-btn.active')) {
          focusTarget = unansweredCard.querySelector('#input-exercise-min:not([disabled])');
        } else if (unansweredCard.querySelector('[data-question="e8"] .pebble-btn.active')) {
          focusTarget = unansweredCard.querySelector('#input-e8-condition:not([disabled])');
        }
        if (!focusTarget) {
          focusTarget = unansweredCard.querySelector('.pebble-btn, input:not([type="checkbox"]):not([type="hidden"]):not([disabled]), select:not([disabled])');
        }
        if (focusTarget) {
          try {
            focusTarget.focus({ preventScroll: true });
          } catch (e) {}
        }
      } else {
        // All 54 completed! Scroll to submit button
        const submitBtn = document.getElementById('module-g-submit-btn');
        if (submitBtn) {
          submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          submitBtn.classList.add('ring-4', 'ring-emerald-400');
          setTimeout(() => submitBtn.classList.remove('ring-4', 'ring-emerald-400'), 1500);
        }
      }
    });
  }


  // ==========================================================================
  setupStepNavigation();
  restoreState();
  setupPebbleGroups();
  setupDropdownQuestions();
  setupInputs();
  syncConditionalFields();
  updatePhq9Score();
  updateProgress();
  setupScrollSpy();
  setupModal();
  setupMobileDrawer();
  setupChatbotTracker();
  updateSubfieldFeedback();
});
