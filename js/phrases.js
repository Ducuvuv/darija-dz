(function () {
  var data = window.DAR_DATA;
  if (!data) return;

  var phraseDecks = (data.decks || []).filter(function (d) { return d.kind === "phrase"; });
  var cards = (data.cards || []).filter(function (c) { return c.type === "phrase"; });
  var dialogues = data.dialogues || [];

  var elDecks = document.getElementById("phrase-decks");
  var elDialogues = document.getElementById("dialogue-list");
  var elStage = document.getElementById("dlg-stage");
  var elPlayer = document.getElementById("dialogue-player");
  var elScript = document.getElementById("dlg-script");
  var elHint = document.getElementById("dlg-hint");
  var elProgress = document.getElementById("dlg-progress");
  var elSaid = document.getElementById("dlg-said");
  var elPlay = document.getElementById("dlg-play");
  var elPause = document.getElementById("dlg-pause");

  var state = {
    dlg: null,
    idx: 0,
    role: "auto", // auto | A | B
    playing: false,
    waitingUser: false,
    advanceTimer: null,
  };

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  function clearAdvance() {
    if (state.advanceTimer) {
      clearTimeout(state.advanceTimer);
      state.advanceTimer = null;
    }
  }

  function stopAudio() {
    if (window.DAR_TTS) DAR_TTS.stop();
  }

  function renderDecks() {
    elDecks.innerHTML = phraseDecks
      .map(function (deck) {
        var list = cards.filter(function (c) { return c.deck === deck.id; });
        var rows = list
          .map(function (c) {
            return (
              '<details class="phrase-row">' +
              '<summary><span class="phrase-fr">' + esc(c.fr) + '</span><span class="phrase-id">' + esc(c.id) + "</span></summary>" +
              '<div class="phrase-body">' +
              '<p class="arab">' + esc(c.arab) + "</p>" +
              (c.latn ? '<p class="latn">' + esc(c.latn) + "</p>" : "") +
              '<a class="btn secondary btn-sm" href="./flashcards.html?deck=' + encodeURIComponent(deck.id) + '">Flash deck</a>' +
              "</div></details>"
            );
          })
          .join("");
        return (
          '<section class="deck-panel phrase-deck">' +
          "<h3>" + esc(deck.title) + ' <span class="pill">' + deck.niv + "</span></h3>" +
          rows +
          "</section>"
        );
      })
      .join("");
  }

  function renderDialogues() {
    if (!dialogues.length) {
      elDialogues.innerHTML = '<p class="muted">Aucun dialogue chargé.</p>';
      return;
    }
    elDialogues.innerHTML = dialogues
      .map(function (dlg, idx) {
        return (
          '<div class="dialogue-card">' +
          "<h4>" + esc(dlg.title) + "</h4>" +
          '<p class="muted">' + dlg.lines.length + " répliques · rôles A/B</p>" +
          '<div class="btn-row">' +
          '<button type="button" class="btn btn-sm btn-open-dlg" data-idx="' + idx + '" data-role="auto">▶ Jouer</button>' +
          '<button type="button" class="btn secondary btn-sm btn-open-dlg" data-idx="' + idx + '" data-role="A">Je suis A</button>' +
          '<button type="button" class="btn secondary btn-sm btn-open-dlg" data-idx="' + idx + '" data-role="B">Je suis B</button>' +
          "</div>" +
          '<div class="dialogue-lines">' +
          dlg.lines
            .map(function (ln) {
              return (
                '<div class="dlg-line role-' +
                ln.role.toLowerCase() +
                '"><b>' +
                ln.role +
                ':</b> <span class="arab">' +
                esc(ln.text) +
                "</span></div>"
              );
            })
            .join("") +
          "</div></div>"
        );
      })
      .join("");

    elDialogues.querySelectorAll(".btn-open-dlg").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openDialogue(
          dialogues[Number(btn.getAttribute("data-idx"))],
          btn.getAttribute("data-role") || "auto"
        );
      });
    });
  }

  function setRoleButtons() {
    document.querySelectorAll(".dlg-role-btn").forEach(function (btn) {
      btn.classList.toggle("active-role", btn.getAttribute("data-role") === state.role);
    });
  }

  function renderScript() {
    if (!state.dlg) return;
    elScript.innerHTML = state.dlg.lines
      .map(function (ln, i) {
        var cls = "dlg-script-line role-" + ln.role.toLowerCase();
        if (i === state.idx) cls += " current";
        if (i < state.idx) cls += " done";
        return (
          '<li class="' +
          cls +
          '" data-i="' +
          i +
          '"><b>' +
          ln.role +
          "</b> <span class=\"arab\">" +
          esc(ln.text) +
          "</span></li>"
        );
      })
      .join("");

    elScript.querySelectorAll(".dlg-script-line").forEach(function (li) {
      li.addEventListener("click", function () {
        goTo(Number(li.getAttribute("data-i")), { autoplay: false });
      });
    });
  }

  function isUserTurn() {
    if (state.role === "auto" || !state.dlg) return false;
    var ln = state.dlg.lines[state.idx];
    return ln && ln.role === state.role;
  }

  function showLine() {
    if (!state.dlg) return;
    var ln = state.dlg.lines[state.idx];
    if (!ln) return;

    document.getElementById("dlg-role").textContent = ln.role;
    document.getElementById("dlg-text").textContent = ln.text;
    elPlayer.className = "dialogue-player role-" + ln.role.toLowerCase();
    elProgress.textContent = state.idx + 1 + " / " + state.dlg.lines.length;

    var userTurn = isUserTurn();
    state.waitingUser = userTurn;

    if (userTurn) {
      elHint.textContent = "C’est toi (" + state.role + ") — dis-le à voix haute, puis continue.";
      elSaid.hidden = false;
      elPlay.textContent = "▶ Reprendre";
    } else if (state.role !== "auto") {
      elHint.textContent = "Écoute le partenaire (" + ln.role + ")";
      elSaid.hidden = true;
    } else {
      elHint.textContent = "Lecture auto — pause quand tu veux";
      elSaid.hidden = true;
    }

    renderScript();
  }

  function finishDialogue() {
    state.playing = false;
    state.waitingUser = false;
    clearAdvance();
    stopAudio();
    elHint.textContent = "Fin — rejoue en changeant de rôle.";
    elSaid.hidden = true;
    elPlay.textContent = "▶ Rejouer";
    document.getElementById("dlg-text").textContent = "✓";
    document.getElementById("dlg-role").textContent = "Fin";
    if (window.DAR) {
      DAR.addXp(10, "dialogue");
      DAR.sfx.done();
      if (state.role !== "auto") DAR.grantBadge("dlg_role", "Rôle A/B");
    }
  }

  function scheduleAdvance(delay) {
    clearAdvance();
    state.advanceTimer = setTimeout(function () {
      state.advanceTimer = null;
      if (!state.playing) return;
      if (state.idx + 1 >= state.dlg.lines.length) {
        finishDialogue();
        return;
      }
      state.idx += 1;
      presentCurrent({ fromAuto: true });
    }, delay || 500);
  }

  function speakCurrent(thenAdvance) {
    var ln = state.dlg && state.dlg.lines[state.idx];
    if (!ln) return;
    var advanced = false;
    function after() {
      if (advanced) return;
      advanced = true;
      if (thenAdvance && state.playing && !state.waitingUser) {
        scheduleAdvance(450);
      }
    }
    if (window.DAR) DAR.sfx.click();
    var ok = window.DAR_TTS && DAR_TTS.speak(ln.text, {
      onend: after,
      onerror: after,
    });
    if (!ok) {
      setTimeout(after, 1600);
    }
  }

  function presentCurrent(opts) {
    opts = opts || {};
    if (!state.dlg) return;
    if (state.idx >= state.dlg.lines.length) {
      finishDialogue();
      return;
    }
    showLine();

    if (isUserTurn()) {
      state.playing = true;
      state.waitingUser = true;
      stopAudio();
      clearAdvance();
      elPlay.textContent = "▶ Reprendre";
      return;
    }

    if (opts.autoplay || state.playing) {
      state.playing = true;
      state.waitingUser = false;
      elPlay.textContent = "▶ Lecture";
      speakCurrent(true);
    }
  }

  function goTo(i, opts) {
    opts = opts || {};
    clearAdvance();
    stopAudio();
    state.idx = Math.max(0, Math.min(i, state.dlg.lines.length - 1));
    state.waitingUser = false;
    if (opts.autoplay === false) {
      state.playing = false;
      showLine();
      return;
    }
    presentCurrent({ autoplay: true });
  }

  function play() {
    if (!state.dlg) return;
    if (state.idx >= state.dlg.lines.length) {
      state.idx = 0;
    }
    state.playing = true;
    presentCurrent({ autoplay: true });
  }

  function pause() {
    state.playing = false;
    clearAdvance();
    stopAudio();
    elHint.textContent = "En pause — ▶ pour continuer";
    elPlay.textContent = "▶ Reprendre";
  }

  function openDialogue(dlg, role) {
    if (!dlg || !dlg.lines.length) return;
    state.dlg = dlg;
    state.idx = 0;
    state.role = role || "auto";
    state.playing = false;
    state.waitingUser = false;
    clearAdvance();
    stopAudio();

    document.getElementById("dlg-title").textContent = dlg.title;
    elStage.hidden = false;
    setRoleButtons();
    showLine();
    elStage.scrollIntoView({ behavior: "smooth", block: "start" });

    if (state.role === "auto") {
      play();
    } else {
      elHint.textContent =
        "Tu joues " + state.role + " — l’autre rôle est lu à voix haute. Pause auto sur tes répliques.";
      play();
    }
  }

  function closeStage() {
    pause();
    state.dlg = null;
    elStage.hidden = true;
  }

  function wireStage() {
    document.getElementById("dlg-close").addEventListener("click", closeStage);
    elPlay.addEventListener("click", play);
    elPause.addEventListener("click", pause);
    document.getElementById("dlg-prev").addEventListener("click", function () {
      if (!state.dlg) return;
      goTo(state.idx - 1, { autoplay: false });
    });
    document.getElementById("dlg-next").addEventListener("click", function () {
      if (!state.dlg) return;
      if (state.idx + 1 >= state.dlg.lines.length) {
        finishDialogue();
        return;
      }
      goTo(state.idx + 1, { autoplay: state.playing || state.role !== "auto" });
    });
    document.getElementById("dlg-replay").addEventListener("click", function () {
      if (!state.dlg) return;
      if (isUserTurn()) {
        showLine();
        return;
      }
      speakCurrent(false);
    });
    elSaid.addEventListener("click", function () {
      if (!state.dlg || !state.waitingUser) return;
      if (window.DAR) DAR.sfx.ok();
      state.waitingUser = false;
      if (state.idx + 1 >= state.dlg.lines.length) {
        finishDialogue();
        return;
      }
      state.idx += 1;
      state.playing = true;
      presentCurrent({ autoplay: true });
    });
    document.querySelectorAll(".dlg-role-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!state.dlg) return;
        state.role = btn.getAttribute("data-role") || "auto";
        setRoleButtons();
        state.idx = 0;
        play();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderDecks();
    renderDialogues();
    wireStage();

    var params = new URLSearchParams(location.search);
    var dlgId = params.get("dlg");
    var role = params.get("role") || "auto";
    if (dlgId) {
      var found = dialogues.find(function (d) { return d.id === dlgId; });
      if (found) openDialogue(found, role);
    }
  });
})();
