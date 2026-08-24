(function () {
  var data = window.DAR_DATA;
  var STORE = window.DAR_STORE;
  var SRS = window.DAR_FLASH_SRS;
  var TODAY = window.DAR_TODAY;
  var DAR = window.DAR;

  if (!data || !STORE) return;

  function esc(s) {
    var el = document.createElement("div");
    el.textContent = s || "";
    return el.innerHTML;
  }

  function cardById(id) {
    return (data.cards || []).find(function (c) { return c.id === id; });
  }

  function deckTitle(deckId) {
    var d = (data.decks || []).find(function (x) { return x.id === deckId; });
    return d ? d.title : deckId;
  }

  function renderToday() {
    if (!TODAY) return;
    var target = TODAY.getTodayTarget(false);
    if (!target) return;
    var links = TODAY.hrefsFor(target.deckId);
    document.getElementById("today-session").hidden = false;
    document.getElementById("today-title").textContent = target.title || target.deckId;
    document.getElementById("today-meta").textContent = TODAY.reasonLabel(target.reason, target);
    document.getElementById("today-flash").href = links.flash;
    document.getElementById("today-deck").href = links.deck;
    document.getElementById("today-flemme").href = links.flemme;
  }

  function renderStats() {
    var failed = STORE.get().failed || [];
    var streak = Math.max(STORE.getStreak(), (DAR && DAR.state().streakDays) || 0);
    var srsMap = SRS.load();
    var totalSeen = 0;
    var totalCards = (data.cards || []).length;

    (data.decks || []).forEach(function (deck) {
      var ids = (data.cards || []).filter(function (c) { return c.deck === deck.id; }).map(function (c) { return c.id; });
      totalSeen += STORE.deckProgress(deck.id, ids, srsMap).seen;
    });

    document.getElementById("stat-streak").textContent = streak;
    document.getElementById("stat-failed").textContent = failed.length;
    document.getElementById("stat-seen").textContent = totalCards ? Math.round((totalSeen / totalCards) * 100) + " %" : "0 %";

    if (DAR) {
      var s = DAR.state();
      document.getElementById("stat-xp").textContent = s.xp;
      var badges = Object.keys(s.badges || {});
      document.getElementById("badge-list").innerHTML = badges.length
        ? badges.map(function (b) { return '<span class="badge-pill">' + esc(b) + "</span>"; }).join("")
        : '<span class="muted">Aucun badge encore</span>';
    }
  }

  function renderFailed() {
    var panel = document.getElementById("failed-panel");
    var failed = STORE.get().failed || [];
    if (!failed.length) {
      panel.innerHTML = '<p class="muted">Aucun raté — nice.</p>';
      return;
    }
    panel.innerHTML = failed
      .map(function (id) {
        var c = cardById(id);
        if (!c) return "";
        return (
          '<div class="suivi-row">' +
          '<div><strong>' + esc(c.fr) + '</strong><br><span class="arab suivi-arab">' + esc(c.arab) + "</span></div>" +
          '<a class="btn secondary btn-sm" href="./flashcards.html?deck=' + encodeURIComponent(c.deck) + '">Revoir</a>' +
          "</div>"
        );
      })
      .join("");
  }

  function renderDecks() {
    var srsMap = SRS.load();
    var cards = data.cards || [];
    var decks = (data.decks || []).slice().sort(function (a, b) {
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    });

    document.getElementById("deck-progress-list").innerHTML = decks
      .map(function (deck) {
        var ids = cards.filter(function (c) { return c.deck === deck.id; }).map(function (c) { return c.id; });
        var p = STORE.deckProgress(deck.id, ids, srsMap);
        var done = STORE.get().done && STORE.get().done[deck.id];
        return (
          '<a class="suivi-deck-row" href="./deck.html?id=' + encodeURIComponent(deck.id) + '">' +
          '<div class="suivi-deck-head"><strong>' + esc(deck.title) + "</strong>" +
          (done ? ' <span class="pill live">✓</span>' : "") +
          "</div>" +
          '<div class="progress-track"><i style="width:' + p.pct + '%"></i></div>' +
          '<span class="suivi-deck-meta">' + p.pct + " % · " + deck.niv + "</span></a>"
        );
      })
      .join("");
  }

  function ankiField(s) {
    return String(s || "").replace(/\t/g, " ").replace(/\r?\n/g, "<br>");
  }

  function exportAnkiFailed() {
    var failed = STORE.get().failed || [];
    if (!failed.length) {
      alert("Aucun raté à exporter.");
      return;
    }
    var lines = ["#separator:tab", "#html:true", "Front\tBack"];
    failed.forEach(function (id) {
      var c = cardById(id);
      if (!c) return;
      var back = [c.arab, c.latn, c.ex_arab, c.ex_fr].filter(Boolean).join("<br>");
      lines.push(ankiField(c.fr) + "\t" + ankiField(back));
    });
    var blob = new Blob([lines.join("\n")], { type: "text/tab-separated-values;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "darija-rates-anki.txt";
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 1500);
  }

  function wireActions() {
    document.getElementById("btn-reset-store").addEventListener("click", function () {
      if (!confirm("Reset progrès decks + ratés ? (XP conservé)")) return;
      STORE.resetAll();
      SRS.clear();
      location.reload();
    });
    document.getElementById("btn-reset-all").addEventListener("click", function () {
      if (!confirm("Tout effacer (progrès + SRS + XP) ?")) return;
      STORE.resetAll();
      SRS.clear();
      localStorage.removeItem("darija_rpg_v1");
      localStorage.removeItem("dar_today_v1");
      location.reload();
    });
    document.getElementById("btn-flash-failed").href = "./flashcards.html?mode=flemme";
    var ankiBtn = document.getElementById("btn-anki-failed");
    if (ankiBtn) ankiBtn.addEventListener("click", exportAnkiFailed);
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderToday();
    renderStats();
    renderFailed();
    renderDecks();
    wireActions();
    if (DAR) DAR.renderHud();
  });
})();
