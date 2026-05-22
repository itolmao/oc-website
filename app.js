/**
 * Seitou Mizuki Secure Node - Main Application Controller
 * Handles background animation, synth audio, SPA routing, and view layouts.
 */

// Global State
const state = {
  currentTheme: 'blue',
  audioEnabled: true,
  audioContext: null,
  ambientHum: null,
  isBooted: false,
  activeVoiceLine: null,
  activeVoiceInterval: null,
  characterStats: {
    intellect: 95,
    rebellion: 85,
    agility: 78,
    empathy: 60,
    techSkill: 98,
    somatics: 72
  }
};

/* ==========================================
   1. WEB AUDIO API SYNTHESIZED SOUNDS
   ========================================== */

function initAudio() {
  if (state.audioContext) return;

  // Create Audio Context (Standard browser audio api)
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  state.audioContext = new AudioContext();
}

function playSynthSound(type) {
  if (!state.audioEnabled) return;
  initAudio();
  if (!state.audioContext) return;

  const ctx = state.audioContext;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  const now = ctx.currentTime;

  switch (type) {
    case 'hover':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1000, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.03);
      gainNode.gain.setValueAtTime(0.02, now);
      gainNode.gain.linearRampToValueAtTime(0.001, now + 0.03);
      osc.start(now);
      osc.stop(now + 0.03);
      break;

    case 'click':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.linearRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
      break;

    case 'success':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.setValueAtTime(800, now + 0.08);
      gainNode.gain.setValueAtTime(0.06, now);
      gainNode.gain.setValueAtTime(0.06, now + 0.08);
      gainNode.gain.linearRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
      break;

    case 'error':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(130, now + 0.2);
      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.linearRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
      break;

    case 'boot':
      // Sweeping frequency resonance
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 1.2);
      gainNode.gain.setValueAtTime(0.05, now);
      gainNode.gain.linearRampToValueAtTime(0.08, now + 0.8);
      gainNode.gain.linearRampToValueAtTime(0.001, now + 1.4);
      osc.start(now);
      osc.stop(now + 1.4);
      break;

    case 'beep-fast':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1500, now);
      gainNode.gain.setValueAtTime(0.015, now);
      gainNode.gain.linearRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
      break;
  }
}

// Start a futuristic ambient hum looping in background
function startAmbientHum() {
  if (!state.audioEnabled) return;
  initAudio();
  if (!state.audioContext || state.ambientHum) return;

  const ctx = state.audioContext;

  // Osc 1: Low Base Hum
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = 65.0; // Low C

  // Osc 2: Minor Third/Fifth overlay for tension
  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.value = 97.5; // G (perfect fifth)

  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = 'lowpass';
  filter.frequency.value = 120; // Filter high frequencies out

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  gainNode.gain.setValueAtTime(0.02, ctx.currentTime);

  osc1.start(0);
  osc2.start(0);

  state.ambientHum = {
    osc1,
    osc2,
    gainNode,
    stop: () => {
      osc1.stop();
      osc2.stop();
    }
  };
}

function stopAmbientHum() {
  if (state.ambientHum) {
    state.ambientHum.stop();
    state.ambientHum = null;
  }
}

function toggleAudio() {
  state.audioEnabled = !state.audioEnabled;
  const btn = document.getElementById('audio-toggle-btn');
  const icon = document.getElementById('audio-status-icon');
  const text = document.getElementById('audio-status-text');

  if (state.audioEnabled) {
    icon.textContent = '🔊';
    text.textContent = 'AUDIO ON';
    btn.style.borderColor = 'var(--color-primary)';
    btn.style.boxShadow = 'var(--glow-primary)';
    if (state.isBooted) {
      startAmbientHum();
    }
  } else {
    icon.textContent = '🔇';
    text.textContent = 'AUDIO OFF';
    btn.style.borderColor = 'var(--color-text-dim)';
    btn.style.boxShadow = 'none';
    stopAmbientHum();
  }
}


/* ==========================================
   2. INTERACTIVE PHOTON PARTICLE SIMULATION
   ========================================== */

const PhotonSimulation = (() => {
  let canvas, ctx;
  let particles = [];
  let mouse = { x: null, y: null, radius: 160 };
  let animationId = null;
  let glitchActive = false;
  let glitchTimer = 0;

  class Particle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.baseRadius = Math.random() * 1.5 + 1;
      this.radius = this.baseRadius;
      // Increased base speed for more dynamic motion
      this.vx = (Math.random() - 0.5) * 2;
      this.vy = (Math.random() - 0.5) * 2;
      this.color = 'rgba(0, 240, 255, 0.4)';
    }

    update() {
      // Check borders
      if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
      if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;

      this.x += this.vx;
      this.y += this.vy;

      // Mouse attraction
      if (mouse.x !== null && mouse.y !== null) {
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius) {
          // Attract particles gently to cursor
          const force = (mouse.radius - dist) / mouse.radius;
          this.x += (dx / dist) * force * 0.7;
          this.y += (dy / dist) * force * 0.7;
          this.radius = this.baseRadius + force * 1.5;
        } else {
          this.radius = this.baseRadius;
        }
      }

      // Check current theme to draw particles
      if (glitchActive) {
        this.color = `rgba(${Math.random() > 0.5 ? '255,0,240' : '0,240,255'}, ${Math.random() * 0.5 + 0.3})`;
      } else {
        const primary = getComputedStyle(document.body).getPropertyValue('--color-primary').trim();
        this.color = primary.startsWith('#') ? hexToRgba(primary, 0.35) : primary;
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      // Apply stronger glow effect
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.fill();
      // Reset shadow for subsequent drawings
      ctx.shadowBlur = 0;
    }
  }

  function hexToRgba(hex, alpha) {
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c = hex.substring(1).split('');
      if (c.length == 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c = '0x' + c.join('');
      return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
    }
    return `rgba(0, 240, 255, ${alpha})`;
  }

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles();
  }

  function initParticles() {
    particles = [];
    // Number of particles depends on screen size
    const quantity = Math.floor((canvas.width * canvas.height) / 1000);
    const particleCap = Math.min(quantity, 350);

    for (let i = 0; i < particleCap; i++) {
      let x = Math.random() * canvas.width;
      let y = Math.random() * canvas.height;
      particles.push(new Particle(x, y));
    }
  }

  function connectParticles() {
    let maxDist = 100;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        let dx = particles[i].x - particles[j].x;
        let dy = particles[i].y - particles[j].y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);

          let opacity = (1 - (dist / maxDist)) * 0.16;
          let theme = getComputedStyle(document.body).getPropertyValue('--color-primary').trim();
          let color = theme.startsWith('#') ? hexToRgba(theme, opacity) : `rgba(235, 7, 7, 0.05, ${opacity})`;
          ctx.strokeStyle = color;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    // Fade previous frame to create trailing effect
    ctx.fillStyle = 'rgba(0, 0,0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (glitchActive) {
      glitchTimer--;
      if (glitchTimer <= 0) glitchActive = false;
    }

    particles.forEach(p => {
      p.update();
      p.draw();
    });
    // Simple collision detection and bounce
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const pi = particles[i];
        const pj = particles[j];
        const dx = pi.x - pj.x;
        const dy = pi.y - pj.y;
        const dist = Math.hypot(dx, dy);
        if (dist < pi.radius + pj.radius) {
          // Swap velocities for elastic bounce effect
          const tempVx = pi.vx;
          const tempVy = pi.vy;
          pi.vx = pj.vx;
          pi.vy = pj.vy;
          pj.vx = tempVx;
          pj.vy = tempVy;
        }
      }
    }
    connectParticles();
    animationId = requestAnimationFrame(animate);
  }

  function triggerGlitch() {
    glitchActive = true;
    glitchTimer = 180; // 3 seconds at 60fps
    particles.forEach(p => {
      p.vx = (Math.random() - 0.5) * 8;
      p.vy = (Math.random() - 0.5) * 8;
    });
  }

  function init() {
    canvas = document.getElementById('photon-canvas');
    ctx = canvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    window.addEventListener('mouseout', () => {
      mouse.x = null;
      mouse.y = null;
    });

    window.addEventListener('triggerGlitch', triggerGlitch);

    animate();
  }

  return {
    init,
    triggerGlitch
  };
})();


/* ==========================================
   3. SYSTEM BOOTUP SEQUENCE
   ========================================== */

function runBootLoader() {
  const container = document.getElementById('boot-lines-container');
  const actionDiv = document.getElementById('boot-action');

  // Style the container for centered text display
  container.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.2rem; text-align: center; flex: 1;';

  const bootLogs = [
    { text: "Subject: Seitou Mizuki", class: "" },
    { text: "Content: Confidential", class: "" },
    { text: "Continue Accessing?", class: "" },
  ];

  // --- YouTube audio cue ---
  // We embed a hidden iframe to play the YouTube audio
  let ytAudioStarted = false;
  function tryPlayYouTubeAudio() {
    if (ytAudioStarted) return;
    ytAudioStarted = true;
    const ytFrame = document.createElement('iframe');
    ytFrame.id = 'yt-boot-audio';
    ytFrame.src = 'https://www.youtube.com/embed/URVHRhBSjj8?autoplay=1&start=0&controls=0&loop=1&playlist=URVHRhBSjj8';
    ytFrame.allow = 'autoplay';
    ytFrame.style.cssText = 'position: fixed; width: 0; height: 0; top: -9999px; left: -9999px; opacity: 0; pointer-events: none;';
    document.body.appendChild(ytFrame);
  }

  // Typewriter audio using Web Audio API
  function playTypewriterTick() {
    if (!state.audioEnabled) return;
    initAudio();
    if (!state.audioContext) return;
    const ctx = state.audioContext;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    const now = ctx.currentTime;
    // Mechanical typewriter click: short burst of noise-like sound
    osc.type = 'square';
    osc.frequency.setValueAtTime(Math.random() > 0.5 ? 320 : 280, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.025);
    gainNode.gain.setValueAtTime(0.04, now);
    gainNode.gain.linearRampToValueAtTime(0.001, now + 0.035);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Type a single line char by char, returns a promise that resolves when done
  function typeLineInto(el, text, charDelay = 55) {
    return new Promise(resolve => {
      let i = 0;
      // blinking cursor element
      const cursor = document.createElement('span');
      cursor.textContent = '|';
      cursor.style.cssText = 'animation: blink 0.7s infinite steps(1); color: var(--color-primary); margin-left: 1px;';
      el.appendChild(cursor);

      function typeNext() {
        if (i < text.length) {
          // Insert char before cursor
          const charNode = document.createTextNode(text[i]);
          el.insertBefore(charNode, cursor);
          i++;
          playTypewriterTick();
          // Slight randomness in delay for organic feel
          const jitter = charDelay + (Math.random() - 0.5) * 20;
          setTimeout(typeNext, jitter);
        } else {
          // Remove cursor after line is done
          cursor.remove();
          resolve();
        }
      }
      typeNext();
    });
  }

  async function runTypingSequence() {
    // Try to trigger YT audio on first user interaction or just attempt it
    tryPlayYouTubeAudio();

    for (let i = 0; i < bootLogs.length; i++) {
      const log = bootLogs[i];
      const p = document.createElement('div');
      p.className = `boot-line ${log.class}`;
      // Larger font for boot lines
      p.style.cssText = 'font-size: 1.25rem; letter-spacing: 0.08rem; text-align: center; min-height: 1.6em;';
      container.appendChild(p);

      await typeLineInto(p, log.text, 60);

      // Pause between lines
      await new Promise(r => setTimeout(r, 320));
    }

    // Show Yes / No buttons
    setTimeout(() => {
      actionDiv.style.display = 'flex';
      actionDiv.style.gap = '1.5rem';
      actionDiv.style.justifyContent = 'center';
    }, 200);
  }

  runTypingSequence();

  // Build Yes/No buttons (replacing single confirm button)
  actionDiv.innerHTML = `
    <button class="cyber-btn" id="boot-yes-btn" style="min-width: 120px;">YES</button>
    <button class="cyber-btn" id="boot-no-btn" style="min-width: 120px; border-color: rgba(239,68,68,0.4); color: #ef4444;">NO</button>
  `;

  setTimeout(() => {
    const yesBtn = document.getElementById('boot-yes-btn');
    const noBtn = document.getElementById('boot-no-btn');

    if (yesBtn) {
      yesBtn.addEventListener('click', () => {
        playSynthSound('success');
        // Stop YouTube audio iframe
        const ytFrame = document.getElementById('yt-boot-audio');
        if (ytFrame) ytFrame.remove();

        const loader = document.getElementById('boot-loader');
        loader.classList.add('fade-out');
        state.isBooted = true;

        if (state.audioEnabled) {
          startAmbientHum();
        }

        setTimeout(() => {
          loader.remove();
          Router.init();
          initThemeSwitcher();
        }, 600);
      });
    }

    if (noBtn) {
      noBtn.addEventListener('click', () => {
        playSynthSound('error');
        window.open('https://www.youtube.com', '_blank');
      });
    }
  }, 100);
}


/* ==========================================
   4. SPA HASH ROUTER
   ========================================== */

const Router = (() => {
  const routes = {
    '/': renderHomeView,
    '/basic-info': renderBasicInfoView,
    '/personality': renderPersonalityView,
    '/family': renderFamilyView,
    '/family/:member': renderFamilyMemberView,
    '/growth-tree': renderGrowthTreeView,
    '/gallery': renderGalleryView,
    '/terminal': renderTerminalView
  };

  const decryptMessages = [
    "ACQUIRING DIRECTORY NODE GATEWAY...",
    "HANDSHAKE PROTOCOL STAGE 2 INITIATED...",
    "PARSING BINARY STREAM STRUCTURES...",
    "VERIFYING DATA PARITY CHECK...",
    "UNSHIELDING NODE RECORDS...",
    "DECRYPTION RAMPING AT 100%"
  ];

  function matchRoute(hash) {
    const cleanHash = hash.replace(/^#/, '') || '/';

    // Exact match check
    if (routes[cleanHash]) {
      return { renderer: routes[cleanHash], params: {} };
    }

    // Param route matching (e.g. /family/:member)
    for (const routePath of Object.keys(routes)) {
      if (routePath.includes('/:')) {
        const pathParts = routePath.split('/');
        const hashParts = cleanHash.split('/');

        if (pathParts.length === hashParts.length) {
          let matches = true;
          let params = {};

          for (let i = 0; i < pathParts.length; i++) {
            if (pathParts[i].startsWith(':')) {
              const paramName = pathParts[i].slice(1);
              params[paramName] = hashParts[i];
            } else if (pathParts[i] !== hashParts[i]) {
              matches = false;
              break;
            }
          }
          if (matches) {
            return { renderer: routes[routePath], params };
          }
        }
      }
    }
    return { renderer: renderHomeView, params: {} };
  }

  function handleRoute() {
    const hash = window.location.hash;
    const { renderer, params } = matchRoute(hash);

    // Play transition decryption loader
    const overlay = document.getElementById('decrypt-overlay');
    const fill = document.getElementById('decrypt-fill');
    const pct = document.getElementById('decrypt-pct');
    const consoleLines = document.getElementById('decrypt-console-lines');

    overlay.classList.add('active');
    consoleLines.innerHTML = "";
    fill.style.width = "0%";
    pct.textContent = "0%";

    let progress = 0;

    // Click audio cue
    playSynthSound('click');

    // Clean active states (like voice line loops)
    if (state.activeVoiceInterval) {
      clearInterval(state.activeVoiceInterval);
      state.activeVoiceInterval = null;
    }
    state.activeVoiceLine = null;

    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= 100) progress = 100;

      fill.style.width = `${progress}%`;
      pct.textContent = `${progress}%`;

      // Play fast micro clicks
      playSynthSound('beep-fast');

      // Random logs output
      if (progress % 20 === 0 || progress >= 95) {
        const msgIndex = Math.min(Math.floor(progress / 20), decryptMessages.length - 1);
        const logLine = document.createElement('div');
        logLine.textContent = `[+] ${decryptMessages[msgIndex]}`;
        consoleLines.appendChild(logLine);
        consoleLines.scrollTop = consoleLines.scrollHeight;
      }

      if (progress === 100) {
        clearInterval(interval);
        setTimeout(() => {
          overlay.classList.remove('active');

          // Render View
          const contentWrapper = document.getElementById('app-content');
          contentWrapper.innerHTML = renderer(params);

          // Post-Render Hooks (like Canvas binding or SVG events)
          triggerPostRender(cleanHashPath(hash), params);
        }, 180);
      }
    }, 80);
  }

  function cleanHashPath(hash) {
    return hash.replace(/^#/, '') || '/';
  }

  function triggerPostRender(path, params) {
    // Scroll window back to top
    window.scrollTo({ top: 0 });

    // Hover Audio binders
    bindGlobalHoverSounds();

    if (path === '/') {
      initHomeEffects();
    } else if (path === '/basic-info') {
      initBasicInfoEffects();
    } else if (path === '/personality') {
      initPersonalityEffects();
    } else if (path === '/family') {
      initFamilyEffects();
    } else if (path.startsWith('/family/')) {
      initFamilyMemberEffects(params.member);
    } else if (path === '/growth-tree') {
      initGrowthTreeEffects();
    } else if (path === '/gallery') {
      initGalleryEffects();
    } else if (path === '/terminal') {
      initTerminalEffects();
    }
  }

  function init() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute(); // Trigger first load routing
  }

  return {
    init
  };
})();

function bindGlobalHoverSounds() {
  const hoverables = document.querySelectorAll('a, button, .node-card, .tree-node-group, .voice-line-item, .gallery-card, .timeline-badge');
  hoverables.forEach(el => {
    // Avoid double binding
    if (el.dataset.hoverSoundBound) return;
    el.dataset.hoverSoundBound = 'true';

    el.addEventListener('mouseenter', () => {
      playSynthSound('hover');
    });
  });
}

// Initialize theme switcher functionality
function initThemeSwitcher() {
  const body = document.body;
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme) {
    body.classList.add('theme-' + storedTheme);
  }
  const buttons = document.querySelectorAll('.theme-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      // Remove any existing theme-* classes
      body.classList.forEach(cls => {
        if (cls.startsWith('theme-')) body.classList.remove(cls);
      });
      body.classList.add('theme-' + theme);
      localStorage.setItem('theme', theme);
    });
  });
}


/* ==========================================
   5. VIEW: HOME DIRECTORY NODE
   ========================================== */

function renderHomeView() {
  return `
    <div class="page-container">
      <!-- Creator Intro Block -->
      <div class="creator-intro cyber-panel" style="margin-bottom: 2rem; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; box-shadow: var(--glow-primary), 0 0 40px rgba(255,255,255,0.06), 0 0 80px rgba(255,255,255,0.03); background: rgba(255,255,255,0.04); border-color: var(--color-border-hover);">
        <h2 class="cyber-title" style="margin: 0;">CREATOR'S NOTE</h2>
        <p style="margin: 1.5; font-family: var(--font-sans); font-size: 0.95rem; color: var(--color-text-muted);">
          I, the author, crafted Seitou Mizuki as an amalgam of cybernetic elegance and rebellious spirit. Inspired by classic "Z3RO" secure nodes, this directory reflects her origins, motivations, and the digital universe she inhabits.
        </p>
        <p style="margin: 0; font-family: var(--font-sans); font-size: 0.95rem; color: var(--color-text-muted);">
          Feel free to explore, remix, and expand her story—add new sections, audio voice lines, and vibrant visuals as her world grows.
        </p>
      </div>
      <div class="intro-block">
        <h2 class="cyber-title">OPERATIVE SECTOR GATEWAY</h2>
        <p>
          Classification metric dossier index: <strong>Subject SEITOU MIZUKI [勢藤美月]</strong>. Surfacing database archives.
          Information nodes compiled across multiple diagnostic segments. Unshield records selectively.
        </p>
      </div>

      <div class="nodes-grid">
        <!-- Node 1: Basic Info -->
        <a href="#/basic-info" class="node-card">
          <div class="node-card-scanline"></div>
          <!-- Poster Image fallback -->
          <div class="node-poster-bg" style="background-image: url('assets/posters/basic_info.png')"></div>
          <div class="node-poster-fallback">
            <svg viewBox="0 0 100 100" width="80" height="80">
              <circle cx="50" cy="50" r="40" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="10 6"></circle>
              <polygon points="50,25 70,65 30,65" stroke="currentColor" stroke-width="1.5" fill="none"></polygon>
            </svg>
          </div>
          <div class="node-number"><span>01 / CARD</span><span class="node-arrow">↗</span></div>
          <div class="node-card-content">
            <h3>BASIC PROFILE</h3>
            <div class="node-desc">System credentials, clearance credentials, physical vitals scanner.</div>
          </div>
        </a>
        <!-- Node 2: Personality -->
        <a href="#/personality" class="node-card">
          <div class="node-card-scanline"></div>
          <div class="node-poster-bg"></div>
          <div class="node-poster-fallback">
            <svg viewBox="0 0 100 100" width="80" height="80">
              <circle cx="50" cy="50" r="40" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="10 6"></circle>
              <polygon points="50,25 70,65 30,65" stroke="currentColor" stroke-width="1.5" fill="none"></polygon>
            </svg>
          </div>
          <div class="node-number"><span>02 / CARD</span><span class="node-arrow">↗</span></div>
          <div class="node-card-content">
            <h3>PERSONALITY</h3>
            <div class="node-desc">Cognitive logs, behavioral analysis, voice line records.</div>
          </div>
        </a>
        <!-- Node 3: Family -->
        <a href="#/family" class="node-card">
          <div class="node-card-scanline"></div>
          <div class="node-poster-bg"></div>
          <div class="node-poster-fallback">
            <svg viewBox="0 0 100 100" width="80" height="80">
              <circle cx="50" cy="50" r="40" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="10 6"></circle>
              <polygon points="50,25 70,65 30,65" stroke="currentColor" stroke-width="1.5" fill="none"></polygon>
            </svg>
          </div>
          <div class="node-number"><span>03 / CARD</span><span class="node-arrow">↗</span></div>
          <div class="node-card-content">
            <h3>FAMILY</h3>
            <div class="node-desc">Lineage flow, relatives, mentors, proxies.</div>
          </div>
        </a>
        <!-- Node 4: Growth Tree -->
        <a href="#/growth-tree" class="node-card">
          <div class="node-card-scanline"></div>
          <div class="node-poster-bg"></div>
          <div class="node-poster-fallback">
            <svg viewBox="0 0 100 100" width="80" height="80">
              <circle cx="50" cy="50" r="40" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="10 6"></circle>
              <polygon points="50,25 70,65 30,65" stroke="currentColor" stroke-width="1.5" fill="none"></polygon>
            </svg>
          </div>
          <div class="node-number"><span>04 / CARD</span><span class="node-arrow">↗</span></div>
          <div class="node-card-content">
            <h3>GROWTH TREE</h3>
            <div class="node-desc">Life timeline, evolution stages.</div>
          </div>
        </a>
        <!-- Node 5: Gallery -->
        <a href="#/gallery" class="node-card">
          <div class="node-card-scanline"></div>
          <div class="node-poster-bg"></div>
          <div class="node-poster-fallback">
            <svg viewBox="0 0 100 100" width="80" height="80">
              <circle cx="50" cy="50" r="40" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="10 6"></circle>
              <polygon points="50,25 70,65 30,65" stroke="currentColor" stroke-width="1.5" fill="none"></polygon>
            </svg>
          </div>
          <div class="node-number"><span>05 / CARD</span><span class="node-arrow">↗</span></div>
          <div class="node-card-content">
            <h3>GALLERY</h3>
            <div class="node-desc">Visual assets, concept art, screenshots.</div>
          </div>
        </a>
        <!-- Node 6: Terminal -->
        <a href="#/terminal" class="node-card">
          <div class="node-card-scanline"></div>
          <div class="node-poster-bg"></div>
          <div class="node-poster-fallback">
            <svg viewBox="0 0 100 100" width="80" height="80">
              <circle cx="50" cy="50" r="40" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="10 6"></circle>
              <polygon points="50,25 70,65 30,65" stroke="currentColor" stroke-width="1.5" fill="none"></polygon>
            </svg>
          </div>
          <div class="node-number"><span>06 / CARD</span><span class="node-arrow">↗</span></div>
          <div class="node-card-content">
            <h3>TERMINAL</h3>
            <div class="node-desc">Interactive console for commands.</div>
          </div>
        </a>
      </div>
    </div>
  `;
}



function initHomeEffects() {
  // Any home page animation hooks can go here
}


/* ==========================================
   6. VIEW: BASIC INFORMATION (BIO vitals)
   ========================================== */

function renderBasicInfoView() {
  return `
    <div class="page-container">
      <div class="cyber-breadcrumbs">
        <a href="#/">GATEWAY</a> &gt; <span>BASIC_INFO</span>
      </div>

      <div class="basic-info-layout">
        <!-- Left panel: Scanner graphics -->
        <div class="cyber-panel somatic-scanner-panel">
          <div class="scan-bar"></div>
          <div class="somatic-label" style="position: absolute; top: 1.5rem; left: 2rem; font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-primary)">SOMATIC BIOMETRIC SCAN</div>
          <div class="scanner-mesh">
            <!-- Outline SVG of character body -->
            <svg viewBox="0 0 100 200">
              <path class="body-shape" d="M50,15 C45,15 42,22 42,28 C42,34 47,40 50,40 C53,40 58,34 58,28 C58,22 55,15 50,15 Z M50,40 C43,45 35,50 32,65 C29,80 25,120 28,150 L34,195 L46,195 L48,155 L50,120 L52,155 L54,195 L66,195 L72,150 C75,120 71,80 68,65 C65,50 57,45 50,40 Z M32,65 L18,100 L23,108 L34,80 Z M68,65 L82,100 L77,108 L66,80 Z" />
            </svg>
          </div>
          
          <div class="medical-ecg-panel">
            <div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--color-text-muted); margin-bottom: 4px; display: flex; justify-content: space-between;">
              <span>ECG HEARTBEAT WAVE</span>
              <span id="bpm-readout">BPM: 74</span>
            </div>
            <canvas id="ecg-canvas"></canvas>
          </div>
        </div>

        <!-- Right panel: Credentials Grid -->
        <div class="cyber-panel" style="display: flex; flex-direction: column; gap: 2rem;">
          <h2 class="cyber-title" style="font-family: var(--font-title); font-size: 1.5rem; border-bottom: 1px solid var(--color-border); padding-bottom: 0.75rem;">CREDENTIAL PROFILE</h2>
          
          <div class="metric-details-grid">
            <div class="metric-card glowing">
              <div class="metric-label">Subject ID</div>
              <div class="metric-value" style="color: var(--color-primary);">SM-2009-SEC</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">True Name</div>
              <div class="metric-value">Seitou Mizuki</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Kanji Identity</div>
              <div class="metric-value">勢藤 美月</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Age Metric</div>
              <div class="metric-value">17 Standard</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Access Credentials</div>
              <div class="metric-value">Clearance Lvl 04</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Affiliation Grid</div>
              <div class="metric-value">Sector 7 Core</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Neural Synapse</div>
              <div class="metric-value">98.2% Stable</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">System Vitals</div>
              <div class="metric-value" style="color: #22c55e;">FUNCTIONAL</div>
            </div>
          </div>

          <div style="background: rgba(0,0,0,0.2); padding: 1.25rem; border-left: 3px solid var(--color-primary);">
            <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-primary); margin-bottom: 0.5rem; font-weight: bold;">OPERATOR MEMORANDUM</div>
            <p style="font-size: 0.88rem; line-height: 1.5; color: var(--color-text-muted);">
              Subject displays extreme resistance to standard cognitive sweeps. Physical vitals indicate high adrenaline response during terminal interfaces, but neural pathways stabilize immediately upon packet transfers. Access restricted unless core key code is fully synchronized with proxy networks.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function initBasicInfoEffects() {
  // Live ECG scrolling line drawing
  const canvas = document.getElementById('ecg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = 60;

  let points = [];
  const maxPoints = 120;
  for (let i = 0; i < maxPoints; i++) points.push(30);

  let frame = 0;
  const bpmText = document.getElementById('bpm-readout');

  function drawECG() {
    if (!document.getElementById('ecg-canvas')) return; // Exit loop if navigated away

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Shift points left
    points.shift();

    // Generate new point based on regular heartbeat rhythm
    frame++;
    let baseBPM = 72 + Math.floor(Math.sin(frame * 0.05) * 3);
    if (frame % 20 === 0) bpmText.textContent = `BPM: ${baseBPM}`;

    let newY = 30;
    const cycle = frame % 40;

    if (cycle === 0) {
      newY = 22; // Small initial P wave
    } else if (cycle === 3) {
      newY = 32; // Small dip
    } else if (cycle === 5) {
      newY = 5; // Large spike up R
    } else if (cycle === 8) {
      newY = 55; // Large drop S
    } else if (cycle === 11) {
      newY = 30; // Return to baseline
    } else if (cycle === 17) {
      newY = 20; // Medium bump T wave
    }

    // Add noise
    newY += (Math.random() - 0.5) * 1.5;
    points.push(newY);

    // Draw line
    ctx.beginPath();
    ctx.moveTo(0, points[0]);
    const step = canvas.width / (maxPoints - 1);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(i * step, points[i]);
    }

    // Styling the line
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--color-primary').trim() || '#00f0ff';
    ctx.shadowBlur = 4;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    requestAnimationFrame(drawECG);
  }

  drawECG();
}


/* ==========================================
   7. VIEW: PERSONALITY (Cognitive scan)
   ========================================== */

function renderPersonalityView() {
  return `
    <div class="page-container">
      <div class="cyber-breadcrumbs">
        <a href="#/">GATEWAY</a> &gt; <span>COGNITIVE_LOGS</span>
      </div>

      <div class="personality-layout">
        <!-- Left: Radar canvas -->
        <div class="cyber-panel radar-chart-panel">
          <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-primary); margin-bottom: 1.5rem;">COGNITIVE COMPATIBILITY MESH</div>
          <canvas id="radar-canvas" width="300" height="300"></canvas>
          
          <!-- Bar list showing numerical stats -->
          <div class="personality-stats-list">
            <div class="stat-bar-row">
              <div class="stat-bar-info"><span>INTELLECT (INT)</span><span>${state.characterStats.intellect}%</span></div>
              <div class="stat-bar-track"><div class="stat-bar-fill" data-val="${state.characterStats.intellect}"></div></div>
            </div>
            <div class="stat-bar-row">
              <div class="stat-bar-info"><span>REBELLION (REB)</span><span>${state.characterStats.rebellion}%</span></div>
              <div class="stat-bar-track"><div class="stat-bar-fill" data-val="${state.characterStats.rebellion}"></div></div>
            </div>
            <div class="stat-bar-row">
              <div class="stat-bar-info"><span>TECH_SKILL (TEC)</span><span>${state.characterStats.techSkill}%</span></div>
              <div class="stat-bar-track"><div class="stat-bar-fill" data-val="${state.characterStats.techSkill}"></div></div>
            </div>
            <div class="stat-bar-row">
              <div class="stat-bar-info"><span>SOMATICS (SOM)</span><span>${state.characterStats.somatics}%</span></div>
              <div class="stat-bar-track"><div class="stat-bar-fill" data-val="${state.characterStats.somatics}"></div></div>
            </div>
          </div>
        </div>

        <!-- Right: Journal logs list -->
        <div class="cyber-panel" style="display: flex; flex-direction: column; gap: 1.5rem;">
          <h2 class="cyber-title" style="font-family: var(--font-title); font-size: 1.5rem; border-bottom: 1px solid var(--color-border); padding-bottom: 0.75rem;">BEHAVIORAL LOG ARCHIVES</h2>
          
          <div class="cognitive-logs-container">
            <div class="cognitive-log-entry">
              <div class="log-header">
                <span>LOG_ENTRY #042 // COGNITIVE BIAS</span>
                <span>TIMESTAMP: 2026-03-12</span>
              </div>
              <div class="log-text">
                "Subject spent 4 hours today tracing a minor clock synchronization drift in the sub-processor loop. When suggested to ignore it, she locked the office door and disabled internal cameras. Vitals remained completely flat throughout. Highly focused, ignores safety warnings."
              </div>
            </div>
            
            <div class="cognitive-log-entry">
              <div class="log-header">
                <span>LOG_ENTRY #039 // SYSTEM AUDIT</span>
                <span>TIMESTAMP: 2026-02-28</span>
              </div>
              <div class="log-text">
                "Attempted to restrict Mizuki's access to the mainframe core. Within 12 minutes, network bandwidth dropped to zero. Found a dynamic loop routing all outgoing requests into a rendering engine. Her response: 'If the door is locked, I rebuild the corridor.'"
              </div>
            </div>
            
            <div class="cognitive-log-entry">
              <div class="log-header">
                <span>LOG_ENTRY #015 // SOCIO_METRIC</span>
                <span>TIMESTAMP: 2026-01-05</span>
              </div>
              <div class="log-text">
                "Avoids group tasks unless designated as sole system architect. Shows intense protective stance over the younger trainees, occasionally hacking their profile trackers to remove negative audit reports. Empathetic core exists, masked behind code."
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function initPersonalityEffects() {
  // Animate stat bars width
  setTimeout(() => {
    const fills = document.querySelectorAll('.stat-bar-fill');
    fills.forEach(fill => {
      const val = fill.dataset.val;
      fill.style.width = `${val}%`;
    });
  }, 100);

  // Draw personality Radar Canvas
  const canvas = document.getElementById('radar-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const stats = [
    { label: 'INT', val: state.characterStats.intellect },
    { label: 'REB', val: state.characterStats.rebellion },
    { label: 'AGI', val: state.characterStats.agility },
    { label: 'EMP', val: state.characterStats.empathy },
    { label: 'TEC', val: state.characterStats.techSkill },
    { label: 'SOM', val: state.characterStats.somatics }
  ];

  const cx = 150;
  const cy = 150;
  const r = 100;
  const numPoints = stats.length;

  let animVal = 0;

  function drawRadar() {
    if (!document.getElementById('radar-canvas')) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const themeColor = getComputedStyle(document.body).getPropertyValue('--color-primary').trim() || '#00f0ff';
    const accentColor = getComputedStyle(document.body).getPropertyValue('--color-accent').trim() || '#a855f7';

    // Draw concentric grids (hexagons)
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let j = 1; j <= 4; j++) {
      ctx.beginPath();
      const radius = (r / 4) * j;
      for (let i = 0; i < numPoints; i++) {
        const angle = (Math.PI * 2 / numPoints) * i - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Draw axes
    ctx.beginPath();
    for (let i = 0; i < numPoints; i++) {
      const angle = (Math.PI * 2 / numPoints) * i - Math.PI / 2;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.stroke();

    // Draw Labels
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '10px Share Tech Mono';
    for (let i = 0; i < numPoints; i++) {
      const angle = (Math.PI * 2 / numPoints) * i - Math.PI / 2;
      const x = cx + Math.cos(angle) * (r + 18);
      const y = cy + Math.sin(angle) * (r + 12);
      ctx.fillText(stats[i].label, x - 10, y + 4);
    }

    // Animate stats polygon growth
    animVal += (1 - animVal) * 0.08;

    // Draw Stat Polygon
    ctx.beginPath();
    for (let i = 0; i < numPoints; i++) {
      const angle = (Math.PI * 2 / numPoints) * i - Math.PI / 2;
      const valuePct = (stats[i].val / 100) * animVal;
      const x = cx + Math.cos(angle) * r * valuePct;
      const y = cy + Math.sin(angle) * r * valuePct;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    // Fill polygon
    ctx.fillStyle = themeColor.startsWith('#') ? hexToRgba(themeColor, 0.22) : 'rgba(0, 240, 255, 0.22)';
    ctx.fill();

    // Stroke polygon
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Highlight points
    for (let i = 0; i < numPoints; i++) {
      const angle = (Math.PI * 2 / numPoints) * i - Math.PI / 2;
      const valuePct = (stats[i].val / 100) * animVal;
      const x = cx + Math.cos(angle) * r * valuePct;
      const y = cy + Math.sin(angle) * r * valuePct;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = accentColor;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (animVal < 0.999) {
      requestAnimationFrame(drawRadar);
    }
  }

  function hexToRgba(hex, alpha) {
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c = hex.substring(1).split('');
      if (c.length == 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c = '0x' + c.join('');
      return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
    }
    return `rgba(0, 240, 255, ${alpha})`;
  }

  drawRadar();
}


/* ==========================================
   8. VIEW: FAMILY FLOWCHART TREE
   ========================================== */

function renderFamilyView() {
  return `
    <div class="page-container">
      <div class="cyber-breadcrumbs">
        <a href="#/">GATEWAY</a> &gt; <span>FAMILY_LINEAGE</span>
      </div>

      <div class="cyber-panel" style="display: flex; flex-direction: column; gap: 1rem;">
        <h2 class="cyber-title" style="font-family: var(--font-title); font-size: 1.5rem;">RELATIONS CHART</h2>
        <p style="font-size: 0.88rem; color: var(--color-text-muted);">
          Surface data networks connecting Subject Seitou Mizuki with known family members and mentors. 
          <strong>Click on any active node block</strong> to decrypt that individual's sub-profile, bios, stats, and recorded voice lines.
        </p>

        <!-- SVG Flowchart -->
        <div class="family-tree-panel">
          <svg class="family-tree-svg" id="family-tree-mesh" viewBox="0 0 800 480">
            <!-- Connection Lines -->
            <!-- Daiki -> Mizuki -->
            <path d="M400,105 L400,230" class="tree-connection-line active"></path>
            <!-- Aoba -> Mizuki -->
            <path d="M190,265 L320,265" class="tree-connection-line active"></path>
            <!-- Mizuki -> Proxy -->
            <path d="M480,265 L610,265" class="tree-connection-line"></path>
            <!-- Daiki -> Liaison (Dotted) -->
            <path d="M480,75 L610,75" class="tree-connection-line"></path>
            
            <!-- Nodes -->
            <!-- Daiki Node (Father) -->
            <g class="tree-node-group" data-member="father">
              <rect x="320" y="45" width="160" height="60" class="tree-node-rect"></rect>
              <text x="400" y="73" class="tree-node-text-name">SEITOU DAIKI</text>
              <text x="400" y="90" class="tree-node-text-role">FATHER // CHIEF RESEARCH</text>
            </g>

            <!-- Aoba Node (Mentor) -->
            <g class="tree-node-group" data-member="mentor">
              <rect x="30" y="235" width="160" height="60" class="tree-node-rect"></rect>
              <text x="110" y="263" class="tree-node-text-name">AOBA (青葉)</text>
              <text x="110" y="280" class="tree-node-text-role">MENTOR // CODE REBEL</text>
            </g>

            <!-- Mizuki Node (Subject - Active Node) -->
            <g class="tree-node-group" data-member="mizuki" style="filter: drop-shadow(0 0 8px rgba(0, 240, 255, 0.3));">
              <rect x="320" y="235" width="160" height="60" class="tree-node-rect" style="stroke: var(--color-primary); fill: rgba(var(--color-primary-rgb), 0.05);"></rect>
              <text x="400" y="263" class="tree-node-text-name" style="fill: var(--color-primary);">SEITOU MIZUKI</text>
              <text x="400" y="280" class="tree-node-text-role" style="fill: var(--color-secondary);">SUBJECT // OPERATIVE</text>
            </g>

            <!-- AI Proxy Node -->
            <g class="tree-node-group" data-member="proxy">
              <rect x="610" y="235" width="160" height="60" class="tree-node-rect"></rect>
              <text x="690" y="263" class="tree-node-text-name">PROX_AI</text>
              <text x="690" y="280" class="tree-node-text-role">COMPILATION ASSISTANT</text>
            </g>

            <!-- Sector 7 Liaison -->
            <g class="tree-node-group" data-member="liaison">
              <rect x="610" y="45" width="160" height="60" class="tree-node-rect" style="stroke-dasharray: 4,2;"></rect>
              <text x="690" y="73" class="tree-node-text-name">REBEL LIAISON</text>
              <text x="690" y="90" class="tree-node-text-role">CONTACT // CLASSIFIED</text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  `;
}

function initFamilyEffects() {
  const groups = document.querySelectorAll('.tree-node-group');
  groups.forEach(group => {
    group.addEventListener('click', () => {
      const member = group.dataset.member;
      if (member === 'mizuki') {
        window.location.hash = '#/basic-info';
      } else {
        window.location.hash = `#/family/${member}`;
      }
    });
  });
}


/* ==========================================
   9. VIEW: DYNAMIC FAMILY MEMBER SUBPAGE (Voice lines)
   ========================================== */

const familyDossiers = {
  father: {
    name: "Seitou Daiki (勢藤大樹)",
    relation: "FATHER / CHIEF RESEARCHER",
    role: "Director of System Somatics at Sector Mainframe (Former)",
    status: "Unknown / Missing in Action since Sector 7 Collapse",
    avatarPoster: "assets/posters/father.png",
    bio: "Head Researcher of the Sector 7 network core database. Initiated the Secure Node Project. Daiki raised Mizuki inside the clean labs, where she discovered terminal shells at age 5. Left encrypted ledger blocks containing key-codes for Mizuki to solve before his disappearance during the network purge.",
    stats: { Clearance: "Level 09", Influence: "High", Danger: "Moderate", Affinity: "70%" },
    voicelines: [
      { text: "Log entry: 'The child's neural synapse matches code. It's beautiful, but unsafe.'", src: "voiceline_father_01" },
      { text: "Transmission: 'Mizuki, if you decrypt this, stay out of Mainframe Sector 4.'", src: "voiceline_father_02" }
    ]
  },
  mentor: {
    name: "Aoba (青葉)",
    relation: "MENTOR / RENEGADE PROGRAMMER",
    role: "Lead Node Architect, Sector 7 Rebellion Core",
    status: "Active Operative (Underground Network)",
    avatarPoster: "assets/posters/mentor.png",
    bio: "Aoba intercepted Mizuki's connection lines when she hacked the Academy systems at age 12. Recognizing her potential, he taught her grid bypassing, command scripting, and code encryption. Currently serves as her handler, providing decrypted logs for her ledgers.",
    stats: { Clearance: "Level 07", Influence: "Moderate", Danger: "High (Rebel)", Affinity: "95%" },
    voicelines: [
      { text: "Instruction: 'Mizuki, stop typing. Let the grid connections cool down first.'", src: "voiceline_mentor_01" },
      { text: "Critique: 'Your routing loops are perfect. Almost too neat. Throw some noise in.'", src: "voiceline_mentor_02" }
    ]
  },
  proxy: {
    name: "PROX_AI (Compilation System)",
    relation: "AI SYSTEM ASSISTANT",
    role: "Holographic Database Interface Protocol",
    status: "Functional (Synchronized with Mizuki)",
    avatarPoster: "assets/posters/proxy.png",
    bio: "An artificial intelligence daemon built by Mizuki using salvage scripts from Daiki's archives. Manages directories, translates user terminal command entries, maintains vitals monitoring, and synthesizes audio feedback.",
    stats: { Clearance: "Level 04", Influence: "Low", Danger: "Low", Affinity: "100%" },
    voicelines: [
      { text: "Diagnostics: 'Secure Node 04 is stable. Operator inputs are monitored.'", src: "voiceline_proxy_01" },
      { text: "Alert: 'Warning. Unshielded packet interception detected in secondary loop.'", src: "voiceline_proxy_02" }
    ]
  },
  liaison: {
    name: "Sector 7 Rebel Liaison",
    relation: "CONTACT / INFORMATION SPY",
    role: "Secret Liaison Operative, Sector 7 Grid Purge",
    status: "Classified (Secure Proxy Access Only)",
    avatarPoster: "assets/posters/liaison.png",
    bio: "Underground conduit delivering raw packet blocks and physical files to Mizuki. Contact details are scrubbed daily to maintain security.",
    stats: { Clearance: "Level 05", Influence: "Low", Danger: "High", Affinity: "60%" },
    voicelines: [
      { text: "Briefing: 'We found files. Daiki's key is buried in the incident logs.'", src: "voiceline_liaison_01" }
    ]
  }
};

function renderFamilyMemberView(params) {
  const member = params.member;
  const data = familyDossiers[member];

  if (!data) {
    return `<div class="cyber-panel">DOSSIER NODE NOT FOUND OR EXPIRED.</div>`;
  }

  return `
    <div class="page-container">
      <div class="cyber-breadcrumbs">
        <a href="#/">GATEWAY</a> &gt; <a href="#/family">FAMILY_LINEAGE</a> &gt; <span>${member.toUpperCase()}</span>
      </div>

      <div class="family-member-details">
        <!-- Profile info block -->
        <div class="member-avatar-panel">
          <div class="member-avatar-container">
            <div class="member-relation-label">${data.relation}</div>
            <div class="node-poster-fallback" style="opacity: 0.15">
              <svg viewBox="0 0 100 100" width="100" height="100">
                <circle cx="50" cy="50" r="40" stroke="currentColor" stroke-width="1" fill="none"></circle>
                <path d="M30,80 C30,60 70,60 70,80" stroke="currentColor" stroke-width="1.5" fill="none"></path>
                <circle cx="50" cy="40" r="12" stroke="currentColor" stroke-width="1.5" fill="none"></circle>
              </svg>
            </div>
            <!-- Custom posters supplied by User -->
            <div class="node-poster-bg"></div>
          </div>
          
          <div class="cyber-panel" style="padding: 1.25rem; font-family: var(--font-mono); font-size: 0.78rem;">
            <div style="color: var(--color-primary); margin-bottom: 0.5rem; font-weight: bold;">METRIC Dossier</div>
            <div style="display:flex; justify-content:space-between; margin-bottom: 0.25rem;"><span>Clearance:</span><span style="color:#fff;">${data.stats.Clearance}</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom: 0.25rem;"><span>System Impact:</span><span style="color:#fff;">${data.stats.Influence}</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom: 0.25rem;"><span>Danger Rating:</span><span style="color:#fff;">${data.stats.Danger}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Affinity Core:</span><span style="color:var(--color-primary);">${data.stats.Affinity}</span></div>
          </div>
        </div>

        <!-- Bio dossiers text -->
        <div class="cyber-panel" style="display: flex; flex-direction: column; gap: 1.5rem;">
          <h2 class="cyber-title" style="font-family: var(--font-title); font-size: 1.6rem; color: var(--color-primary); border-bottom: 1px solid var(--color-border); padding-bottom: 0.75rem;">
            ${data.name}
          </h2>
          
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-text-muted);">ROLE:</div>
            <div style="font-size: 0.95rem; font-weight: bold; color: #fff;">${data.role}</div>
            <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.5rem;">STATUS:</div>
            <div style="font-size: 0.95rem; color: var(--color-accent);">${data.status}</div>
          </div>

          <div style="line-height: 1.6; color: var(--color-text-muted); font-size: 0.95rem;">
            <p>${data.bio}</p>
          </div>

          <!-- Character Voice lines playlists -->
          <div class="voice-lines-playlist">
            <h3 style="font-family: var(--font-title); font-size: 1.1rem; color: #fff; margin-bottom: 0.5rem; border-bottom: 1px dashed var(--color-border); padding-bottom: 0.5rem;">
              VOICE TRANSMISSION LOGS
            </h3>
            
            ${data.voicelines.map((vl, index) => `
              <div class="voice-line-item" data-src="${vl.src}" data-index="${index}">
                <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
                  <div class="play-btn-circle">▶</div>
                  <span style="font-size: 0.88rem; font-family: var(--font-mono); line-height: 1.4;">${vl.text}</span>
                </div>
                <!-- Mini visualizer bars inside line -->
                <div class="visualizer-bars" style="opacity: 0;">
                  <div class="v-bar"></div>
                  <div class="v-bar"></div>
                  <div class="v-bar"></div>
                  <div class="v-bar"></div>
                  <div class="v-bar"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function initFamilyMemberEffects(member) {
  const data = familyDossiers[member];
  if (!data) return;

  const items = document.querySelectorAll('.voice-line-item');

  items.forEach(item => {
    item.addEventListener('click', () => {
      const src = item.dataset.src;

      // If already playing this line, stop it
      if (state.activeVoiceLine === src) {
        stopVoiceLineSimulation();
        return;
      }

      // Stop previous
      stopVoiceLineSimulation();

      // Mark as playing
      state.activeVoiceLine = src;
      item.classList.add('playing');

      const visualizer = item.querySelector('.visualizer-bars');
      visualizer.style.opacity = '1';

      // Play a starting synth sound beep
      playSynthSound('success');

      // Simulate Voice Transmission: generate randomized periodic bleep frequencies to mimic voice audio data
      let tick = 0;
      state.activeVoiceInterval = setInterval(() => {
        tick++;

        // Random pitch voice synth
        if (tick % 2 === 0) {
          if (state.audioEnabled && state.audioContext) {
            const ctx = state.audioContext;
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Generate vocal-synth-like sound sweep
            osc.type = 'triangle';
            let freq = 180 + Math.floor(Math.sin(tick) * 60) + (Math.random() > 0.5 ? 200 : 0);
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gainNode.gain.setValueAtTime(0.015, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.09);
            osc.start();
            osc.stop(ctx.currentTime + 0.09);
          }
        }

        if (tick > 30) { // Auto stop after ~3 seconds simulation
          stopVoiceLineSimulation();
        }
      }, 100);
    });
  });
}

function stopVoiceLineSimulation() {
  if (state.activeVoiceInterval) {
    clearInterval(state.activeVoiceInterval);
    state.activeVoiceInterval = null;
  }

  const playingItem = document.querySelector('.voice-line-item.playing');
  if (playingItem) {
    playingItem.classList.remove('playing');
    const visualizer = playingItem.querySelector('.visualizer-bars');
    visualizer.style.opacity = '0';
  }

  state.activeVoiceLine = null;
}


/* ==========================================
   10. VIEW: LIFE GROWTH TREE
   ========================================== */

function renderGrowthTreeView() {
  return `
    <div class="page-container">
      <div class="cyber-breadcrumbs">
        <a href="#/">GATEWAY</a> &gt; <span>LIFE_EVOLUTION</span>
      </div>

      <div class="cyber-panel">
        <h2 class="cyber-title" style="font-family: var(--font-title); font-size: 1.5rem; margin-bottom: 0.5rem;">BIOLOGICAL DURATION TIMELINE</h2>
        <p style="font-size: 0.88rem; color: var(--color-text-muted);">
          Sequential stage developments logged from Childhood to teenage operative. Hover nodes to retrieve vitals and delta stats updates.
        </p>

        <!-- Vertical Timeline -->
        <div class="growth-timeline">
          <!-- Childhood Stage -->
          <div class="timeline-item">
            <div class="timeline-badge">01</div>
            <div class="timeline-content-panel">
              <div class="timeline-age">AGE: 0 - 8 // CHILDHOOD</div>
              <h3 class="timeline-title">Sector 7 Discovery</h3>
              <p class="timeline-desc">
                Early cognitive development audits. Raised inside the Sector 7 Mainframe labs. 
                Discovered standard terminal shells at age 5; wrote first socket-listen daemon at age 7. Vitals indicate low baseline stress.
              </p>
              <div class="timeline-stats-delta">
                <span>INT:</span> +15% | <span>TEC:</span> +22% | <span>REB:</span> 12% Vitals: 99.8%
              </div>
            </div>
          </div>

          <!-- Pre-Teen Stage -->
          <div class="timeline-item">
            <div class="timeline-badge">02</div>
            <div class="timeline-content-panel">
              <div class="timeline-age">AGE: 9 - 12 // PRE-TEEN</div>
              <h3 class="timeline-title">Academy Firewall Breach</h3>
              <p class="timeline-desc">
                Enrolled in standard educational grid. Breached academic mainframe to erase discipline records. 
                Spotted by renegade programmer Aoba who redirected tracing back. Initiated formal mentoring.
              </p>
              <div class="timeline-stats-delta">
                <span>INT:</span> +25% | <span>TEC:</span> +35% | <span>REB:</span> +45% (Hacker Protocol)
              </div>
            </div>
          </div>

          <!-- Teen Operative Stage (Current) -->
          <div class="timeline-item">
            <div class="timeline-badge">03</div>
            <div class="timeline-content-panel">
              <div class="timeline-age">AGE: 13 - 17 // TEEN OPERATIVE</div>
              <h3 class="timeline-title">Secure Node Construction</h3>
              <p class="timeline-desc">
                Disappearance of Daiki. Constructed custom MIZUKI Secure Nodes to cache classified research. 
                Successfully maintains decentral networks for the Sector 7 Core resistance cells.
              </p>
              <div class="timeline-stats-delta">
                <span>INT:</span> 95% (Max) | <span>TEC:</span> 98% (Max) | <span>REB:</span> 85% Vitals: Stable Lvl 4
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function initGrowthTreeEffects() {
  // Timeline animations hook
}


/* ==========================================
   11. VIEW: ART GALLERY
   ========================================== */

function renderGalleryView() {
  const images = [
    { title: "MIZUKI PROFILE", date: "2026-03", size: "1.4MB", src: "assets/mizuki_profile.png" },
    { title: "MAIN CORE LINK", date: "2026-04", size: "3.2MB", src: "assets/mizuki_cyber.png" },
    { title: "CHILDHOOD AUDIT", date: "2025-11", size: "940KB", src: "assets/mizuki_childhood.png" },
    { title: "LEGACY TREE", date: "2026-02", size: "1.8MB", src: "assets/mizuki_legacy.png" }
  ];

  return `
    <div class="page-container">
      <div class="cyber-breadcrumbs">
        <a href="#/">GATEWAY</a> &gt; <span>ART_PORTFOLIO</span>
      </div>

      <div class="gallery-layout">
        <div class="gallery-grid">
          ${images.map(img => `
            <div class="gallery-card" data-src="${img.src}">
              <div class="gallery-img-wrapper">
                <div class="gallery-scanline"></div>
                <!-- Display fallback graphic block if image doesn't exist yet -->
                <div class="node-poster-fallback" style="opacity: 0.15">
                  <svg viewBox="0 0 100 100" width="80" height="80">
                    <rect x="15" y="15" width="70" height="70" stroke="currentColor" stroke-width="1.5" fill="none"></rect>
                    <polyline points="20,75 50,45 80,75" stroke="currentColor" stroke-width="1.5" fill="none"></polyline>
                  </svg>
                </div>
                <div class="node-poster-bg" style="background-image: url('${img.src}'); filter: none;"></div>
              </div>
              <div class="gallery-info">
                <span class="gallery-title">${img.title}</span>
                <span class="gallery-meta">${img.date} / ${img.size}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function initGalleryEffects() {
  const cards = document.querySelectorAll('.gallery-card');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');

  cards.forEach(card => {
    card.addEventListener('click', () => {
      const src = card.dataset.src;
      lightboxImg.src = src;
      lightbox.classList.add('active');
      playSynthSound('success');
    });
  });

  const closeBtn = document.getElementById('lightbox-close-btn');
  closeBtn.addEventListener('click', () => {
    lightbox.classList.remove('active');
    playSynthSound('click');
  });

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      lightbox.classList.remove('active');
      playSynthSound('click');
    }
  });
}


/* ==========================================
   12. VIEW: INTERACTIVE TERMINAL
   ========================================== */

function renderTerminalView() {
  return `
    <div class="page-container">
      <div class="cyber-breadcrumbs">
        <a href="#/">GATEWAY</a> &gt; <span>INTERACTIVE_CMD</span>
      </div>

      <div class="terminal-layout">
        <div class="terminal-header">
          <span>SECURE_NODE_SHELL — v9.72 — ACCESS_LEVEL_04</span>
          <span>GATEWAY: CONNECTED</span>
        </div>
        <div class="terminal-body" id="term-body">
          <div class="terminal-output" id="term-output">
            <div class="terminal-line">[+] MIZUKI SECURE SHELL INTERACTIVE CLIENT ACTIVE.</div>
            <div class="terminal-line">[+] Enter 'help' to review directory query commands.</div>
            <div class="terminal-line">&nbsp;</div>
          </div>
          
          <div class="terminal-prompt-row">
            <span class="terminal-prompt-symbol">mizuki@sec_node:~$</span>
            <input type="text" class="terminal-input-field" id="term-input" autofocus autocomplete="off" spellcheck="false">
          </div>
        </div>
      </div>
    </div>
  `;
}

function initTerminalEffects() {
  const input = document.getElementById('term-input');
  const body = document.getElementById('term-body');
  const output = document.getElementById('term-output');

  if (!input) return;

  // Auto-focus input
  input.focus();
  body.addEventListener('click', () => {
    input.focus();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const cmd = input.value;
      input.value = "";

      if (!cmd.trim()) return;

      // Print prompt line
      const promptLine = document.createElement('div');
      promptLine.className = 'terminal-line';
      promptLine.innerHTML = `<span class="terminal-prompt-symbol">mizuki@sec_node:~$</span> ${escapeHTML(cmd)}`;
      output.appendChild(promptLine);

      // Process Command via TerminalInterpreter
      const resultLines = window.TerminalInterpreter.interpret(cmd);

      // Play audio clicks
      playSynthSound('click');

      if (resultLines[0] === '__CLEAR__') {
        output.innerHTML = "";
        return;
      }

      if (resultLines[0] === '__DECRYPT_START__') {
        const logId = resultLines[1];
        const logVal = resultLines[2];

        let printIdx = 0;
        const decryptLogs = [
          "CONNECTING DECRYPT CORE PORT...",
          "BYPASSING GRID SECURITY CHECKS...",
          "RECONSTRUCTING BIT-STREAM DATA...",
          logVal
        ];

        decryptLogs.forEach((dLine, dIdx) => {
          setTimeout(() => {
            const outLine = document.createElement('div');
            outLine.className = 'terminal-line';
            outLine.textContent = dLine;
            if (dIdx === decryptLogs.length - 1) {
              outLine.style.color = 'var(--color-primary)';
              playSynthSound('success');
            } else {
              outLine.style.color = 'var(--color-text-muted)';
              playSynthSound('beep-fast');
            }
            output.appendChild(outLine);
            body.scrollTop = body.scrollHeight;
          }, dIdx * 450);
        });
        return;
      }

      // Standard Output printer (delayed lines)
      resultLines.forEach((line, index) => {
        setTimeout(() => {
          const outLine = document.createElement('div');
          outLine.className = 'terminal-line';
          outLine.textContent = line;

          if (line.includes('ERROR')) {
            outLine.style.color = '#ef4444';
            playSynthSound('error');
          } else {
            playSynthSound('beep-fast');
          }

          output.appendChild(outLine);
          body.scrollTop = body.scrollHeight;
        }, index * 40);
      });
    }
  });

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g,
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }
}


/* ==========================================
   13. INITIAL HUD AND CLOCK BINDERS
   ========================================== */

function initClock() {
  const clock = document.getElementById('system-time');
  if (!clock) return;

  setInterval(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timeStr = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} UTC`;
    clock.textContent = timeStr;
  }, 1000);
}

function initThemeSwitcher() {
  const btns = document.querySelectorAll('.theme-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      setTheme(theme);
      playSynthSound('success');
    });
  });

  // Custom terminal event theme switcher
  window.addEventListener('changeTheme', (e) => {
    setTheme(e.detail.theme);
  });
}

function setTheme(theme) {
  // Remove other themes
  document.body.className = '';
  if (theme !== 'blue') {
    document.body.classList.add(`theme-${theme}`);
  }
  state.currentTheme = theme;
}


/* ==========================================
   14. SYSTEM INITIALIZATION BOOTSTRAP
   ========================================== */

window.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Clock & Theme HUD
  initClock();
  initThemeSwitcher();

  // 2. Bind global volume buttons
  document.getElementById('audio-toggle-btn').addEventListener('click', () => {
    toggleAudio();
    playSynthSound('click');
  });

  // 3. Start Canvas Particle Simulation
  PhotonSimulation.init();

  // 4. Run Initial boot decryption loader
  runBootLoader();
});
