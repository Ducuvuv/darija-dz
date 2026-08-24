/* Flash SRS — répétition espacée (adapté PASS) */
(function (global) {
  var KEY = "dar-flash-srs-v1";
  var DEFAULT_EASE = 2.5;
  var MIN_EASE = 1.3;

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function addDaysISO(iso, days) {
    var d = new Date(String(iso).slice(0, 10) + "T12:00:00");
    d.setDate(d.getDate() + Math.max(0, days | 0));
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function blank() {
    return { due: todayISO(), interval: 0, ease: DEFAULT_EASE, reps: 0, lapses: 0 };
  }

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
    } catch (_) {
      return {};
    }
  }

  function save(map) {
    try {
      localStorage.setItem(KEY, JSON.stringify(map || {}));
    } catch (_) {}
  }

  function get(id) {
    var m = load();
    return m[id] ? Object.assign({}, m[id]) : null;
  }

  function nextState(prev, grade) {
    var cur = prev ? Object.assign({}, prev) : blank();
    var ease = Number(cur.ease) > 0 ? Number(cur.ease) : DEFAULT_EASE;
    var interval = Math.max(0, Number(cur.interval) || 0);
    var reps = Math.max(0, Number(cur.reps) || 0);
    var lapses = Math.max(0, Number(cur.lapses) || 0);
    var t = todayISO();

    if (grade === "again") {
      lapses += 1;
      reps = 0;
      interval = 0;
      ease = Math.max(MIN_EASE, ease - 0.2);
    } else if (grade === "easy") {
      if (reps === 0) interval = 4;
      else if (reps === 1) interval = Math.max(4, Math.round(interval * ease * 1.3) || 4);
      else interval = Math.max(4, Math.round(interval * ease * 1.3));
      ease += 0.15;
      reps += 1;
    } else {
      if (reps === 0) interval = 1;
      else if (reps === 1) interval = 3;
      else interval = Math.max(1, Math.round(interval * ease));
      reps += 1;
    }

    return {
      due: addDaysISO(t, interval),
      interval: interval,
      ease: Math.round(ease * 100) / 100,
      reps: reps,
      lapses: lapses,
    };
  }

  function grade(id, g) {
    if (!id) return null;
    if (g !== "again" && g !== "good" && g !== "easy") g = "good";
    var m = load();
    var next = nextState(m[id], g);
    m[id] = next;
    save(m);
    return next;
  }

  function preview(id, g) {
    return nextState(get(id), g);
  }

  function formatDays(n) {
    n = Math.max(0, Number(n) || 0);
    if (n === 0) return "aujourd'hui";
    if (n === 1) return "demain";
    return "dans " + n + " jours";
  }

  function dueIds(cardIds) {
    var m = load();
    var t = todayISO();
    var out = new Set();
    for (var i = 0; i < (cardIds || []).length; i++) {
      var id = cardIds[i];
      var row = m[id];
      if (!row || String(row.due || "") <= t) out.add(id);
    }
    return out;
  }

  function learningIds(cardIds) {
    var m = load();
    var out = new Set();
    var filter = cardIds ? new Set(cardIds) : null;
    for (var id in m) {
      if (filter && !filter.has(id)) continue;
      if ((Number(m[id].interval) || 0) === 0) out.add(id);
    }
    return out;
  }

  global.DAR_FLASH_SRS = {
    todayISO: todayISO,
    load: load,
    get: get,
    grade: grade,
    preview: preview,
    formatDays: formatDays,
    dueIds: dueIds,
    learningIds: learningIds,
    clear: function () { save({}); },
  };
})(window);
