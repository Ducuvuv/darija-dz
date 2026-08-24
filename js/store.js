/* Darija — progrès decks, ratés, réglages session */
(function (global) {
  var KEY = "darija_progress_v1";

  function load() {
    try {
      return Object.assign(
        {
          currentDeck: null,
          done: {},
          failed: [],
          settings: {
            sessionMax: 8,
            sessionMinutes: 5,
            flemmeMax: 5,
            flemmeMinutes: 2,
            showLatn: true,
            reverse: false,
          },
          lastReverseSession: false,
          activityDays: [],
          deckStats: {},
        },
        JSON.parse(localStorage.getItem(KEY) || "{}")
      );
    } catch (_) {
      return { currentDeck: null, done: {}, failed: [], settings: { sessionMax: 8, sessionMinutes: 5, flemmeMax: 5, flemmeMinutes: 2, showLatn: true, reverse: false }, lastReverseSession: false, activityDays: [], deckStats: {} };
    }
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function recordSession(deckId, stats) {
    var d = load();
    var today = todayISO();
    d.activityDays = d.activityDays || [];
    if (d.activityDays.indexOf(today) < 0) d.activityDays.push(today);
    if (deckId) {
      d.deckStats = d.deckStats || {};
      var ds = d.deckStats[deckId] || { sessions: 0, ok: 0, fail: 0 };
      ds.sessions += 1;
      ds.ok += (stats && stats.ok) || 0;
      ds.fail += (stats && stats.fail) || 0;
      ds.lastAt = new Date().toISOString();
      d.deckStats[deckId] = ds;
      d.currentDeck = deckId;
      if (stats && stats.fail === 0 && stats.ok >= Math.min(8, stats.total || 8)) {
        d.done[deckId] = true;
      }
    }
    save(d);
  }

  function getStreak() {
    var days = (load().activityDays || []).slice().sort();
    if (!days.length) return 0;
    var today = todayISO();
    var cursor = today;
    var set = new Set(days);
    var streak = 0;
    while (set.has(cursor)) {
      streak += 1;
      var d = new Date(cursor + "T12:00:00");
      d.setDate(d.getDate() - 1);
      cursor = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }
    return streak;
  }

  function deckProgress(deckId, cardIds, srsMap) {
    cardIds = cardIds || [];
    if (!cardIds.length) return { seen: 0, total: 0, pct: 0 };
    var seen = 0;
    for (var i = 0; i < cardIds.length; i++) {
      var row = srsMap[cardIds[i]];
      if (row && (Number(row.reps) || 0) > 0) seen += 1;
    }
    return { seen: seen, total: cardIds.length, pct: Math.round((seen / cardIds.length) * 100) };
  }

  function resetAll() {
    save({
      currentDeck: null,
      done: {},
      failed: [],
      settings: load().settings,
      lastReverseSession: false,
      activityDays: [],
      deckStats: {},
    });
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (_) {}
  }

  function get() {
    return load();
  }

  function setCurrentDeck(id) {
    var d = load();
    d.currentDeck = id || null;
    save(d);
  }

  function markFailed(id) {
    if (!id) return;
    var d = load();
    if (d.failed.indexOf(id) < 0) d.failed.push(id);
    save(d);
  }

  function clearFailed(id) {
    var d = load();
    d.failed = (d.failed || []).filter(function (x) { return x !== id; });
    save(d);
  }

  function getFailedSet() {
    return new Set(load().failed || []);
  }

  function updateSettings(patch) {
    var d = load();
    d.settings = Object.assign({}, d.settings, patch || {});
    save(d);
  }

  function toggleReverseForSession() {
    var d = load();
    d.settings.reverse = !d.lastReverseSession;
    d.lastReverseSession = d.settings.reverse;
    save(d);
    return d.settings.reverse;
  }

  global.DAR_STORE = {
    KEY: KEY,
    load: load,
    save: save,
    get: get,
    setCurrentDeck: setCurrentDeck,
    markFailed: markFailed,
    clearFailed: clearFailed,
    getFailedSet: getFailedSet,
    updateSettings: updateSettings,
    toggleReverseForSession: toggleReverseForSession,
    todayISO: todayISO,
    recordSession: recordSession,
    getStreak: getStreak,
    deckProgress: deckProgress,
    resetAll: resetAll,
  };
})(window);
