/* TTS arabe — Web Speech API */
(function (global) {
  var preferred = null;
  var ready = false;

  function pickVoice() {
    if (!global.speechSynthesis) return null;
    var voices = speechSynthesis.getVoices() || [];
    if (!voices.length) return null;
    var prefer = ["ar-DZ", "ar-SA", "ar-EG", "ar-MA", "ar-XA", "ar"];
    for (var i = 0; i < prefer.length; i++) {
      var code = prefer[i];
      for (var j = 0; j < voices.length; j++) {
        var lang = (voices[j].lang || "").toLowerCase();
        if (lang === code.toLowerCase() || lang.indexOf(code.toLowerCase()) === 0) {
          preferred = voices[j];
          return preferred;
        }
      }
    }
    for (var k = 0; k < voices.length; k++) {
      if ((voices[k].lang || "").toLowerCase().indexOf("ar") === 0) {
        preferred = voices[k];
        return preferred;
      }
    }
    return null;
  }

  function ensureVoices(cb) {
    if (!global.speechSynthesis) {
      if (cb) cb(false);
      return;
    }
    if (pickVoice()) {
      ready = true;
      if (cb) cb(true);
      return;
    }
    speechSynthesis.onvoiceschanged = function () {
      pickVoice();
      ready = !!preferred;
      if (cb) cb(ready);
    };
    setTimeout(function () {
      pickVoice();
      ready = !!preferred;
      if (cb) cb(ready);
    }, 400);
  }

  function speak(text, opts) {
    opts = opts || {};
    if (!text || !global.speechSynthesis) return false;
    if (global.DAR && DAR.state && DAR.state().mute && !opts.force) return false;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(text));
      var v = preferred || pickVoice();
      if (v) u.voice = v;
      u.lang = (v && v.lang) || "ar-SA";
      u.rate = opts.rate || 0.9;
      u.pitch = 1;
      if (opts.onend) u.onend = opts.onend;
      if (opts.onerror) u.onerror = opts.onerror;
      speechSynthesis.speak(u);
      return true;
    } catch (_) {
      return false;
    }
  }

  function stop() {
    if (global.speechSynthesis) speechSynthesis.cancel();
  }

  ensureVoices();

  global.DAR_TTS = {
    speak: speak,
    stop: stop,
    ensureVoices: ensureVoices,
    hasArabic: function () { return !!pickVoice(); },
  };
})(window);
