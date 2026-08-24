(function () {
  var C = window.DAR_CONJ;
  if (!C || !C.verbs.length) return;

  var elVerb = document.getElementById("conj-verb");
  var elTense = document.getElementById("conj-tense");
  var elTip = document.getElementById("conj-tip");
  var elNote = document.getElementById("conj-note");
  var elImp = document.getElementById("conj-imperative");
  var elTable = document.getElementById("conj-table");

  var drillCount = 0;
  var drill = null;

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  function currentVerb() {
    return C.verbs.find(function (v) { return v.id === elVerb.value; }) || C.verbs[0];
  }

  function currentTense() {
    return C.tenses.find(function (t) { return t.id === elTense.value; }) || C.tenses[0];
  }

  function populate() {
    elVerb.innerHTML = C.verbs
      .map(function (v) {
        return '<option value="' + esc(v.id) + '">' + esc(v.fr) + " — " + esc(v.arab) + "</option>";
      })
      .join("");
    elTense.innerHTML = C.tenses
      .map(function (t) {
        return '<option value="' + esc(t.id) + '">' + esc(t.label) + "</option>";
      })
      .join("");
  }

  function renderTable() {
    var v = currentVerb();
    var t = currentTense();
    var forms = v[t.id] || [];
    elTip.textContent = t.tip || "";
    if (v.note) {
      elNote.hidden = false;
      elNote.textContent = v.note;
    } else {
      elNote.hidden = true;
    }

    if (v.imperative) {
      elImp.hidden = false;
      elImp.innerHTML =
        "<strong>Impératif</strong> · H: <span class=\"arab\">" +
        esc(v.imperative.H) +
        '</span> · F: <span class="arab">' +
        esc(v.imperative.F) +
        '</span> · Pl: <span class="arab">' +
        esc(v.imperative.Pl) +
        '</span> <span class="latn">(' +
        esc(v.imperative.latn) +
        ")</span>";
    } else {
      elImp.hidden = true;
    }

    var rows = C.persons
      .map(function (p, i) {
        return (
          "<tr><td><strong>" +
          esc(p.fr) +
          '</strong><br><span class="latn">' +
          esc(p.latn) +
          '</span></td><td class="arab">' +
          esc(forms[i] || "—") +
          "</td></tr>"
        );
      })
      .join("");
    elTable.innerHTML =
      "<thead><tr><th>Personne</th><th>" +
      esc(t.label) +
      " · " +
      esc(v.fr) +
      "</th></tr></thead><tbody>" +
      rows +
      "</tbody>";
  }

  function showPanel(name) {
    ["table", "drill", "notes"].forEach(function (n) {
      var el = document.getElementById("panel-" + n);
      if (el) el.hidden = n !== name;
    });
    document.querySelectorAll("#conj-tabs .culture-tab").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-panel") === name);
    });
  }

  function pickDrill() {
    var v = C.verbs[Math.floor(Math.random() * C.verbs.length)];
    var tenseIds = ["present", "past", "future", "progressive", "negPresent", "negPast"];
    var tid = tenseIds[Math.floor(Math.random() * tenseIds.length)];
    var pi = Math.floor(Math.random() * C.persons.length);
    var p = C.persons[pi];
    var tense = C.tenses.find(function (x) { return x.id === tid; });
    var arab = (v[tid] || [])[pi] || "—";
    drill = { v: v, tense: tense, p: p, arab: arab };
    document.getElementById("drill-meta").textContent = v.fr + " · " + tense.label;
    document.getElementById("drill-prompt").textContent = "Conjugue à voix haute";
    document.getElementById("drill-fr").textContent = p.fr + " — " + v.fr + " (" + tense.label + ")";
    document.getElementById("drill-arab").textContent = arab;
    document.getElementById("drill-answer").hidden = true;
  }

  document.addEventListener("DOMContentLoaded", function () {
    populate();
    renderTable();

    elVerb.addEventListener("change", renderTable);
    elTense.addEventListener("change", renderTable);

    document.getElementById("btn-conj-speak-all").addEventListener("click", function () {
      var v = currentVerb();
      var t = currentTense();
      var forms = (v[t.id] || []).slice();
      if (!forms.length || !window.DAR_TTS) return;
      var i = 0;
      function speakNext() {
        if (i >= forms.length) return;
        var text = forms[i];
        i += 1;
        DAR_TTS.speak(text, {
          onend: function () {
            setTimeout(speakNext, 220);
          },
          onerror: function () {
            setTimeout(speakNext, 220);
          },
        });
      }
      speakNext();
    });

    document.querySelectorAll("#conj-tabs .culture-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var panel = btn.getAttribute("data-panel");
        showPanel(panel);
        if (panel === "drill") pickDrill();
      });
    });

    document.getElementById("notes-list").innerHTML =
      "<h2>Mémo temps</h2><ul class=\"cours-list\">" +
      C.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") +
      "</ul><h2>Les 8 personnes</h2><ul class=\"cours-list\">" +
      C.persons
        .map(function (p) {
          return "<li>" + esc(p.fr) + ' · <span class="arab">' + esc(p.arab) + '</span> · <span class="latn">' + esc(p.latn) + "</span></li>";
        })
        .join("") +
      "</ul>";

    document.getElementById("drill-reveal").addEventListener("click", function () {
      document.getElementById("drill-answer").hidden = false;
      drillCount += 1;
      document.getElementById("drill-stats").textContent = drillCount + " révélée(s)";
      if (window.DAR) DAR.sfx.click();
    });
    document.getElementById("drill-speak").addEventListener("click", function () {
      if (drill && window.DAR_TTS) DAR_TTS.speak(drill.arab);
    });
    document.getElementById("drill-next").addEventListener("click", function () {
      if (window.DAR) DAR.sfx.click();
      pickDrill();
    });

    var params = new URLSearchParams(location.search);
    if (params.get("verb")) {
      elVerb.value = params.get("verb");
      renderTable();
    }
    if (params.get("panel") === "drill") {
      showPanel("drill");
      pickDrill();
    }
  });
})();
