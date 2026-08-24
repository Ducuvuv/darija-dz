/* QCM darija — vies, combo, explications (adapté Biochimie) */
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

  function mount(root, bank, opts) {
    if (!root || !bank || !bank.length) return null;
    opts = opts || {};
    var DAR = global.DAR;
    var livesMax = opts.lives || (bank.length > 12 ? 5 : 3);
    var lives = livesMax;
    var i = 0;
    var score = 0;
    var streak = 0;
    var best = 0;
    var locked = false;
    var order = shuffle(bank.map(function (_, idx) { return idx; }));

    root.innerHTML =
      '<div class="qcm-hud">' +
      '<span class="qcm-lives" id="qcm-lives"></span>' +
      '<span class="qcm-score" id="qcm-score">0 pts</span>' +
      '<span class="qcm-streak" id="qcm-streak">série ×0</span>' +
      "</div>" +
      '<div class="qcm-progress"><i id="qcm-bar"></i></div>' +
      '<p class="qcm-q" id="qcm-q"></p>' +
      '<div class="qcm-opts" id="qcm-opts"></div>' +
      '<div class="qcm-explain" id="qcm-explain" hidden></div>' +
      '<div class="qcm-actions">' +
      '<button type="button" class="btn secondary btn-sm" id="qcm-next" hidden>Suivant</button>' +
      '<button type="button" class="btn secondary btn-sm" id="qcm-restart" hidden>Rejouer</button>' +
      "</div>" +
      '<p class="qcm-end" id="qcm-end" hidden></p>';

    var elLives = root.querySelector("#qcm-lives");
    var elScore = root.querySelector("#qcm-score");
    var elStreak = root.querySelector("#qcm-streak");
    var elBar = root.querySelector("#qcm-bar");
    var elQ = root.querySelector("#qcm-q");
    var elOpts = root.querySelector("#qcm-opts");
    var elExplain = root.querySelector("#qcm-explain");
    var elNext = root.querySelector("#qcm-next");
    var elRestart = root.querySelector("#qcm-restart");
    var elEnd = root.querySelector("#qcm-end");

    function paintHud() {
      elLives.textContent = "\u2764".repeat(lives) + "\u2661".repeat(Math.max(0, livesMax - lives));
      elScore.textContent = score + " pts";
      elStreak.textContent = "série ×" + streak;
      elStreak.classList.toggle("hot", streak >= 3);
      elBar.style.width = Math.round((i / bank.length) * 100) + "%";
    }

    function finish(reason) {
      locked = true;
      elOpts.innerHTML = "";
      elExplain.hidden = true;
      elNext.hidden = true;
      elRestart.hidden = false;
      elEnd.hidden = false;
      var pct = Math.round((score / (bank.length * 10)) * 100);
      elEnd.innerHTML =
        "<strong>" + (reason || "Terminé") + "</strong><br>" +
        score + " pts · meilleure série ×" + best + " · " + pct + " % du max";
      if (DAR) {
        DAR.addXp(Math.max(10, Math.round(score / 2)), "QCM");
        DAR.burst(pct >= 70 ? 80 : 35);
        if (pct >= 80) DAR.grantBadge("qcm80", "QCM ≥ 80 %");
        if (best >= 5) DAR.grantBadge("qcmstreak", "Série QCM ×5");
        DAR.touchStreak();
      }
      if (global.DAR_STORE) global.DAR_STORE.recordSession(null, { ok: score / 10, fail: livesMax - lives, total: bank.length });
    }

    function show() {
      if (lives <= 0) return finish("Plus de vies — tu réessaies ?");
      if (i >= bank.length) return finish("Bravo — run terminée !");
      locked = false;
      elNext.hidden = true;
      elRestart.hidden = true;
      elEnd.hidden = true;
      elExplain.hidden = true;
      elExplain.className = "qcm-explain";
      paintHud();
      var item = bank[order[i]];
      elQ.textContent = item.q;
      elOpts.innerHTML = "";
      shuffle(item.opts).forEach(function (opt) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = opt;
        b.addEventListener("click", function () { pick(b, opt === item.a, item); });
        elOpts.appendChild(b);
      });
    }

    function pick(btn, good, item) {
      if (locked) return;
      locked = true;
      var buttons = elOpts.querySelectorAll("button");
      for (var bi = 0; bi < buttons.length; bi++) {
        buttons[bi].disabled = true;
        if (buttons[bi].textContent === item.a) buttons[bi].classList.add("good");
      }
      if (good) {
        btn.classList.add("good");
        score += 10 + Math.min(10, streak * 2);
        streak += 1;
        if (streak > best) best = streak;
        if (DAR) DAR.onCorrect(1);
        elExplain.hidden = false;
        elExplain.classList.add("ok");
        var whyHtml = item.arab ? '<span class="arab qcm-arab">' + item.arab + "</span><br>" : "";
        elExplain.innerHTML = "<strong>Oui !</strong> " + whyHtml + (item.why || "Bien vu.");
      } else {
        btn.classList.add("bad");
        lives -= 1;
        streak = 0;
        if (DAR) DAR.onWrong();
        elExplain.hidden = false;
        elExplain.classList.add("bad");
        elExplain.innerHTML =
          "<strong>Presque.</strong> " + (item.why ? item.why : "Bonne réponse : " + item.a);
      }
      paintHud();
      if (lives <= 0) {
        setTimeout(function () { finish("Plus de vies"); }, 700);
        return;
      }
      elNext.hidden = false;
    }

    elNext.addEventListener("click", function () {
      i += 1;
      show();
    });
    elRestart.addEventListener("click", function () {
      lives = livesMax;
      i = 0;
      score = 0;
      streak = 0;
      order = shuffle(bank.map(function (_, idx) { return idx; }));
      show();
    });

    show();
    return { restart: elRestart.click.bind(elRestart) };
  }

  global.DAR_QCM_MOUNT = mount;
})(window);
