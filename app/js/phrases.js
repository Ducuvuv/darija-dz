(function () {
  var data = window.DAR_DATA;
  if (!data) return;

  var phraseDecks = (data.decks || []).filter(function (d) { return d.kind === "phrase"; });
  var cards = (data.cards || []).filter(function (c) { return c.type === "phrase"; });
  var dialogues = data.dialogues || [];

  var elDecks = document.getElementById("phrase-decks");
  var elDialogues = document.getElementById("dialogue-list");
  var elPlayer = document.getElementById("dialogue-player");
  var playTimer = null;

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
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
          '<p class="muted">' + dlg.lines.length + " répliques</p>" +
          '<button type="button" class="btn secondary btn-sm btn-play-dlg" data-idx="' + idx + '">▶ Jouer A/B</button>' +
          '<div class="dialogue-lines">' +
          dlg.lines
            .map(function (ln) {
              return '<div class="dlg-line role-' + ln.role.toLowerCase() + '"><b>' + ln.role + ":</b> <span class=\"arab\">" + esc(ln.text) + "</span></div>";
            })
            .join("") +
          "</div></div>"
        );
      })
      .join("");

    elDialogues.querySelectorAll(".btn-play-dlg").forEach(function (btn) {
      btn.addEventListener("click", function () {
        playDialogue(dialogues[Number(btn.getAttribute("data-idx"))], btn);
      });
    });
  }

  function playDialogue(dlg, btn) {
    if (!dlg || !dlg.lines.length) return;
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
      btn.textContent = "▶ Jouer A/B";
      elPlayer.hidden = true;
      return;
    }
    var i = 0;
    btn.textContent = "■ Stop";
    elPlayer.hidden = false;
    elPlayer.innerHTML = '<p class="dlg-now"><span id="dlg-role"></span> <span class="arab" id="dlg-text"></span></p>';

    function showLine() {
      if (i >= dlg.lines.length) {
        clearInterval(playTimer);
        playTimer = null;
        btn.textContent = "▶ Rejouer";
        elPlayer.innerHTML = '<p class="muted">Fin du dialogue — rejoue à voix haute !</p>';
        if (window.DAR) {
          DAR.addXp(8, "dialogue");
          DAR.sfx.done();
        }
        return;
      }
      var ln = dlg.lines[i];
      document.getElementById("dlg-role").textContent = ln.role + ":";
      document.getElementById("dlg-text").textContent = ln.text;
      elPlayer.className = "dialogue-player role-" + ln.role.toLowerCase();
      if (window.DAR) DAR.sfx.click();
      i += 1;
    }
    showLine();
    playTimer = setInterval(showLine, 2800);
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderDecks();
    renderDialogues();
  });
})();
