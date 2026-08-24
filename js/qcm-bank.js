/* Banques QCM — révisions + decks */
(function (global) {
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

  function uniq(arr) {
    var s = new Set();
    return arr.filter(function (x) {
      if (!x || s.has(x)) return false;
      s.add(x);
      return true;
    });
  }

  function stripTicks(s) {
    return String(s || "").replace(/^`|`$/g, "").trim();
  }

  function extractLatn(answer) {
    var a = String(answer || "").trim();
    if (a.indexOf("/") >= 0) return a.split("/").pop().trim();
    return a;
  }

  function extractArab(answer) {
    var a = String(answer || "").trim();
    if (a.indexOf("/") >= 0) return a.split("/")[0].trim();
    return a;
  }

  function pickDistractors(pool, correct, n, pickFn) {
    pickFn = pickFn || function (x) { return x; };
    var opts = uniq([correct]);
    var candidates = shuffle(pool.map(pickFn).filter(function (v) { return v && v !== correct; }));
    for (var i = 0; i < candidates.length && opts.length < n + 1; i++) {
      if (opts.indexOf(candidates[i]) < 0) opts.push(candidates[i]);
    }
    while (opts.length < 4) opts.push("—");
    return shuffle(opts.slice(0, 4));
  }

  function buildFromQuiz(quiz, cards) {
    cards = cards || [];
    var latnPool = cards.map(function (c) { return c.latn; }).filter(Boolean);
    var frPool = cards.map(function (c) { return c.fr; }).filter(Boolean);
    var bank = [];

    for (var i = 0; i < (quiz.questions || []).length; i++) {
      var item = quiz.questions[i];
      var ans = (quiz.answers || [])[i] || "";
      if (!item || !ans) continue;

      if (item.type === "latn2fr") {
        var qLatn = stripTicks(item.q);
        var aFr = ans.split("/")[0].trim();
        bank.push({
          q: "Que signifie : " + qLatn + " ?",
          a: aFr,
          opts: pickDistractors(frPool, aFr, 3),
          why: qLatn + " → " + aFr,
        });
      } else {
        var aLatn = extractLatn(ans);
        var aArab = extractArab(ans);
        bank.push({
          q: "Traduis en darija : « " + item.q + " »",
          a: aLatn,
          opts: pickDistractors(latnPool, aLatn, 3),
          why: (aArab ? aArab + " · " : "") + aLatn,
          arab: aArab,
        });
      }
    }
    return bank;
  }

  function buildFromDeck(deckId, cards, limit) {
    var pool = cards.filter(function (c) { return c.deck === deckId && c.latn; });
    pool = shuffle(pool).slice(0, limit || 8);
    var allLatn = cards.map(function (c) { return c.latn; }).filter(Boolean);
    return pool.map(function (c) {
      return {
        q: "« " + c.fr + " » en darija (latn) ?",
        a: c.latn,
        opts: pickDistractors(allLatn, c.latn, 3),
        why: c.arab + " · " + c.latn,
        arab: c.arab,
      };
    });
  }

  function buildMix(cards, limit, filterFn) {
    var pool = shuffle(cards.filter(filterFn || Boolean)).slice(0, limit || 10);
    var latnPool = cards.map(function (c) { return c.latn; }).filter(Boolean);
    return pool.map(function (c) {
      return {
        q: "« " + c.fr + " » →",
        a: c.latn,
        opts: pickDistractors(latnPool, c.latn, 3),
        why: c.arab + " · " + c.latn,
        arab: c.arab,
      };
    });
  }

  function buildAll(data) {
    var banks = {};
    var cards = data.cards || [];
    (data.quizzes || []).forEach(function (quiz) {
      var bank = buildFromQuiz(quiz, cards);
      if (bank.length) banks[quiz.id] = bank;
    });
    banks["mix-a1"] = buildMix(cards, 10, function (c) { return c.niv === "A1" && c.latn; });
    banks["mix-a2"] = buildMix(cards, 10, function (c) {
      return (c.niv === "A1" || c.niv === "A2") && c.latn;
    });
    return banks;
  }

  global.DAR_QCM = {
    shuffle: shuffle,
    buildFromQuiz: buildFromQuiz,
    buildFromDeck: buildFromDeck,
    buildMix: buildMix,
    buildAll: buildAll,
    banks: {},
  };

  document.addEventListener("DOMContentLoaded", function () {
    if (global.DAR_DATA) global.DAR_QCM.banks = buildAll(global.DAR_DATA);
  });
})(window);
