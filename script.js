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

  let state = {
    phq9Scores: {},
    likertScores: {},
    inputs: {},
    answeredQuestions: new Set(),
    soundscapeMode: false
  };

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
            const btn = group.querySelector(`[data-value="${val}"], [data-label="${val}"]`);
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

          // Card Answered State
          if (parentCard) {
            parentCard.classList.add('answered');
          }

          // Record Score & State
          if (questionId) {
            state.answeredQuestions.add(questionId);

            if (isPhq) {
              const val = parseInt(btn.getAttribute('data-value'), 10) || 0;
              state.phq9Scores[questionId] = val;
              updatePhq9Score();
            } else {
              const val = btn.getAttribute('data-value') || label;
              state.likertScores[questionId] = val;
            }
          }

          // Highlight Guide Column if present
          highlightGuide(btn);

          updateProgress();
          saveState();
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
          } else {
            parentCard.classList.remove('border-[#2D6A4F]', 'bg-[#F9FCFA]', 'answered');
          }
        }

        updateProgress();
        saveState();
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
      inp.addEventListener('input', () => {
        if (inp.id) {
          state.inputs[inp.id] = inp.value;
          if (inp.value.trim() !== '') {
            state.answeredQuestions.add(inp.id);
            const parent = inp.closest('.question-card');
            if (parent) parent.classList.add('answered');
          }
        }
        updateProgress();
        saveState();
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
    const questionKeys = new Set();

    // Check all pebble button groups
    document.querySelectorAll('[data-pebble-group]').forEach(group => {
      const q = group.getAttribute('data-question');
      if (q && group.querySelector('.pebble-btn.active')) {
        questionKeys.add(q);
      }
    });

    // Check all dropdown questions (Sections C, D, G)
    document.querySelectorAll('select[data-dropdown-question]').forEach(select => {
      const q = select.getAttribute('data-dropdown-question');
      if (q && select.value && select.value.trim() !== '') {
        questionKeys.add(q);
      }
    });

    // Check Input A1 (Age)
    const ageEl = document.getElementById('input-age');
    if (ageEl && ageEl.value.trim() !== '') questionKeys.add('a1');

    // Check Input A2 (Height: ft or in)
    const ftEl = document.getElementById('input-height-ft');
    const inEl = document.getElementById('input-height-in');
    if ((ftEl && ftEl.value.trim() !== '') || (inEl && inEl.value.trim() !== '')) {
      questionKeys.add('a2');
    }

    // Check Input A4 (Weight)
    const wtEl = document.getElementById('input-weight');
    if (wtEl && wtEl.value.trim() !== '') questionKeys.add('a4');

    // Check Input G2 (Income)
    const incEl = document.getElementById('input-income');
    if (incEl && incEl.value.trim() !== '') questionKeys.add('g2');

    const answeredCount = Math.min(TOTAL_CHECKPOINTS, questionKeys.size);
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
        const groups = section.querySelectorAll('[data-pebble-group]');
        if (groups.length > 0) {
          isCompleted = Array.from(groups).every(g => g.querySelector('.pebble-btn.active'));
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

  // 7b. Check If Question Card Is Completed
  function isCardAnswered(card) {
    if (!card) return true;

    // 1. Pebble Button Group
    const group = card.querySelector('[data-pebble-group]');
    if (group) {
      return group.querySelector('.pebble-btn.active') !== null;
    }

    // 2. Input A1 (Age)
    const ageInput = card.querySelector('#input-age');
    if (ageInput) {
      return ageInput.value.trim() !== '';
    }

    // 3. Input A2 (Height: ft or in)
    const ftInput = card.querySelector('#input-height-ft');
    const inInput = card.querySelector('#input-height-in');
    if (ftInput || inInput) {
      return (ftInput && ftInput.value.trim() !== '') || (inInput && inInput.value.trim() !== '');
    }

    // 4. Input A4 (Weight)
    const weightInput = card.querySelector('#input-weight');
    if (weightInput) {
      return weightInput.value.trim() !== '';
    }

    // 5. Input G2 (Income)
    const incomeInput = card.querySelector('#input-income');
    if (incomeInput) {
      return incomeInput.value.trim() !== '';
    }

    // Generic fallback for any other text/number input or select inside card
    const anyInput = card.querySelector('input:not([type="checkbox"]), select');
    if (anyInput) {
      return anyInput.value.trim() !== '';
    }

    return true;
  }

  // Get all currently unanswered question cards in document order
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

  // 8. Smart "Next Unanswered" Navigation
  function jumpToNextUnanswered() {
    const unanswered = getUnansweredCards();
    if (unanswered.length > 0) {
      const card = unanswered[0];
      const parentModule = card.closest('section');
      if (parentModule && isStepMode) {
        const modId = parentModule.getAttribute('id');
        const targetStepIdx = stepModuleIds.indexOf(modId);
        if (targetStepIdx !== -1) {
          goToStep(targetStepIdx, false);
        }
      }
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('highlight-unanswered');
      setTimeout(() => card.classList.remove('highlight-unanswered'), 3000);
      const focusable = card.querySelector('input:not([type="checkbox"]), select, .pebble-btn');
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
        const href = link.getAttribute('href');
        const target = document.querySelector(href);
        closeDrawer();
        if (target) {
          setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
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
  // Silent Google Sheet endpoint loaded from env/env.js
  const GOOGLE_SHEET_URL = (window.__ENV__ && window.__ENV__.GOOGLE_SHEET_URL)
    ? window.__ENV__.GOOGLE_SHEET_URL
    : '';

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

    return {
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
      'B1_Age': document.getElementById('input-age')?.value?.trim() || state.inputs['input-age'] || '',
      'B2_Height': formattedHeight,
      'B3_Weight': document.getElementById('input-weight')?.value?.trim() || state.inputs['input-weight'] || '',
      'B4_Gender': state.likertScores['a3'] || '',
      'B5_Semester': document.getElementById('select-semester')?.value?.trim() || state.inputs['select-semester'] || '',
      'B6_Year': state.likertScores['a7_year'] || '',
      'B7_UniType': 'Varendra University',
      'B8_Living': state.likertScores['a6'] || '',
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
      'E3_Exercise': state.likertScores['e3'] || '',
      'E3_Minutes': state.inputs['input-exercise-min'] || 30,
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
      'G1_Finance': document.getElementById('input-income')?.value?.trim() || state.inputs['input-income'] || '',
      'G2': state.likertScores['g2'] || state.likertScores['g1'] || '',
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
      A1_Age: document.getElementById('input-age')?.value?.trim() || state.inputs['input-age'] || '',
      A2_Height_Ft: htFt,
      A2_Height_In: htIn,
      A3_Gender: state.likertScores['a3'] || '',
      A4_Weight_Kg: document.getElementById('input-weight')?.value?.trim() || state.inputs['input-weight'] || '',
      A5_Relationship_Status: state.likertScores['a5'] || '',
      A6_Living_Arrangement: state.likertScores['a6'] || '',
      A7_Semester: document.getElementById('select-semester')?.value?.trim() || state.inputs['select-semester'] || '',
      A7_Study_Year: state.likertScores['a7_year'] || '',
      A8_Family_Monthly_Income: document.getElementById('input-income')?.value?.trim() || state.inputs['input-income'] || '',

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
      E4: state.likertScores['e4'] || '',
      E5: state.likertScores['e5'] || '',
      E6: state.likertScores['e6'] || '',
      E7: state.likertScores['e7'] || '',
      E8: state.likertScores['e8'] || '',

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
      G3: state.likertScores['g3'] || '',
      G4: state.likertScores['g4'] || '',
      G5: state.likertScores['g5'] || '',
      G6: state.likertScores['g6'] || ''
    };
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

  // Silent Background Submission
  async function submitQuestionnaire() {
    const consentCheck = document.getElementById('consent-checkbox');
    if (consentCheck && !consentCheck.checked) {
      showToast('অনুগ্রহ করে সম্মতি বক্সে টিক দিন (Please agree to voluntary consent)');
      consentCheck.focus();
      const consentParent = consentCheck.closest('.consent-box') || consentCheck.parentElement;
      consentParent.classList.add('ring-2', 'ring-red-400', 'p-1', 'rounded-lg');
      consentParent.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => consentParent.classList.remove('ring-2', 'ring-red-400', 'p-1', 'rounded-lg'), 2500);
      return;
    }

    // STRICT VALIDATION: The participant must answer every single question before submitting
    const unansweredCards = getUnansweredCards();
    if (unansweredCards.length > 0) {
      const remainingCount = unansweredCards.length;
      const firstUnanswered = unansweredCards[0];

      showToast(`⚠️ অনুগ্রহ করে সব প্রশ্নের উত্তর সম্পন্ন করুন (Please complete all questions — আরও ${remainingCount}টি বাকি)`);
      
      const parentModule = firstUnanswered.closest('section');
      if (parentModule && isStepMode) {
        const modId = parentModule.getAttribute('id');
        const targetStepIdx = stepModuleIds.indexOf(modId);
        if (targetStepIdx !== -1) {
          goToStep(targetStepIdx, false);
        }
      }
      firstUnanswered.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstUnanswered.classList.add('highlight-unanswered');
      setTimeout(() => firstUnanswered.classList.remove('highlight-unanswered'), 3500);

      const focusable = firstUnanswered.querySelector('input:not([type="checkbox"]), select, .pebble-btn');
      if (focusable) {
        setTimeout(() => focusable.focus(), 400);
      }
      return;
    }

    const submitBtn = document.getElementById('submit-btn');
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

    // Save local backup copy
    localStorage.setItem('vu_last_submitted_response', JSON.stringify(payload));

    // Quiet background post to Google Sheet if endpoint configured
    if (GOOGLE_SHEET_URL) {
      try {
        await fetch(GOOGLE_SHEET_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.warn('Background sync note:', err);
      }
    }

    if (submitBtn) {
      submitBtn.innerHTML = '<span class="material-symbols-outlined text-sm">check_circle</span> Submitted';
      submitBtn.classList.remove('bg-[#2563EB]', 'bg-[#2D3A28]', 'bg-[#0F172A]');
      submitBtn.classList.add('bg-emerald-900');
    }

    showToast('Questionnaire completed! Review your reflections below.');
    openReflectionModal();
  }

  function setupModal() {
    const reviewBtn = document.getElementById('review-btn');
    const submitBtn = document.getElementById('submit-btn');
    const floatingReview = document.getElementById('floating-review-btn');
    const floatingSubmit = document.getElementById('floating-submit-btn');
    const modal = document.getElementById('reflection-modal');
    const closeModal = document.getElementById('close-modal');
    const consentCheck = document.getElementById('consent-checkbox');

    if (reviewBtn) {
      reviewBtn.addEventListener('click', () => {
        if (consentCheck && !consentCheck.checked) {
          showToast('অনুগ্রহ করে সম্মতি বক্সে টিক দিন (Please agree to consent)');
          consentCheck.focus();
          consentCheck.parentElement.classList.add('ring-2', 'ring-red-400', 'p-1', 'rounded-lg');
          setTimeout(() => consentCheck.parentElement.classList.remove('ring-2', 'ring-red-400', 'p-1', 'rounded-lg'), 2500);
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

  // 14. Toast Notification Utility
  function showToast(msg) {
    let toast = document.getElementById('zen-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'zen-toast';
      toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#152418] text-white px-5 py-2.5 rounded-full text-xs font-medium shadow-xl transition-all duration-300 opacity-0 pointer-events-none border border-[#2D6A4F]';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    toast.classList.add('opacity-100');
    setTimeout(() => {
      toast.classList.remove('opacity-100');
      toast.classList.add('opacity-0', 'pointer-events-none');
    }, 2800);
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
            goToStep(targetStepIdx, true);
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

    // Next step triggers
    document.querySelectorAll('.next-step-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const consentCheck = document.getElementById('consent-checkbox');
        if (consentCheck && !consentCheck.checked) {
          showToast('Please check the voluntary consent box to proceed');
          consentCheck.focus();
          return;
        }
        if (currentStepIndex < stepModuleIds.length - 1) {
          goToStep(currentStepIndex + 1, true);
        }
      });
    });

    // Prev step triggers
    document.querySelectorAll('.prev-step-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        if (currentStepIndex > 0) {
          goToStep(currentStepIndex - 1, true);
        }
      });
    });

    // Stepper pills click
    document.querySelectorAll('.step-nav-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const target = parseInt(pill.getAttribute('data-step-target'), 10);
        if (!isNaN(target)) {
          goToStep(target, true);
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


  // ==========================================================================
  // Falling Snow & Crystalline Particle Engine (2D/3D Drift from Leaves)
  // ==========================================================================
  function initSnowCanvas() {
    const canvas = document.getElementById('snow-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }, { passive: true });

    // Optimal particle count for smooth 60fps across all screens
    const flakeCount = Math.min(85, Math.max(45, Math.floor(window.innerWidth / 18)));
    const flakes = [];

    class Flake {
      constructor(initY = false) {
        this.reset(initY);
      }
      reset(initY = false) {
        // 3D perspective depth layer (0.35 distant to 1.3 close)
        this.z = 0.35 + Math.random() * 0.95;
        this.r = (1.2 + Math.random() * 2.6) * this.z;
        this.alpha = (0.28 + Math.random() * 0.45) * Math.min(1, this.z);

        // 50% of snowflakes spawn directly from the lush green leaves at top corners
        if (Math.random() < 0.5) {
          if (Math.random() < 0.5) {
            // Left corner leaf cluster
            this.x = Math.random() * (width * 0.32);
          } else {
            // Right corner leaf cluster
            this.x = width - Math.random() * (width * 0.32);
          }
          this.y = initY ? Math.random() * height : -10 - Math.random() * 40;
        } else {
          this.x = Math.random() * width;
          this.y = initY ? Math.random() * height : -10 - Math.random() * 20;
        }

        // Falling velocity scaled by 3D depth
        this.vy = (0.7 + Math.random() * 1.3) * this.z;
        this.angle = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 0.035;
        this.windFactor = 0.5 + Math.random() * 0.9;
      }

      update(time, mouseOffset) {
        this.angle += this.spin;
        // Natural 3D horizontal flutter / drift
        const drift = Math.sin(this.angle + time * 0.001) * this.windFactor;
        this.x += drift + mouseOffset * (this.z * 0.22);
        this.y += this.vy;

        // Wrap around smoothly when leaving screen bounds
        if (this.y > height + 10 || this.x < -20 || this.x > width + 20) {
          this.reset(false);
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.shadowColor = 'rgba(214, 235, 222, 0.5)';
        ctx.shadowBlur = this.z > 0.9 ? 4 : 1.5;
        ctx.fill();
      }
    }

    for (let i = 0; i < flakeCount; i++) {
      flakes.push(new Flake(true));
    }

    let mouseOffset = 0;
    let targetMouseOffset = 0;
    window.addEventListener('mousemove', (e) => {
      const norm = (e.clientX / width - 0.5) * 2;
      targetMouseOffset = norm * 0.7;
    }, { passive: true });

    let animId;
    function animate(timestamp) {
      ctx.clearRect(0, 0, width, height);
      mouseOffset += (targetMouseOffset - mouseOffset) * 0.05;

      for (let i = 0; i < flakes.length; i++) {
        flakes[i].update(timestamp, mouseOffset);
        flakes[i].draw();
      }
      animId = requestAnimationFrame(animate);
    }

    animId = requestAnimationFrame(animate);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(animId);
      } else {
        animId = requestAnimationFrame(animate);
      }
    });
  }

  // Initialize
  initSnowCanvas();
  setupStepNavigation();
  restoreState();
  setupPebbleGroups();
  setupDropdownQuestions();
  setupInputs();
  updatePhq9Score();
  updateProgress();
  setupScrollSpy();
  setupModal();
  setupMobileDrawer();
});
