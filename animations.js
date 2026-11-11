/**
 * MindCare — Botanical & Ambient Winter Snow Engine
 * Hallmark Anti-Slop & High-UX Architecture:
 * - Pure background atmospheric layer (z-0) — 100% non-blocking, zero text obstruction
 * - Multi-depth 2D/3D crystalline snowfall with leaf-drip particle mechanics
 * - Natural 3D breeze & organic leaf blade flutter physics
 * - Interactive cursor proximity breeze rustle on leaf boughs
 * - Respects prefers-reduced-motion accessibility
 * - Minimalist ambient toggle integrated cleanly into Hero clearance badges
 */

(function () {
  'use strict';

  // 1. Accessibility Check
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Global Atmosphere State
  const atmosphere = {
    snowActive: !prefersReducedMotion,
    windVectorX: 0,
    windTargetX: 0,
    lastMouseX: null,
    lastMouseY: null
  };

  /* ==========================================================================
     1. HIGH-PERFORMANCE BACKGROUND SNOWFALL CANVAS (z-0)
     ========================================================================== */
  const canvas = document.getElementById('snowfall-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let animationId = null;
    let flakes = [];
    const FLAKE_COUNT = window.innerWidth < 768 ? 40 : 80;

    // Anchor points for subtle leaf-drip snowflakes
    function getLeafAnchors() {
      const anchors = [];
      const tl = document.getElementById('botanical-canopy-tl');
      const tr = document.getElementById('botanical-canopy-tr');

      if (tl) {
        const r = tl.getBoundingClientRect();
        anchors.push(
          { x: r.left + r.width * 0.40, y: r.top + r.height * 0.70 },
          { x: r.left + r.width * 0.75, y: r.top + r.height * 0.85 }
        );
      } else {
        anchors.push({ x: width * 0.12, y: 70 });
      }

      if (tr) {
        const r = tr.getBoundingClientRect();
        anchors.push(
          { x: r.left + r.width * 0.60, y: r.top + r.height * 0.70 },
          { x: r.left + r.width * 0.25, y: r.top + r.height * 0.85 }
        );
      } else {
        anchors.push({ x: width * 0.88, y: 70 });
      }

      return anchors;
    }

    // Snowflake Model (3D Layered Particle)
    class Snowflake {
      constructor(fromFoliage = false) {
        this.reset(fromFoliage);
      }

      reset(fromFoliage = false) {
        // z: 0.35 (deep background) to 1.3 (near foreground)
        this.z = 0.35 + Math.random() * 0.95;
        this.radius = (1.0 + Math.random() * 2.2) * this.z;
        this.baseSpeedY = (0.45 + Math.random() * 1.05) * this.z;
        this.speedY = this.baseSpeedY;
        this.swayAngle = Math.random() * Math.PI * 2;
        this.swaySpeed = 0.01 + Math.random() * 0.02;
        this.swayAmplitude = (0.7 + Math.random() * 1.5) * this.z;
        this.alpha = (0.28 + Math.random() * 0.45) * Math.min(1, this.z);

        if (fromFoliage) {
          const anchors = getLeafAnchors();
          const anchor = anchors[Math.floor(Math.random() * anchors.length)];
          this.x = anchor.x + (Math.random() * 20 - 10);
          this.y = anchor.y + (Math.random() * 14 - 7);
          this.delay = Math.random() * 16;
        } else {
          this.x = Math.random() * width;
          this.y = Math.random() * -height * 0.2;
          this.delay = 0;
        }
      }

      update() {
        if (this.delay > 0) {
          this.delay -= 1;
          this.y += 0.15;
          return;
        }

        this.swayAngle += this.swaySpeed;
        const sway = Math.sin(this.swayAngle) * this.swayAmplitude;

        this.y += this.speedY;
        this.x += sway + atmosphere.windVectorX * (this.z * 1.1);

        // Recycle when falling past viewport
        if (this.y > height + 15) {
          this.reset(Math.random() < 0.28);
        }
        if (this.x > width + 25) this.x = -20;
        if (this.x < -25) this.x = width + 20;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        // Soft pure winter snow with subtle celadon glow
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        if (this.z > 0.9) {
          ctx.shadowColor = 'rgba(216, 235, 219, 0.4)';
          ctx.shadowBlur = 3;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // Populate Initial Snowflakes
    for (let i = 0; i < FLAKE_COUNT; i++) {
      const flake = new Snowflake(i % 4 === 0);
      flake.y = Math.random() * height; // spread on load
      flakes.push(flake);
    }

    // Gentle periodic tumble of snow from the leaf canopies
    setInterval(() => {
      if (!atmosphere.snowActive || document.hidden) return;
      for (let k = 0; k < 2; k++) {
        flakes.push(new Snowflake(true));
        if (flakes.length > FLAKE_COUNT + 10) flakes.shift();
      }
    }, 3800);

    // Render Loop
    function renderSnow() {
      ctx.clearRect(0, 0, width, height);

      // Smoothly return wind to calm ambient drift
      atmosphere.windVectorX += (atmosphere.windTargetX - atmosphere.windVectorX) * 0.035;
      atmosphere.windTargetX *= 0.94;

      if (atmosphere.snowActive) {
        for (let i = 0; i < flakes.length; i++) {
          flakes[i].update();
          flakes[i].draw();
        }
      }

      animationId = requestAnimationFrame(renderSnow);
    }

    if (!prefersReducedMotion) {
      renderSnow();
    }

    // Window Resize
    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }, { passive: true });

    // Subtle Wind Reaction on Pointer Gesture
    window.addEventListener('pointermove', (e) => {
      if (atmosphere.lastMouseX !== null) {
        const deltaX = e.clientX - atmosphere.lastMouseX;
        atmosphere.windTargetX = Math.max(-1.8, Math.min(1.8, deltaX * 0.035));
      }
      atmosphere.lastMouseX = e.clientX;
      atmosphere.lastMouseY = e.clientY;
    }, { passive: true });

    // Pause on Tab Inactivity
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (animationId) cancelAnimationFrame(animationId);
      } else {
        if (atmosphere.snowActive && !prefersReducedMotion) {
          animationId = requestAnimationFrame(renderSnow);
        }
      }
    });
  }

  /* ==========================================================================
     2. AMBIENT TOGGLE CONTROLLER
     Located inside the top clearance badges of #hero-banner
     ========================================================================== */
  function setupAmbientToggle() {
    const btn = document.getElementById('ambient-snow-toggle');
    const label = document.getElementById('ambient-snow-status');
    const tl = document.getElementById('botanical-canopy-tl');
    const tr = document.getElementById('botanical-canopy-tr');

    if (!btn || !label) return;

    btn.addEventListener('click', () => {
      atmosphere.snowActive = !atmosphere.snowActive;

      if (atmosphere.snowActive) {
        label.textContent = 'Winter Ambiance: Active';
        btn.classList.add('bg-[#EAF2EC]', 'text-[#2D6A4F]');
        btn.classList.remove('opacity-60');
        if (tl) tl.style.animationPlayState = 'running';
        if (tr) tr.style.animationPlayState = 'running';
      } else {
        label.textContent = 'Winter Ambiance: Paused';
        btn.classList.remove('bg-[#EAF2EC]');
        btn.classList.add('opacity-60');
        if (tl) tl.style.animationPlayState = 'paused';
        if (tr) tr.style.animationPlayState = 'paused';
      }
    });
  }

  /* ==========================================================================
     3. INTERACTIVE CORNER BREEZE RUSTLE
     Gentle natural deflection when cursor approaches top corners
     ========================================================================== */
  function setupInteractiveLeafRustle() {
    if (prefersReducedMotion) return;

    const tl = document.getElementById('botanical-canopy-tl');
    const tr = document.getElementById('botanical-canopy-tr');
    if (!tl && !tr) return;

    window.addEventListener('pointermove', (e) => {
      // Top-Left Proximity (within 280px of top-left corner)
      if (tl && e.clientX < 280 && e.clientY < 280) {
        const dist = Math.hypot(e.clientX, e.clientY);
        if (dist < 280) {
          const force = (1 - dist / 280) * 3.5;
          tl.style.transform = `perspective(900px) rotate(${force.toFixed(1)}deg) translateY(-${(force * 0.7).toFixed(1)}px)`;
        }
      } else if (tl && tl.style.transform) {
        tl.style.transform = '';
      }

      // Top-Right Proximity (within 280px of top-right corner)
      if (tr && (window.innerWidth - e.clientX) < 280 && e.clientY < 280) {
        const dist = Math.hypot(window.innerWidth - e.clientX, e.clientY);
        if (dist < 280) {
          const force = (1 - dist / 280) * 3.5;
          tr.style.transform = `perspective(900px) rotate(-${force.toFixed(1)}deg) translateY(-${(force * 0.7).toFixed(1)}px)`;
        }
      } else if (tr && tr.style.transform) {
        tr.style.transform = '';
      }
    }, { passive: true });
  }

  /* ==========================================================================
     4. TACTILE CARD HOVER MICRO-INTERACTIONS (Rock-solid Form UX)
     ========================================================================== */
  function setupCleanCardMicroInteractions() {
    const cards = document.querySelectorAll('.question-card');
    cards.forEach((card) => {
      card.style.transform = '';
      card.style.transition = 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease';
    });
  }

  // Initialize on Load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupAmbientToggle();
      setupInteractiveLeafRustle();
      setupCleanCardMicroInteractions();
    });
  } else {
    setupAmbientToggle();
    setupInteractiveLeafRustle();
    setupCleanCardMicroInteractions();
  }
})();
