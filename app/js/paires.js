/* Drill paires / contrasts */
(function () {
  var PAIRS = window.DAR_PAIRS || [];
  var DAR = window.DAR;
  var params = new URLSearchParams(location.search);
  var modeParam = params.get("mode") || "flip";
  var setifParam = params.get("setif") === "1";
  var autoStart = params.get("start") === "1";

  var elSetup = document.getElementById("pairs-setup");
  var elPlay = document.getElementById("pairs-play");
  var elEnd = document.getElementById("pairs-end");
  var elProgress = document.getElementById("pairs-progress");
  var elTimer = document.getElementById("pairs-timer");
  var elTheme = document.getElementById("pairs-theme");
  var elMeta = document.getElementById("pairs-meta");
  var elBody = document.getElementById("pairs-body");
  var elActions = document.getElementById("pairs-actions");

  var session = [];
  var index = 0;
  var mode = "flip";
  var includeSetif = true;
  var flipped = false;
  var answered = false;
  var stats = { ok: 0, fail: 0 };
  var timerId = null;
  var timerSec = 0;
  var timerLimit = 300;
  var promptSide = "a";

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function fmtTime(s) {
    var m = Math.floor(s / 60);
    var r = s % 60;
    return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
  }

  function isSetifPair(p) {
    return (p.a && p.a.tag === "setif") || (p.b && p.b.tag === "setif") || /Sétif/i.test(p.theme || "");
  }

  function show(view) {
    elSetup.hidden = view !== "setup";
    elPlay.hidden = view !== "play";
    elEnd.hidden = view !== "end";
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer() {
    stopTimer();
    timerSec = 0;
    timerLimit = 300;
    elTimer.textContent = fmtTime(timerLimit);
    timerId = setInterval(function () {
      timerSec += 1;
      var left = Math.max(0, timerLimit - timerSec);
      elTimer.textContent = fmtTime(left);
      elTimer.classList.toggle("warn", left <= 60 && left > 0);
      elTimer.classList.toggle("hot", left === 0);
      if (left <= 0) finish(true);
    }, 1000);
  }

  function sideLabel(side) {
    return side === "a" ? "A" : "B";
  }

  function renderMember(m, big) {
    return (
      '<div class="pair-member' + (big ? " big" : "") + '">' +
      '<p class="flash-fr">' + esc(m.fr) + "</p>" +
      '<p class="arab flash-arab">' + esc(m.arab) + "</p>" +
      '<p class="latn flash-latn">' + esc(m.latn) + "</p>" +
      (m.tag ? '<span class="pill ' + (m.tag === "setif" ? "bonus" : "live") + '">' + esc(m.tag) + "</span>" : "") +
      "</div>"
    );
  }

  function speakMember(m) {
    if (!window.DAR_TTS || !m) return;
    DAR_TTS.speak(m.arab || m.latn || "");
  }

  function buildSession() {
    var pool = PAIRS.filter(function (p) {
      if (!includeSetif && isSetifPair(p)) return false;
      return p && p.a && p.b;
    });
    return shuffle(pool).slice(0, 8);
  }

  function current() {
    return session[index];
  }

  function otherSide(side) {
    return side === "a" ? "b" : "a";
  }

  function renderFlip() {
    var p = current();
    if (!p) return;
    var shown = p[promptSide];
    var hidden = p[otherSide(promptSide)];
    elTheme.textContent = p.theme + (p.tip ? " · " + p.tip : "");
    elMeta.textContent = "Contraste de " + sideLabel(promptSide) + " → " + sideLabel(otherSide(promptSide));
    elBody.innerHTML =
      renderMember(shown, true) +
      (flipped
        ? '<div class="pair-vs">↔</div>' + renderMember(hidden, true)
        : '<p class="listen-hint">Tape « Révéler » pour le contraste</p>');

    elActions.innerHTML = flipped
      ? '<div class="rate-row">' +
        '<button type="button" class="btn bad" id="btn-pair-fail">✗ Raté</button>' +
        '<button type="button" class="btn ok" id="btn-pair-ok">✓ Je savais</button>' +
        "</div>" +
        '<button type="button" class="btn secondary btn-sm" id="btn-pair-speak">🔊</button>'
      : '<button type="button" class="btn" id="btn-pair-reveal">Révéler le contraste</button>' +
        '<button type="button" class="btn secondary" id="btn-pair-speak">🔊</button>';

    var speakBtn = document.getElementById("btn-pair-speak");
    if (speakBtn) {
      speakBtn.addEventListener("click", function () {
        speakMember(flipped ? hidden : shown);
      });
    }
    var reveal = document.getElementById("btn-pair-reveal");
    if (reveal) {
      reveal.addEventListener("click", function () {
        flipped = true;
        if (DAR) DAR.sfx.click();
        speakMember(hidden);
        renderFlip();
      });
    }
    var ok = document.getElementById("btn-pair-ok");
    var fail = document.getElementById("btn-pair-fail");
    if (ok) ok.addEventListener("click", function () { grade(true); });
    if (fail) fail.addEventListener("click", function () { grade(false); });
  }

  function choixOptions(p) {
    var correct = p[otherSide(promptSide)];
    var distractors = shuffle(
      PAIRS.filter(function (x) { return x.id !== p.id; }).map(function (x) {
        return Math.random() < 0.5 ? x.a : x.b;
      })
    ).slice(0, 2);
    return shuffle([correct].concat(distractors));
  }

  function renderChoix() {
    var p = current();
    if (!p) return;
    var shown = p[promptSide];
    var opts = choixOptions(p);
    elTheme.textContent = p.theme + (p.tip ? " · " + p.tip : "");
    elMeta.textContent = "Quel est le contraste ?";
    elBody.innerHTML =
      '<p class="listen-prompt">Trouve le contraste</p>' +
      renderMember(shown, true);

    elActions.innerHTML =
      '<div class="pairs-choices" id="pairs-choices">' +
      opts
        .map(function (o, i) {
          return (
            '<button type="button" class="btn secondary pairs-choice" data-i="' +
            i +
            '">' +
            '<span class="arab">' +
            esc(o.arab) +
            "</span>" +
            '<span class="latn">' +
            esc(o.latn) +
            "</span>" +
            '<span class="choice-fr">' +
            esc(o.fr) +
            "</span></button>"
          );
        })
        .join("") +
      "</div>";

    var correctLatn = p[otherSide(promptSide)].latn;
    Array.prototype.forEach.call(document.querySelectorAll(".pairs-choice"), function (btn) {
      btn.addEventListener("click", function () {
        if (answered) return;
        answered = true;
        var i = Number(btn.getAttribute("data-i"));
        var picked = opts[i];
        var good = picked && picked.latn === correctLatn;
        btn.classList.add(good ? "ok" : "bad");
        Array.prototype.forEach.call(document.querySelectorAll(".pairs-choice"), function (b) {
          var oi = Number(b.getAttribute("data-i"));
          if (opts[oi] && opts[oi].latn === correctLatn) b.classList.add("ok");
          b.disabled = true;
        });
        if (good) {
          if (DAR) DAR.onCorrect();
          stats.ok += 1;
        } else {
          if (DAR) DAR.onWrong();
          stats.fail += 1;
        }
        setTimeout(next, good ? 650 : 1100);
      });
    });
  }

  function renderItem() {
    var p = current();
    if (!p) return;
    elProgress.textContent = index + 1 + " / " + session.length;
    flipped = false;
    answered = false;
    promptSide = Math.random() < 0.5 ? "a" : "b";
    if (mode === "choix") renderChoix();
    else renderFlip();
  }

  function grade(ok) {
    if (ok) {
      stats.ok += 1;
      if (DAR) DAR.onCorrect();
    } else {
      stats.fail += 1;
      if (DAR) DAR.onWrong();
    }
    next();
  }

  function next() {
    index += 1;
    if (index >= session.length) finish(false);
    else renderItem();
  }

  function finish(timeUp) {
    stopTimer();
    show("end");
    var msg = stats.ok + " ✓ · " + stats.fail + " raté(s)";
    if (timeUp) msg += " · temps écoulé";
    document.getElementById("pairs-end-stats").textContent = msg;
    if (DAR) {
      DAR.touchStreak();
      DAR.addXp(10 + stats.ok * 3, "paires");
      if (stats.fail === 0 && session.length >= 4) DAR.grantBadge("pairs_clean", "Paires clean");
    }
  }

  function start() {
    var checked = document.querySelector('input[name="pairs-mode"]:checked');
    mode = (checked && checked.value) || modeParam || "flip";
    var setifEl = document.getElementById("pairs-setif");
    includeSetif = setifEl ? setifEl.checked : true;
    session = buildSession();
    if (!session.length) {
      alert("Aucune paire disponible.");
      return;
    }
    index = 0;
    stats = { ok: 0, fail: 0 };
    show("play");
    startTimer();
    renderItem();
    if (DAR) DAR.sfx.click();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var setifEl = document.getElementById("pairs-setif");
    if (setifEl) setifEl.checked = true;
    var radios = document.querySelectorAll('input[name="pairs-mode"]');
    Array.prototype.forEach.call(radios, function (r) {
      if (r.value === modeParam) r.checked = true;
    });

    document.getElementById("btn-pairs-start").addEventListener("click", start);
    document.getElementById("btn-pairs-exit").addEventListener("click", function () {
      stopTimer();
      if (window.DAR_TTS) DAR_TTS.stop();
      show("setup");
    });
    document.getElementById("btn-pairs-replay").addEventListener("click", start);
    document.getElementById("btn-pairs-home").addEventListener("click", function () {
      location.href = "./index.html";
    });

    if (autoStart) start();
  });
})();
