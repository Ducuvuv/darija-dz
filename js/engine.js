/* Darija — moteur TDAH (adapté de Biochimie LAS) */
window.DAR = window.DAR || {};

(function (DAR) {
  const STORE = "darija_rpg_v1";

  function load() {
    try {
      return Object.assign(
        {
          xp: 0,
          level: 1,
          combo: 0,
          bestCombo: 0,
          sessions: 0,
          correct: 0,
          done: {},
          badges: {},
          mute: false,
          streakDays: 0,
          lastDay: "",
        },
        JSON.parse(localStorage.getItem(STORE) || "{}")
      );
    } catch (_) {
      return { xp: 0, level: 1, combo: 0, bestCombo: 0, sessions: 0, correct: 0, done: {}, badges: {}, mute: false, streakDays: 0, lastDay: "" };
    }
  }

  let state = load();

  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify(state));
    } catch (_) {}
  }

  function levelFromXp(xp) {
    return Math.max(1, Math.floor(Math.sqrt(xp / 40)) + 1);
  }

  function xpToNext(level) {
    return level * level * 40;
  }

  let ctx;
  function tone(freq, dur, type, gain) {
    if (state.mute) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || "sine";
      o.frequency.value = freq;
      g.gain.value = gain || 0.04;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (dur || 0.12));
      o.stop(ctx.currentTime + (dur || 0.12) + 0.02);
    } catch (_) {}
  }

  const sfx = {
    ok() {
      tone(523, 0.07, "triangle", 0.05);
      setTimeout(() => tone(784, 0.1, "triangle", 0.045), 60);
    },
    bad() {
      tone(180, 0.16, "sawtooth", 0.03);
    },
    level() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.12, "square", 0.04), i * 80));
    },
    combo() {
      tone(880 + state.combo * 20, 0.08, "sine", 0.05);
    },
    click() {
      tone(660, 0.04, "square", 0.02);
    },
    done() {
      tone(392, 0.08, "triangle", 0.05);
      setTimeout(() => tone(523, 0.1, "triangle", 0.05), 70);
      setTimeout(() => tone(784, 0.14, "triangle", 0.05), 150);
    },
  };

  let confettiCanvas, confettiCtx, bits = [], confettiRaf;

  function ensureConfetti() {
    if (confettiCanvas) return;
    confettiCanvas = document.createElement("canvas");
    confettiCanvas.id = "dar-confetti";
    confettiCanvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;width:100%;height:100%";
    document.body.appendChild(confettiCanvas);
    confettiCtx = confettiCanvas.getContext("2d");
    const resize = () => {
      confettiCanvas.width = innerWidth * devicePixelRatio;
      confettiCanvas.height = innerHeight * devicePixelRatio;
      confettiCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    resize();
    addEventListener("resize", resize);
  }

  function burst(n, originX, originY) {
    ensureConfetti();
    const colors = ["#d97706", "#16a34a", "#ca8a04", "#059669", "#f59e0b", "#dc2626", "#fef3c7"];
    for (let i = 0; i < (n || 80); i++) {
      bits.push({
        x: originX ?? innerWidth / 2,
        y: originY ?? innerHeight * 0.35,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 12 - 4,
        g: 0.28 + Math.random() * 0.15,
        w: 4 + Math.random() * 6,
        h: 6 + Math.random() * 8,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        c: colors[(Math.random() * colors.length) | 0],
        life: 90 + Math.random() * 40,
      });
    }
    if (!confettiRaf) loopConfetti();
  }

  function loopConfetti() {
    confettiRaf = requestAnimationFrame(loopConfetti);
    confettiCtx.clearRect(0, 0, innerWidth, innerHeight);
    bits = bits.filter((b) => b.life > 0);
    bits.forEach((b) => {
      b.vy += b.g;
      b.x += b.vx;
      b.y += b.vy;
      b.rot += b.vr;
      b.life -= 1;
      confettiCtx.save();
      confettiCtx.translate(b.x, b.y);
      confettiCtx.rotate(b.rot);
      confettiCtx.globalAlpha = Math.min(1, b.life / 30);
      confettiCtx.fillStyle = b.c;
      confettiCtx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      confettiCtx.restore();
    });
    if (!bits.length) {
      cancelAnimationFrame(confettiRaf);
      confettiRaf = null;
      confettiCtx.clearRect(0, 0, innerWidth, innerHeight);
    }
  }

  function toast(msg, kind) {
    let host = document.getElementById("dar-toasts");
    if (!host) {
      host = document.createElement("div");
      host.id = "dar-toasts";
      document.body.appendChild(host);
    }
    const el = document.createElement("div");
    el.className = "dar-toast " + (kind || "");
    el.textContent = msg;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 350);
    }, 2200);
  }

  function grantBadge(id, label) {
    if (state.badges[id]) return;
    state.badges[id] = true;
    save();
    toast("🏅 " + label, "badge");
    burst(50);
    sfx.level();
    renderHud();
  }

  function addXp(n, reason) {
    const before = state.level;
    state.xp += n;
    state.level = levelFromXp(state.xp);
    save();
    toast("+" + n + " XP" + (reason ? " · " + reason : ""), "xp");
    if (state.level > before) {
      toast("Niveau " + state.level + " !", "level");
      burst(120);
      sfx.level();
    }
    renderHud();
    checkBadges();
  }

  function onCorrect(count) {
    state.correct += count || 1;
    state.combo += 1;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    save();
    sfx.ok();
    if (state.combo >= 2) {
      sfx.combo();
      toast("Combo ×" + state.combo, "combo");
    }
    addXp(Math.min(25, 8 + state.combo * 2), "réponse");
    if (state.combo === 5) grantBadge("combo5", "Combo ×5");
    if (state.combo === 8) grantBadge("flash8", "8 cartes d'affilée");
  }

  function onWrong() {
    state.combo = 0;
    save();
    sfx.bad();
    renderHud();
  }

  function checkBadges() {
    if (state.correct >= 20) grantBadge("c20", "20 bonnes réponses");
    if (state.correct >= 100) grantBadge("c100", "100 bonnes réponses");
    if (state.streakDays >= 7) grantBadge("streak7", "7 jours d'affilée");
    const doneCount = Object.keys(state.done).filter((k) => state.done[k]).length;
    if (doneCount >= 14) grantBadge("a1done", "Socle A1 fini");
  }

  function markDone(id, on) {
    state.done[id] = !!on;
    if (!on) delete state.done[id];
    save();
    if (on) {
      sfx.done();
      addXp(15, "deck");
      burst(40, innerWidth * 0.75, innerHeight * 0.2);
    }
    checkBadges();
    renderHud();
  }

  function touchStreak() {
    const today = new Date().toISOString().slice(0, 10);
    if (state.lastDay === today) return;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterday = y.toISOString().slice(0, 10);
    state.streakDays = state.lastDay === yesterday ? (state.streakDays || 0) + 1 : 1;
    state.lastDay = today;
    save();
    checkBadges();
  }

  function renderHud() {
    const xpEl = document.getElementById("dar-xp");
    const lvEl = document.getElementById("dar-level");
    const cbEl = document.getElementById("dar-combo");
    const bar = document.getElementById("dar-xp-bar");
    const next = xpToNext(state.level);
    const prev = xpToNext(state.level - 1);
    const pct = Math.min(100, ((state.xp - prev) / Math.max(1, next - prev)) * 100);
    if (xpEl) xpEl.textContent = state.xp + " XP";
    if (lvEl) lvEl.textContent = "Nv." + state.level;
    if (cbEl) {
      cbEl.textContent = state.combo > 1 ? "×" + state.combo : "—";
      cbEl.classList.toggle("hot", state.combo >= 3);
    }
    if (bar) bar.style.width = pct + "%";
    const badgeRow = document.getElementById("dar-badges");
    if (badgeRow) {
      const labels = { combo5: "×5", flash8: "8✓", c20: "20✓", c100: "100✓", streak7: "7j", a1done: "A1", session8: "8🃏", zero_fail: "0✗", qcm80: "QCM", qcmstreak: "Q×5" };
      badgeRow.innerHTML = Object.keys(state.badges)
        .map((k) => '<span class="badge-pill">' + (labels[k] || k) + "</span>")
        .join("");
    }
  }

  function setMute(on) {
    state.mute = !!on;
    save();
    const b = document.getElementById("btn-mute");
    if (b) b.textContent = state.mute ? "Son OFF" : "Son";
  }

  DAR.state = () => state;
  DAR.addXp = addXp;
  DAR.onCorrect = onCorrect;
  DAR.onWrong = onWrong;
  DAR.markDone = markDone;
  DAR.burst = burst;
  DAR.toast = toast;
  DAR.sfx = sfx;
  DAR.grantBadge = grantBadge;
  DAR.renderHud = renderHud;
  DAR.setMute = setMute;
  DAR.touchStreak = touchStreak;
  DAR.save = save;

  document.addEventListener("DOMContentLoaded", () => {
    state.sessions += 1;
    touchStreak();
    save();
    renderHud();
  });
})(window.DAR);
