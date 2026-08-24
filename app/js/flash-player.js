(function () {
  var data = window.DAR_DATA;
  var SRS = window.DAR_FLASH_SRS;
  var STORE = window.DAR_STORE;
  var DAR = window.DAR;

  if (!data || !SRS || !STORE) return;

  var params = new URLSearchParams(location.search);
  var deckParam = params.get("deck");
  var modeParam = params.get("mode") || "normal";
  var autoStart = params.has("deck") || params.get("start") === "1";

  var elSetup = document.getElementById("flash-setup");
  var elPlay = document.getElementById("flash-play");
  var elEnd = document.getElementById("flash-end");
  var elDeckSelect = document.getElementById("deck-select");
  var elCard = document.getElementById("flash-card");
  var elFront = document.getElementById("card-front");
  var elBack = document.getElementById("card-back");
  var elMeta = document.getElementById("card-meta");
  var elProgress = document.getElementById("flash-progress");
  var elTimer = document.getElementById("flash-timer");
  var elRateWrap = document.getElementById("rate-wrap");
  var elFlipBtn = document.getElementById("btn-flip");
  var elLatnToggle = document.getElementById("toggle-latn");

  var session = [];
  var index = 0;
  var flipped = false;
  var stats = { ok: 0, fail: 0 };
  var timerSec = 0;
  var timerLimit = 300;
  var timerId = null;
  var sessionMax = 8;
  var reverse = false;
  var showLatn = true;
  var listenMode = false;
  var listenPlays = 0;
  var dicteeMode = false;
  var typingMode = false;
  var dicteeChecked = false;
  var dicteeOk = false;

  var elDicteeWrap = document.getElementById("dictee-wrap");
  var elDicteeInput = document.getElementById("dictee-input");
  var elDicteeFeedback = document.getElementById("dictee-feedback");
  var elDicteeNext = document.getElementById("btn-dictee-next");
  var elDicteeLabel = document.getElementById("dictee-label");
  var elDicteeTip = document.getElementById("dictee-tip");
  var elTypingLive = document.getElementById("typing-live");
  var elActionsNormal = document.getElementById("flash-actions-normal");

  function isTypeMode() {
    return dicteeMode || typingMode;
  }

  function fmtTime(s) {
    var m = Math.floor(s / 60);
    var r = s % 60;
    return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
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

  function cardsForDeck(deckId) {
    return (data.cards || []).filter(function (c) { return c.deck === deckId; });
  }

  function buildSession(deckId, mode) {
    var pool = deckId ? cardsForDeck(deckId) : (data.cards || []).slice();
    if (dicteeMode) {
      pool = pool.filter(function (c) { return !!(c.latn && String(c.latn).trim()); });
    }
    if (typingMode) {
      pool = pool.filter(function (c) { return !!(c.arab && String(c.arab).trim()); });
    }
    if (!pool.length) return [];

    var ids = pool.map(function (c) { return c.id; });
    var failedStore = STORE.getFailedSet();
    var learning = SRS.learningIds(ids);
    var due = SRS.dueIds(ids);

    var failed = pool.filter(function (c) {
      return failedStore.has(c.id) || learning.has(c.id);
    });
    var rest = pool.filter(function (c) {
      return !failedStore.has(c.id) && !learning.has(c.id) && due.has(c.id);
    });
    if (!rest.length) rest = pool.filter(function (c) { return !failedStore.has(c.id) && !learning.has(c.id); });

    var max = sessionMax;
    if (mode === "flemme") {
      max = Math.min(5, sessionMax);
      failed = shuffle(failed).slice(0, max);
      return failed;
    }

    var nFail = Math.min(failed.length, Math.ceil(max * 0.5));
    var nRest = Math.min(rest.length, max - nFail);
    var picked = shuffle(failed).slice(0, nFail).concat(shuffle(rest).slice(0, nRest));
    if (picked.length < max) {
      var used = new Set(picked.map(function (c) { return c.id; }));
      var extra = shuffle(pool.filter(function (c) { return !used.has(c.id); }));
      picked = picked.concat(extra.slice(0, max - picked.length));
    }
    return shuffle(picked).slice(0, max);
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  function normalizeLatn(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[''`´]/g, "")
      .replace(/[؟?!.…,;:«»""]/g, "")
      .replace(/[ـ_–—−]/g, "-")
      .replace(/\s*-\s*/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function latnMatch(user, expected) {
    return normalizeLatn(user) === normalizeLatn(expected) && normalizeLatn(expected) !== "";
  }

  function normalizeArab(s) {
    return String(s || "")
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
      .replace(/\u0640/g, "")
      .replace(/[إأآٱ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[؟?!.…,;:«»""]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function arabMatch(user, expected) {
    return normalizeArab(user) === normalizeArab(expected) && normalizeArab(expected) !== "";
  }

  function expectedTypeTarget(card) {
    return typingMode ? card.arab : card.latn;
  }

  function typeMatch(user, card) {
    if (typingMode) return arabMatch(user, card.arab);
    return latnMatch(user, card.latn);
  }

  function speakCurrent(times) {
    var card = session[index];
    if (!card || !window.DAR_TTS) return;
    var text = card.arab || card.latn || "";
    if (!text) return;
    times = times || 1;
    DAR_TTS.speak(text);
    if (times > 1) {
      setTimeout(function () { DAR_TTS.speak(text); }, 1600);
    }
  }

  function renderFront(card) {
    if (typingMode) {
      return (
        '<p class="listen-prompt">Clavier arabe · retape le texte</p>' +
        '<p class="arab flash-arab typing-model">' + esc(card.arab) + "</p>" +
        '<p class="flash-fr typing-fr">' + esc(card.fr) + "</p>" +
        '<p class="listen-hint">Recopie en arabe · voyelles (َ ِ ُ) optionnelles</p>'
      );
    }
    if (dicteeMode) {
      return (
        '<p class="listen-prompt">Dictée · tape le latn</p>' +
        '<p class="flash-fr">' + esc(card.fr) + "</p>" +
        '<p class="listen-hint">Pas de peek sur le latn — 🔊 pour l’arabe</p>'
      );
    }
    if (listenMode) {
      return (
        '<p class="listen-prompt">Écoute · répète à voix haute</p>' +
        '<p class="arab flash-arab">' + esc(card.arab) + "</p>" +
        (showLatn && card.latn ? '<p class="latn flash-latn">' + esc(card.latn) + "</p>" : "") +
        '<p class="listen-hint">Tape pour voir le français</p>'
      );
    }
    if (reverse) {
      return '<p class="arab flash-arab">' + esc(card.arab) + "</p>" +
        (showLatn && card.latn ? '<p class="latn flash-latn">' + esc(card.latn) + "</p>" : "");
    }
    return '<p class="flash-fr">' + esc(card.fr) + "</p>";
  }

  function renderBack(card) {
    var html = "";
    if (typingMode || dicteeMode) {
      if (typingMode) {
        html += '<p class="arab flash-arab">' + esc(card.arab) + "</p>";
        if (card.latn) html += '<p class="latn flash-latn">' + esc(card.latn) + "</p>";
      } else {
        html += '<p class="latn flash-latn">' + esc(card.latn) + "</p>";
        html += '<p class="arab flash-arab">' + esc(card.arab) + "</p>";
      }
      if (card.ex_fr) html += '<p class="flash-ex-fr">' + esc(card.ex_fr) + "</p>";
      if (card.ex_arab) html += '<p class="arab flash-ex-arab">' + esc(card.ex_arab) + "</p>";
      return html;
    }
    if (listenMode) {
      html += '<p class="flash-fr">' + esc(card.fr) + "</p>";
      if (card.ex_fr) html += '<p class="flash-ex-fr">' + esc(card.ex_fr) + "</p>";
      if (card.ex_arab) html += '<p class="arab flash-ex-arab">' + esc(card.ex_arab) + "</p>";
      return html;
    }
    if (reverse) {
      html += '<p class="flash-fr">' + esc(card.fr) + "</p>";
      if (card.ex_fr) html += '<p class="flash-ex-fr">' + esc(card.ex_fr) + "</p>";
    } else {
      html += '<p class="arab flash-arab">' + esc(card.arab) + "</p>";
      if (showLatn && card.latn) html += '<p class="latn flash-latn">' + esc(card.latn) + "</p>";
      if (card.ex_arab) html += '<p class="arab flash-ex-arab">' + esc(card.ex_arab) + "</p>";
      if (card.ex_fr) html += '<p class="flash-ex-fr">' + esc(card.ex_fr) + "</p>";
      if (card.general) html += '<p class="flash-general"><span class="pill bonus">National</span> ' + esc(card.general) + "</p>";
    }
    return html;
  }

  function updateHints() {
    var card = session[index];
    if (!card) return;
    var again = SRS.preview(card.id, "again");
    var good = SRS.preview(card.id, "good");
    var elA = document.getElementById("hint-again");
    var elG = document.getElementById("hint-good");
    if (elA) elA.textContent = SRS.formatDays(again.interval);
    if (elG) elG.textContent = SRS.formatDays(good.interval);
  }

  function setFlipped(on) {
    if (isTypeMode()) {
      flipped = !!on;
      elCard.classList.toggle("flipped", flipped);
      elRateWrap.hidden = true;
      elFlipBtn.textContent = "Voir la réponse";
      elMeta.textContent = flipped
        ? (dicteeOk ? "Correct ✓" : "Presque — regarde la correction")
        : (elMeta.dataset.base || (typingMode ? "Retape l’arabe" : "Écris le latn"));
      return;
    }
    flipped = !!on;
    elCard.classList.toggle("flipped", flipped);
    elRateWrap.hidden = !flipped;
    elFlipBtn.textContent = flipped ? "Cacher" : (listenMode ? "Voir le français" : "Voir la réponse");
    elMeta.textContent = flipped ? "Tu savais ?" : (elMeta.dataset.base || "Tape pour retourner");
    if (flipped) {
      updateHints();
      if (!listenMode) speakCurrent(1);
    } else if (window.DAR_TTS && !listenMode) {
      DAR_TTS.stop();
    }
  }

  function resetDicteeUI() {
    dicteeChecked = false;
    dicteeOk = false;
    if (elDicteeInput) {
      elDicteeInput.value = "";
      elDicteeInput.disabled = false;
      elDicteeInput.classList.remove("ok", "bad", "partial");
    }
    if (elDicteeFeedback) {
      elDicteeFeedback.hidden = true;
      elDicteeFeedback.innerHTML = "";
      elDicteeFeedback.className = "dictee-feedback";
    }
    if (elDicteeNext) elDicteeNext.hidden = true;
    var checkBtn = document.getElementById("btn-dictee-check");
    if (checkBtn) checkBtn.hidden = false;
    if (elTypingLive) {
      elTypingLive.hidden = !typingMode;
      elTypingLive.innerHTML = "";
      elTypingLive.className = "typing-live";
    }
    prepareTypeChrome();
    updateTypingLive();
  }

  function prepareTypeChrome() {
    if (!elDicteeInput) return;
    if (typingMode) {
      if (elDicteeLabel) elDicteeLabel.textContent = "Écris en arabe";
      elDicteeInput.dir = "rtl";
      elDicteeInput.lang = "ar";
      elDicteeInput.placeholder = "اكتب هنا…";
      elDicteeInput.classList.add("arab-input");
      if (elDicteeTip) elDicteeTip.hidden = false;
    } else {
      if (elDicteeLabel) elDicteeLabel.textContent = "Écris en latn";
      elDicteeInput.dir = "ltr";
      elDicteeInput.lang = "fr";
      elDicteeInput.placeholder = "ex. salam 3likoum";
      elDicteeInput.classList.remove("arab-input");
      if (elDicteeTip) elDicteeTip.hidden = true;
    }
  }

  function syncModeChrome() {
    if (elDicteeWrap) elDicteeWrap.hidden = !isTypeMode();
    if (elActionsNormal) elActionsNormal.hidden = !!isTypeMode();
    elCard.classList.toggle("dictee-card", !!isTypeMode());
    elCard.setAttribute("role", isTypeMode() ? "group" : "button");
  }

  function updateTypingLive() {
    if (!typingMode || !elTypingLive || dicteeChecked) return;
    var card = session[index];
    if (!card) return;
    var target = normalizeArab(card.arab);
    var user = normalizeArab(elDicteeInput ? elDicteeInput.value : "");
    var okLen = 0;
    while (okLen < user.length && okLen < target.length && user.charAt(okLen) === target.charAt(okLen)) {
      okLen += 1;
    }
    var wrong = user.length > okLen;
    var done = user.length > 0 && user === target;
    var pct = target.length ? Math.round((okLen / target.length) * 100) : 0;
    elTypingLive.hidden = false;
    elTypingLive.removeAttribute("dir");
    elTypingLive.lang = "fr";
    elTypingLive.className = "typing-live" + (wrong ? " bad" : done ? " ok" : "");
    elTypingLive.innerHTML =
      '<span class="typing-meter"><i style="width:' + pct + '%"></i></span>' +
      '<span class="typing-count">' + okLen + " / " + target.length +
      (wrong ? " · erreur" : done ? " · ✓" : "") + "</span>";
    if (elDicteeInput) {
      elDicteeInput.classList.toggle("ok", done);
      elDicteeInput.classList.toggle("bad", wrong);
      elDicteeInput.classList.toggle("partial", !wrong && user.length > 0 && !done);
    }
  }

  function checkDictee() {
    var card = session[index];
    if (!card || dicteeChecked) return;
    var user = elDicteeInput ? elDicteeInput.value : "";
    dicteeOk = typeMatch(user, card);
    dicteeChecked = true;
    if (elDicteeInput) elDicteeInput.disabled = true;
    var checkBtn = document.getElementById("btn-dictee-check");
    if (checkBtn) checkBtn.hidden = true;

    var expected = expectedTypeTarget(card);
    var expectedHtml = typingMode
      ? '<span class="arab">' + esc(expected) + "</span>"
      : '<span class="latn">' + esc(expected) + "</span>";

    if (elDicteeFeedback) {
      elDicteeFeedback.hidden = false;
      elDicteeFeedback.className = "dictee-feedback " + (dicteeOk ? "ok" : "fail");
      elDicteeFeedback.innerHTML = dicteeOk
        ? "<strong>Correct</strong> — nice."
        : "<strong>Raté</strong> · attendu : " + expectedHtml;
    }
    if (elDicteeNext) elDicteeNext.hidden = false;
    if (elTypingLive) elTypingLive.hidden = true;
    setFlipped(true);
    if (window.DAR_TTS) speakCurrent(1);
  }

  function continueDictee() {
    rate(dicteeOk ? "good" : "again");
  }

  function renderCard() {
    var card = session[index];
    if (!card) return;
    elFront.innerHTML = renderFront(card);
    elBack.innerHTML = renderBack(card);
    var modeLabel = typingMode
      ? " · clavier arabe"
      : dicteeMode
        ? " · dictée"
        : listenMode
          ? " · écoute"
          : " · tape pour retourner";
    elMeta.dataset.base = card.id + " · " + card.niv + modeLabel;
    elProgress.textContent = index + 1 + " / " + session.length;
    syncModeChrome();
    if (isTypeMode()) {
      resetDicteeUI();
      setFlipped(false);
      setTimeout(function () {
        if (elDicteeInput) elDicteeInput.focus();
      }, 80);
      return;
    }
    setFlipped(false);
    if (listenMode) {
      listenPlays = 0;
      setTimeout(function () { speakCurrent(2); }, 250);
    }
  }

  function flip() {
    if (isTypeMode()) return;
    if (DAR) DAR.sfx.click();
    setFlipped(!flipped);
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer(limitSec) {
    stopTimer();
    timerSec = 0;
    timerLimit = limitSec;
    if (elTimer) elTimer.textContent = fmtTime(timerLimit);
    timerId = setInterval(function () {
      timerSec += 1;
      var left = Math.max(0, timerLimit - timerSec);
      if (elTimer) {
        elTimer.textContent = fmtTime(left);
        elTimer.classList.toggle("warn", left <= 60 && left > 0);
        elTimer.classList.toggle("hot", left === 0);
      }
      if (left <= 0) finishSession(true);
    }, 1000);
  }

  function show(view) {
    if (elSetup) elSetup.hidden = view !== "setup";
    if (elPlay) elPlay.hidden = view !== "play";
    if (elEnd) elEnd.hidden = view !== "end";
  }

  function rate(grade) {
    var card = session[index];
    if (!card) return;
    SRS.grade(card.id, grade);
    if (grade === "again") {
      STORE.markFailed(card.id);
      stats.fail += 1;
      if (DAR) DAR.onWrong();
    } else {
      STORE.clearFailed(card.id);
      stats.ok += 1;
      if (DAR) DAR.onCorrect();
    }
    index += 1;
    if (index >= session.length) finishSession(false);
    else renderCard();
  }

  function finishSession(timeUp) {
    stopTimer();
    show("end");
    var deckId = deckParam || (elDeckSelect && elDeckSelect.value);
    if (deckId) STORE.setCurrentDeck(deckId);
    STORE.recordSession(deckId, { ok: stats.ok, fail: stats.fail, total: session.length });

    var msg = stats.ok + " ✓ · " + stats.fail + " raté(s)";
    if (timeUp) msg += " · temps écoulé";
    document.getElementById("end-stats").textContent = msg;

    if (DAR) {
      DAR.touchStreak();
      DAR.addXp(10 + stats.ok * 3, "session flash");
      if (stats.fail === 0 && session.length >= 4) DAR.grantBadge("zero_fail", "0 raté cette session");
      if (session.length >= 8) DAR.grantBadge("session8", "Session 8 cartes");
    }
  }

  function startSession() {
    var deckId = deckParam || (elDeckSelect && elDeckSelect.value) || null;
    var mode = modeParam === "flemme" ? "flemme" : "normal";
    var settings = STORE.get().settings || {};
    var listenCheck = document.getElementById("mode-listen");
    var dicteeCheck = document.getElementById("mode-dictee");
    var typingCheck = document.getElementById("mode-typing");
    typingMode = modeParam === "typing" || modeParam === "arabe" || (typingCheck && typingCheck.checked);
    dicteeMode = !typingMode && (modeParam === "dictee" || modeParam === "dictation" || (dicteeCheck && dicteeCheck.checked));
    listenMode = !typingMode && !dicteeMode && (modeParam === "listen" || (listenCheck && listenCheck.checked));

    sessionMax = mode === "flemme" ? (settings.flemmeMax || 5) : (settings.sessionMax || 8);
    var minutes = mode === "flemme" ? (settings.flemmeMinutes || 2) : (settings.sessionMinutes || 5);
    showLatn = settings.showLatn !== false;
    var reverseCheck = document.getElementById("mode-reverse");
    if (listenMode || dicteeMode || typingMode) {
      reverse = false;
    } else if (modeParam === "reverse" || (reverseCheck && reverseCheck.checked)) {
      reverse = true;
    } else if (mode !== "flemme") {
      reverse = STORE.toggleReverseForSession();
    } else {
      reverse = false;
    }

    session = buildSession(deckId, mode);
    if (!session.length) {
      var msg = "Aucune carte pour ce deck.";
      if (dicteeMode) msg = "Aucune carte avec latn pour ce deck.";
      if (typingMode) msg = "Aucune carte avec arabe pour ce deck.";
      alert(msg);
      return;
    }

    index = 0;
    stats = { ok: 0, fail: 0 };
    if (deckId) STORE.setCurrentDeck(deckId);
    show("play");
    renderCard();
    startTimer(minutes * 60);
    if (DAR) DAR.sfx.click();
  }

  function populateDecks() {
    if (!elDeckSelect) return;
    var decks = (data.decks || []).slice().sort(function (a, b) {
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    });
    elDeckSelect.innerHTML =
      '<option value="">Toutes les cartes (mix)</option>' +
      decks.map(function (d) {
        var sel = d.id === deckParam ? " selected" : "";
        return '<option value="' + esc(d.id) + '"' + sel + ">" + esc(d.title) + " (" + d.count + ")</option>";
      }).join("");
  }

  function wireSetup() {
    populateDecks();
    var modeFlemme = document.getElementById("mode-flemme");
    var modeReverse = document.getElementById("mode-reverse");
    var modeListen = document.getElementById("mode-listen");
    var modeDictee = document.getElementById("mode-dictee");
    var modeTyping = document.getElementById("mode-typing");
    if (modeFlemme) modeFlemme.checked = modeParam === "flemme";
    if (modeReverse) modeReverse.checked = modeParam === "reverse";
    if (modeListen) modeListen.checked = modeParam === "listen";
    if (modeDictee) modeDictee.checked = modeParam === "dictee" || modeParam === "dictation";
    if (modeTyping) modeTyping.checked = modeParam === "typing" || modeParam === "arabe";

    document.getElementById("btn-start").addEventListener("click", function () {
      deckParam = elDeckSelect.value || null;
      if (modeFlemme && modeFlemme.checked) modeParam = "flemme";
      else if (modeTyping && modeTyping.checked) modeParam = "typing";
      else if (modeDictee && modeDictee.checked) modeParam = "dictee";
      else if (modeListen && modeListen.checked) modeParam = "listen";
      else if (modeReverse && modeReverse.checked) modeParam = "reverse";
      else modeParam = "normal";
      startSession();
    });
  }

  function wirePlay() {
    elCard.addEventListener("click", function (e) {
      if (isTypeMode()) return;
      if (e.target.closest(".flash-actions") || e.target.closest("#btn-speak") || e.target.closest("#dictee-wrap")) return;
      flip();
    });
    elCard.addEventListener("keydown", function (e) {
      if (isTypeMode()) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        flip();
      }
    });
    elFlipBtn.addEventListener("click", flip);
    var btnSpeak = document.getElementById("btn-speak");
    if (btnSpeak) {
      btnSpeak.addEventListener("click", function (e) {
        e.stopPropagation();
        speakCurrent();
      });
    }
    var btnDicteeSpeak = document.getElementById("btn-dictee-speak");
    if (btnDicteeSpeak) {
      btnDicteeSpeak.addEventListener("click", function (e) {
        e.stopPropagation();
        speakCurrent();
      });
    }
    var btnDicteeCheck = document.getElementById("btn-dictee-check");
    if (btnDicteeCheck) btnDicteeCheck.addEventListener("click", checkDictee);
    if (elDicteeNext) elDicteeNext.addEventListener("click", continueDictee);
    if (elDicteeInput) {
      elDicteeInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          if (dicteeChecked) continueDictee();
          else checkDictee();
        }
      });
      elDicteeInput.addEventListener("input", function () {
        if (typingMode && !dicteeChecked) updateTypingLive();
      });
    }
    document.getElementById("btn-ok").addEventListener("click", function () { rate("good"); });
    document.getElementById("btn-fail").addEventListener("click", function () { rate("again"); });
    document.getElementById("btn-exit").addEventListener("click", function () {
      stopTimer();
      if (window.DAR_TTS) DAR_TTS.stop();
      show("setup");
    });
    if (elLatnToggle) {
      elLatnToggle.checked = STORE.get().settings.showLatn !== false;
      elLatnToggle.addEventListener("change", function () {
        showLatn = elLatnToggle.checked;
        STORE.updateSettings({ showLatn: showLatn });
        if (flipped) {
          var card = session[index];
          if (card) elBack.innerHTML = renderBack(card);
        }
      });
    }
  }

  function wireEnd() {
    document.getElementById("btn-replay").addEventListener("click", startSession);
    document.getElementById("btn-home").addEventListener("click", function () {
      location.href = "./index.html";
    });
    document.getElementById("btn-failed").addEventListener("click", function () {
      modeParam = "flemme";
      startSession();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    wireSetup();
    wirePlay();
    wireEnd();
    show(autoStart ? "play" : "setup");
    if (autoStart) startSession();
  });
})();
