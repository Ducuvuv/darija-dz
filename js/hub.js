(function () {
  var data = window.DAR_DATA;
  var TODAY = window.DAR_TODAY;
  var STORE = window.DAR_STORE;

  function nivOrder(n) {
    return { A1: 1, A2: 2, B1: 3, B2: 4 }[n] || 5;
  }

  function groupDecks(decks) {
    var groups = [
      { title: "Socle A1 — quotidien", filter: function (d) { return d.source === "02-lexique-quotidien.md"; } },
      { title: "Phrases & dialogues", filter: function (d) { return d.kind === "phrase"; } },
      { title: "Lexique B1–B2", filter: function (d) {
        return ["06-lexique-b1-b2.md", "09-lexique-b2-suite.md", "10-lexique-b2-complet.md", "11-lexique-b2-final.md"].indexOf(d.source) >= 0;
      } },
      { title: "Idiomes & expressions", filter: function (d) { return d.kind === "idiom"; } },
      { title: "Bonus Sétif", filter: function (d) { return d.bonus; } },
    ];
    return groups.map(function (g) {
      return {
        title: g.title,
        decks: decks.filter(g.filter).sort(function (a, b) {
          return nivOrder(a.niv) - nivOrder(b.niv) || a.title.localeCompare(b.title);
        }),
      };
    }).filter(function (g) { return g.decks.length; });
  }

  function renderDeckCard(d) {
    var bonus = d.bonus ? '<span class="pill bonus">Est</span>' : "";
    var niv = d.niv ? '<span class="pill">' + d.niv + "</span>" : "";
    var done = STORE && STORE.get().done && STORE.get().done[d.id] ? '<span class="pill live">✓</span>' : "";
    return (
      '<a class="hub-card" href="./deck.html?id=' + encodeURIComponent(d.id) + '">' +
      '<div class="num">' + d.id.replace(/^[^-]+-/, "") + "</div>" +
      "<h2>" + d.title + "</h2>" +
      "<p>" + d.count + " cartes · " + d.source.replace(".md", "") + "</p>" +
      '<div class="meta">' + niv + bonus + done + "</div></a>"
    );
  }

  function init() {
    if (!data) return;
    var stats = data.meta.stats;
    var decks = data.decks || [];

    document.getElementById("stat-cards").textContent = stats.cards;
    document.getElementById("stat-decks").textContent = stats.decks;

    if (TODAY && STORE) {
      var target = TODAY.getTodayTarget(true);
      if (target) {
        var links = TODAY.hrefsFor(target.deckId);
        document.getElementById("today-title").textContent = target.title || target.deckId;
        document.getElementById("today-meta").textContent = TODAY.reasonLabel(target.reason, target) + " · 8 cartes · audio";
        document.getElementById("today-go").href = links.flash;
        document.getElementById("today-flash").href = links.flash;
        document.getElementById("today-deck").href = links.deck;
        document.getElementById("today-qcm").href = links.qcm;
        var listenBtn = document.getElementById("today-listen");
        if (listenBtn) listenBtn.href = links.listen;
        var dicteeBtn = document.getElementById("today-dictee");
        if (dicteeBtn) dicteeBtn.href = links.dictee;
        var typingBtn = document.getElementById("today-typing");
        if (typingBtn) typingBtn.href = links.typing;
        document.getElementById("today-card").hidden = false;

        var failed = (STORE.get().failed || []).length;
        var homeStats = document.getElementById("home-review");
        if (homeStats) homeStats.textContent = failed;
      }
    }

    var hub = document.getElementById("deck-hub");
    hub.innerHTML = groupDecks(decks)
      .map(function (g) {
        return (
          '<section class="deck-group"><p class="eyebrow">' + g.title + "</p>" +
          '<div class="hub-grid">' + g.decks.map(renderDeckCard).join("") + "</div></section>"
        );
      })
      .join("");

    document.getElementById("btn-mute").addEventListener("click", function () {
      var s = window.DAR && DAR.state();
      if (s) DAR.setMute(!s.mute);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
