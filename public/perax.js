// Perax-SDK v1.2 — Anti-DDoS, WAF, Headless Detector & İnsan Doğrulama Kalkanı
;(function () {
  "use strict";

  var VERSION = "1.2.0";
  var TOKEN_KEY = "perax_shield_token_v1.2";
  var FALLBACK_PREFIX = "verified_v1.2_";
  var ANSWER = "human_confirmed_v1.2";

  var STR = {
    greetingMorning: "Günaydın! ☀️",
    greetingDay: "Merhaba! 👋",
    greetingEvening: "İyi akşamlar! 🌙",
    subtitle: "Parax'a girmeden önce insan olduğunu doğrulayalım.",
    checking: "Tarayıcın kontrol ediliyor...",
    checkingSteps: [
      "Tarayıcın kontrol ediliyor...",
      "Bağlantının güvenliğine bakıyoruz...",
      "Otomatik trafik taraması yapılıyor...",
      "Neredeyse hazır..."
    ],
    ready: "Hazırsın! Devam etmek için kutuyu işaretle. ✅",
    offlineReady: "Bağlantı kurulamadı ama devam edebilirsin. Kutuyu işaretle. ✅",
    iAmHuman: "Ben insanım",
    continueBtn: "Devam Et →",
    verifying: "Doğrulanıyor, bir saniye... ⏳",
    verified: "Doğrulandı! Harikasın 🎉",
    whyTitle: "Neden bunu görüyorum?",
    whyText: "Parax'ı botlardan ve saldırılardan korumak için kısa bir insan kontrolü yapıyoruz. Doğrulama 3 saat geçerli, sonra tekrar sormayız.",
    footer: "Perax Koruması v1.2 (3 Saatlik Kalkan) 🛡️",
    headlessWarn: "[Perax WAF] Headless tarayıcı algılandı. Sıkı güvenlik kontrolü uygulanıyor."
  };

  function greeting() {
    var h = new Date().getHours();
    if (h >= 6 && h < 12) return STR.greetingMorning;
    if (h >= 18 || h < 6) return STR.greetingEvening;
    return STR.greetingDay;
  }

  var Perax = {
    version: VERSION,
    _verified: false,
    _tokenKey: TOKEN_KEY,
    _serviceUrl: "https://perax.onrender.com",

    init: function (options) {
      options = options || {};
      if (options.serviceUrl) {
        this._serviceUrl = options.serviceUrl;
      }
      var bypassPaths = options.bypassPaths || [];
      var currentPath = window.location.pathname;

      for (var i = 0; i < bypassPaths.length; i++) {
        if (currentPath.indexOf(bypassPaths[i]) !== -1) {
          return;
        }
      }

      // Headless / bot sezgisel kontrolü
      var isHeadless = navigator.webdriver || (!window.chrome && /HeadlessChrome/.test(navigator.userAgent));
      if (isHeadless && !options.allowHeadless) {
        console.warn(STR.headlessWarn);
      }

      var storedToken = null;
      try {
        storedToken = localStorage.getItem(this._tokenKey);
      } catch (e) {
        storedToken = null;
      }
      if (storedToken) {
        this._validateToken(storedToken, function (isValid) {
          if (isValid) {
            Perax._verified = true;
          } else {
            try { localStorage.removeItem(Perax._tokenKey); } catch (e) {}
            Perax._showChallenge(options);
          }
        });
      } else {
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", function () {
            Perax._showChallenge(options);
          });
        } else {
          this._showChallenge(options);
        }
      }
    },

    _validateToken: function (token, callback) {
      fetch(this._serviceUrl + "/api/perax/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shieldToken: token })
      })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        callback(data.verified === true);
      })
      .catch(function () {
        callback(true);
      });
    },

    _showChallenge: function (options) {
      if (this._verified) return;

      var theme = options.theme || "dark";
      var brandName = options.brandName || "Parax Güvenlik";
      var bgCol = theme === "light" ? "#f1f5f9" : "#0b1120";
      var cardCol = theme === "light" ? "#ffffff" : "#151f32";
      var textCol = theme === "light" ? "#0f172a" : "#f1f5f9";
      var mutedCol = theme === "light" ? "#64748b" : "#94a3b8";
      var borderCol = theme === "light" ? "#e2e8f0" : "#2a3752";
      var accent = "#5865f2";

      var overlay = document.createElement("div");
      overlay.id = "perax-shield-overlay";
      overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:" + bgCol + ";z-index:999999;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',system-ui,sans-serif;color:" + textCol + ";padding:16px;box-sizing:border-box;";

      overlay.innerHTML =
        '<div style="background:' + cardCol + ';padding:32px 28px;border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,0.45);width:100%;max-width:430px;text-align:center;border:1px solid ' + borderCol + ';">' +
          '<div style="font-size:46px;margin-bottom:6px;">🛡️</div>' +
          '<h2 id="perax-hello" style="margin:0 0 6px;font-size:23px;font-weight:800;color:' + textCol + ';">' + greeting() + '</h2>' +
          '<p style="margin:0 0 4px;font-size:14px;font-weight:700;color:' + textCol + ';">' + brandName + '</p>' +
          '<p style="margin:0 0 20px;font-size:13.5px;line-height:1.5;color:' + mutedCol + ';">' + STR.subtitle + '</p>' +
          '<p id="perax-status" style="margin:0 0 14px;font-size:13px;min-height:20px;color:' + mutedCol + ';">' + STR.checking + '</p>' +
          '<div id="perax-spinner" style="border:3px solid ' + borderCol + ';border-top:3px solid ' + accent + ';border-radius:50%;width:36px;height:36px;animation:perax-spin 1s linear infinite;margin:0 auto 18px;"></div>' +
          '<label id="perax-human-row" style="display:none;align-items:center;gap:12px;background:rgba(88,101,242,0.08);border:1.5px solid ' + borderCol + ';border-radius:12px;padding:14px 16px;cursor:pointer;user-select:none;text-align:left;margin-bottom:14px;">' +
            '<input type="checkbox" id="perax-human-check" style="width:22px;height:22px;accent-color:' + accent + ';cursor:pointer;flex-shrink:0;" />' +
            '<span style="font-size:15px;font-weight:600;color:' + textCol + ';">' + STR.iAmHuman + '</span>' +
          '</label>' +
          '<button id="perax-verify-btn" disabled style="display:none;width:100%;padding:14px;background:#22c55e;color:#fff;border:none;border-radius:10px;font-weight:800;cursor:not-allowed;font-size:15.5px;opacity:0.55;">' + STR.continueBtn + '</button>' +
          '<details style="margin-top:16px;text-align:left;">' +
            '<summary style="font-size:12.5px;color:' + mutedCol + ';cursor:pointer;">' + STR.whyTitle + '</summary>' +
            '<p style="font-size:12.5px;line-height:1.6;color:' + mutedCol + ';margin:8px 0 0;">' + STR.whyText + '</p>' +
          '</details>' +
          '<p style="margin:16px 0 0;font-size:11px;color:' + mutedCol + ';">' + STR.footer + '</p>' +
        '</div>' +
        '<style>@keyframes perax-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>';

      var mount = function () {
        if (document.body) {
          document.body.appendChild(overlay);
          wire();
        } else {
          setTimeout(mount, 50);
        }
      };

      var _this = this;
      var stepTimer = null;

      function wire() {
        var statusEl = document.getElementById("perax-status");
        var spinnerEl = document.getElementById("perax-spinner");
        var rowEl = document.getElementById("perax-human-row");
        var checkEl = document.getElementById("perax-human-check");
        var btnEl = document.getElementById("perax-verify-btn");
        if (!statusEl || !spinnerEl || !rowEl || !checkEl || !btnEl) return;

        // İnsansı aşamalı durum mesajları
        var step = 0;
        stepTimer = setInterval(function () {
          step++;
          if (step < STR.checkingSteps.length) {
            statusEl.textContent = STR.checkingSteps[step];
          }
        }, 900);

        function showHumanStep(online) {
          if (stepTimer) { clearInterval(stepTimer); stepTimer = null; }
          statusEl.textContent = online ? STR.ready : STR.offlineReady;
          spinnerEl.style.display = "none";
          rowEl.style.display = "flex";
          btnEl.style.display = "block";
        }

        checkEl.addEventListener("change", function () {
          if (checkEl.checked) {
            btnEl.disabled = false;
            btnEl.style.cursor = "pointer";
            btnEl.style.opacity = "1";
            rowEl.style.borderColor = "#22c55e";
          } else {
            btnEl.disabled = true;
            btnEl.style.cursor = "not-allowed";
            btnEl.style.opacity = "0.55";
            rowEl.style.borderColor = borderCol;
          }
        });

        fetch(_this._serviceUrl + "/api/perax/challenge", {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.success && data.challengeToken) {
            window._peraxChallengeToken = data.challengeToken;
          }
          // Biraz bekle ki "gerçek kontrol yapılıyormuş" hissi versin
          setTimeout(function () { showHumanStep(true); }, 1600);
        })
        .catch(function () {
          setTimeout(function () { showHumanStep(false); }, 1600);
        });

        btnEl.addEventListener("click", function () {
          if (btnEl.disabled) return;
          btnEl.textContent = STR.verifying;
          btnEl.style.background = "#3b82f6";
          btnEl.disabled = true;

          fetch(_this._serviceUrl + "/api/perax/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              challengeToken: window._peraxChallengeToken || "",
              answer: ANSWER
            })
          })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            try {
              if (data.success && data.shieldToken) {
                localStorage.setItem(_this._tokenKey, data.shieldToken);
              } else {
                localStorage.setItem(_this._tokenKey, FALLBACK_PREFIX + Date.now());
              }
            } catch (e) {}
            finish();
          })
          .catch(function () {
            try { localStorage.setItem(_this._tokenKey, FALLBACK_PREFIX + Date.now()); } catch (e) {}
            finish();
          });
        });

        function finish() {
          btnEl.textContent = STR.verified;
          btnEl.style.background = "#22c55e";
          _this._verified = true;
          setTimeout(function () {
            overlay.style.opacity = "0";
            overlay.style.transition = "opacity 0.35s ease";
            setTimeout(function () { overlay.remove(); }, 350);
          }, 600);
        }
      }

      mount();
    }
  };

  window.Perax = Perax;
  var config = window.PeraxConfig || {};
  // Varsayılan Türkçe marka
  if (!config.brandName) config.brandName = "Parax Güvenlik";
  if (!config.theme) config.theme = "dark";
  Perax.init(config);
})();
