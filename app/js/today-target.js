/* Cible du jour — deck à travailler */
(function (global) {
  var KEY = "dar_today_v1";

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function a1Decks(decks) {
    return decks
      .filter(function (d) { return d.source === "02-lexique-quotidien.md" && /-deck-\d/.test(d.id); })
      .sort(function (a, b) { return a.id.localeCompare(b.id, undefined, { numeric: true }); });
  }

  function failedByDeck(cards, failedSet) {
    var map = {};
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (!failedSet.has(c.id)) continue;
      map[c.deck] = (map[c.deck] || 0) + 1;
    }
    return map;
  }

  function pickTarget(data, store, srs) {
    var decks = data.decks || [];
    var cards = data.cards || [];
    var prog = store.get();
    var failedSet = store.getFailedSet();
    var srsMap = srs.load();

    var failMap = failedByDeck(cards, failedSet);
    var bestFail = null;
    for (var deckId in failMap) {
      if (!bestFail || failMap[deckId] > failMap[bestFail]) bestFail = deckId;
    }
    if (bestFail) {
      var d1 = decks.find(function (d) { return d.id === bestFail; });
      return { deckId: bestFail, reason: "review", title: d1 ? d1.title : bestFail, failCount: failMap[bestFail] };
    }

    if (prog.currentDeck) {
      var cur = decks.find(function (d) { return d.id === prog.currentDeck; });
      if (cur) return { deckId: cur.id, reason: "continue", title: cur.title };
    }

    var a1 = a1Decks(decks);
    for (var i = 0; i < a1.length; i++) {
      if (!prog.done || !prog.done[a1[i].id]) {
        return { deckId: a1[i].id, reason: "start", title: a1[i].title };
      }
    }

    var lowest = null;
    var lowestPct = 101;
    for (var j = 0; j < a1.length; j++) {
      var ids = cards.filter(function (c) { return c.deck === a1[j].id; }).map(function (c) { return c.id; });
      var p = store.deckProgress(a1[j].id, ids, srsMap);
      if (p.pct < lowestPct) {
        lowestPct = p.pct;
        lowest = a1[j];
      }
    }
    if (lowest) return { deckId: lowest.id, reason: "refresh", title: lowest.title, pct: lowestPct };

    return a1[0] ? { deckId: a1[0].id, reason: "start", title: a1[0].title } : null;
  }

  function saveToday(target) {
    if (!target || !target.deckId) return null;
    var payload = {
      deckId: target.deckId,
      title: target.title || "",
      reason: target.reason || "today",
      failCount: target.failCount || 0,
      pct: target.pct,
      day: todayISO(),
      at: new Date().toISOString(),
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(payload));
    } catch (_) {}
    return payload;
  }

  function readToday() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!raw || !raw.deckId) return null;
      if (raw.day && raw.day !== todayISO()) return null;
      return raw;
    } catch (_) {
      return null;
    }
  }

  function getTodayTarget(forceRefresh) {
    if (!forceRefresh) {
      var cached = readToday();
      if (cached) return cached;
    }
    var data = global.DAR_DATA;
    var store = global.DAR_STORE;
    var srs = global.DAR_FLASH_SRS;
    if (!data || !store || !srs) return null;
    return saveToday(pickTarget(data, store, srs));
  }

  function hrefsFor(deckId) {
    var q = encodeURIComponent(deckId);
    return {
      flash: "./flashcards.html?deck=" + q,
      deck: "./deck.html?id=" + q,
      qcm: "./qcm-player.html?deck=" + q,
      flemme: "./flashcards.html?deck=" + q + "&mode=flemme",
      listen: "./flashcards.html?deck=" + q + "&mode=listen",
      dictee: "./flashcards.html?deck=" + q + "&mode=dictee",
      typing: "./flashcards.html?deck=" + q + "&mode=typing",
    };
  }

  function reasonLabel(reason, target) {
    if (reason === "review") return (target.failCount || 0) + " raté(s) à revoir";
    if (reason === "continue") return "Reprendre où tu t'es arrêté";
    if (reason === "refresh") return "Consolider · " + (target.pct || 0) + " % vu";
    return "Premier deck A1";
  }

  global.DAR_TODAY = {
    getTodayTarget: getTodayTarget,
    hrefsFor: hrefsFor,
    reasonLabel: reasonLabel,
    pickTarget: pickTarget,
  };
})(window);
