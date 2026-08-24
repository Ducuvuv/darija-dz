(function () {
  var data = window.DAR_DATA;
  var STORE = window.DAR_STORE;
  var SRS = window.DAR_FLASH_SRS;

  if (!data || !STORE) return;

  var deckId = new URLSearchParams(location.search).get("id");
  var deck = (data.decks || []).find(function (d) { return d.id === deckId; });
  var cards = (data.cards || []).filter(function (c) { return c.deck === deckId; });

  function esc(s) {
    var el = document.createElement("div");
    el.textContent = s || "";
    return el.innerHTML;
  }

  function render() {
    if (!deck) {
      document.getElementById("deck-root").innerHTML =
        '<p class="flash-intro">Deck introuvable.</p><a class="btn" href="./index.html">Accueil</a>';
      return;
    }

    document.title = deck.title + " — Darija DZ";
    var prog = STORE.deckProgress(deckId, cards.map(function (c) { return c.id; }), SRS.load());

    document.getElementById("deck-title").textContent = deck.title;
    document.getElementById("deck-meta").textContent =
      deck.niv + " · " + deck.count + " cartes · " + deck.source.replace(".md", "");
    document.getElementById("deck-progress-label").textContent = prog.seen + " / " + prog.total + " vues (" + prog.pct + " %)";
    document.getElementById("deck-progress-bar").style.width = prog.pct + "%";

    if (deck.bonus) {
      document.getElementById("deck-badges").innerHTML = '<span class="pill bonus">Bonus Est</span>';
    } else {
      document.getElementById("deck-badges").innerHTML = '<span class="pill">' + esc(deck.niv) + "</span>";
    }

    var flashUrl = "./flashcards.html?deck=" + encodeURIComponent(deckId);
    document.getElementById("btn-flash").href = flashUrl;
    document.getElementById("btn-flemme").href = flashUrl + "&mode=flemme";

    var list = document.getElementById("card-list");
    list.innerHTML = cards
      .map(function (c) {
        return (
          '<details class="deck-card-row">' +
          '<summary><span class="deck-card-fr">' + esc(c.fr) + '</span><span class="deck-card-id">' + esc(c.id) + "</span></summary>" +
          '<div class="deck-card-body">' +
          '<p class="arab">' + esc(c.arab) + "</p>" +
          (c.latn ? '<p class="latn">' + esc(c.latn) + "</p>" : "") +
          (c.ex_fr ? '<p class="deck-card-ex">' + esc(c.ex_fr) + "</p>" : "") +
          "</div></details>"
        );
      })
      .join("");

    renderMiniExos(cards);
    STORE.setCurrentDeck(deckId);
  }

  function renderMiniExos(pool) {
    var box = document.getElementById("mini-exos");
    if (!pool.length) {
      box.hidden = true;
      return;
    }
    var picks = pool.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 3);
    box.innerHTML =
      '<h3>Mini-exos (3 au hasard)</h3>' +
      picks
        .map(function (c, i) {
          return (
            '<div class="mini-exo">' +
            "<p><strong>" + (i + 1) + ".</strong> Traduis : « " + esc(c.fr) + " »</p>" +
            '<button type="button" class="btn secondary btn-sm mini-reveal" data-i="' + i + '">Voir</button>' +
            '<div class="mini-answer" id="mini-a-' + i + '" hidden>' +
            '<p class="arab">' + esc(c.arab) + "</p>" +
            (c.latn ? '<p class="latn">' + esc(c.latn) + "</p>" : "") +
            "</div></div>"
          );
        })
        .join("");

    box.querySelectorAll(".mini-reveal").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = btn.getAttribute("data-i");
        var ans = document.getElementById("mini-a-" + i);
        if (ans) ans.hidden = false;
        btn.hidden = true;
        if (window.DAR) DAR.sfx.click();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", render);
})();
