(function () {
  var data = window.DAR_DATA;
  var QCM = window.DAR_QCM;
  var mount = window.DAR_QCM_MOUNT;

  if (!data || !QCM || !mount) return;

  var params = new URLSearchParams(location.search);
  var weekParam = params.get("week");
  var deckParam = params.get("deck");
  var quizParam = params.get("quiz");

  var elSetup = document.getElementById("qcm-setup");
  var elPlay = document.getElementById("qcm-play");
  var elList = document.getElementById("qcm-list");
  var elRoot = document.getElementById("qcm-root");
  var elTitle = document.getElementById("qcm-session-title");

  function show(view) {
    elSetup.hidden = view !== "setup";
    elPlay.hidden = view !== "play";
  }

  function startBank(bank, title) {
    if (!bank || !bank.length) {
      alert("Pas assez de questions pour ce quiz.");
      return;
    }
    elTitle.textContent = title || "QCM";
    elRoot.innerHTML = "";
    show("play");
    mount(elRoot, bank, { lives: bank.length > 12 ? 5 : 3 });
    if (window.DAR) DAR.sfx.click();
  }

  function renderList() {
    var quizzes = data.quizzes || [];
    var byWeek = {};
    quizzes.forEach(function (q) {
      if (!byWeek[q.week]) byWeek[q.week] = { title: q.weekTitle, items: [] };
      byWeek[q.week].items.push(q);
    });

    var html = "";
    Object.keys(byWeek)
      .sort(function (a, b) { return Number(a) - Number(b); })
      .forEach(function (w) {
        var g = byWeek[w];
        html += '<div class="qcm-week"><p class="eyebrow">Semaine ' + w + " — " + g.title + "</p>";
        g.items.forEach(function (quiz) {
          var n = (QCM.banks[quiz.id] || []).length;
          html +=
            '<button type="button" class="qcm-pick" data-quiz="' + quiz.id + '">' +
            quiz.section + " <span>(" + n + " Q)</span></button>";
        });
        html += "</div>";
      });

    html +=
      '<div class="qcm-week"><p class="eyebrow">Mix rapide</p>' +
      '<button type="button" class="qcm-pick" data-quiz="mix-a1">Mix A1 (10 Q)</button>' +
      '<button type="button" class="qcm-pick" data-quiz="mix-a2">Mix A1–A2 (10 Q)</button>' +
      "</div>";

    if (deckParam) {
      var deck = (data.decks || []).find(function (d) { return d.id === deckParam; });
      var deckBank = QCM.buildFromDeck(deckParam, data.cards || [], 8);
      html +=
        '<div class="qcm-week"><p class="eyebrow">Deck actuel</p>' +
        '<button type="button" class="qcm-pick" data-deck="' + deckParam + '">' +
        (deck ? deck.title : deckParam) + " (" + deckBank.length + " Q)</button></div>";
    }

    elList.innerHTML = html;

    elList.querySelectorAll(".qcm-pick").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var qid = btn.getAttribute("data-quiz");
        var did = btn.getAttribute("data-deck");
        if (qid) {
          var bank = QCM.banks[qid] || [];
          var quiz = quizzes.find(function (q) { return q.id === qid; }) || { section: qid };
          startBank(bank, "S" + (quiz.week || "") + " · " + (quiz.section || qid));
        } else if (did) {
          startBank(QCM.buildFromDeck(did, data.cards || [], 8), "Deck · " + did);
        }
      });
    });
  }

  document.getElementById("btn-exit-qcm").addEventListener("click", function () {
    show("setup");
    elRoot.innerHTML = "";
  });

  document.addEventListener("DOMContentLoaded", function () {
    QCM.banks = QCM.buildAll(data);
    renderList();

    if (quizParam && QCM.banks[quizParam]) {
      startBank(QCM.banks[quizParam], quizParam);
    } else if (weekParam) {
      var first = (data.quizzes || []).find(function (q) { return String(q.week) === String(weekParam); });
      if (first && QCM.banks[first.id]) startBank(QCM.banks[first.id], first.section);
    } else if (deckParam) {
      startBank(QCM.buildFromDeck(deckParam, data.cards || [], 8), "Deck");
    }
  });
})();
