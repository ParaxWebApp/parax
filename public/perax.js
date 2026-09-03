// Perax-SDK v1.2 — Anti-DDoS, WAF, Headless Detector & İnsan Doğrulama Kalkanı
;(function () {
  "use strict";

  var VERSION = "1.2.0";
  var TOKEN_KEY = "perax_shield_token_v1.2";
  var FALLBACK_PREFIX = "verified_v1.2_";
  var ANSWER = "human_confirmed_v1.2";

  var STR = {
    greetingMorning: "Günaydın",
    greetingDay: "Merhaba",
    greetingEvening: "İyi akşamlar",
    subtitle: "Parax'a devam etmeden önce kısa bir güvenlik kontrolü yapalım. Bir dakikadan az sürer.",
    checking: "Bağlantın kontrol ediliyor...",
    checkingSteps: [
      "Bağlantın kontrol ediliyor...",
      "Trafiğin gözden geçiriliyor...",
      "Tarayıcın doğrulanıyor...",
      "Son bir kontrol kaldı..."
    ],
    ready: "Her şey yolunda görünüyor. Devam etmek için onayla.",
    offlineReady: "Sunucuya ulaşılamadı ama seni bekletmeyelim. Onaylayıp devam edebilirsin.",
    badge: "Güvenlik Kontrolü",
    iAmHuman: "Ben bir insanım",
    iAmHumanHint: "Otomatik sistemler bu adımı geçemez",
    continueBtn: "Devam Et",
    verifying: "Doğrulanıyor, lütfen bekle...",
    verified: "Doğrulandı. İyi sohbetler.",
    whyTitle: "Neden bunu görüyorum?",
    whyText: "Parax'ı botlardan ve saldırılardan korumak için kısa bir insan kontrolü yapıyoruz. Doğrulama 3 saat geçerli, sonra tekrar sormayız.",
    footer: "Perax Koruması v1.2 · 3 saat geçerli",
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
      var accentSoft = theme === "light" ? "#4f46e5" : "#a5b4fc";

      var overlay = document.createElement("div");
      overlay.id = "perax-shield-overlay";
      overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:" + bgCol + ";z-index:999999;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',system-ui,sans-serif;color:" + textCol + ";padding:16px;box-sizing:border-box;";

      overlay.innerHTML =
        '<div id="perax-card" style="background:' + cardCol + ';padding:34px 30px 28px;border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,0.45);width:100%;max-width:430px;text-align:center;border:1px solid ' + borderCol + ';animation:perax-fade 0.35s ease;">' +
          '<div style="display:inline-flex;align-items:center;gap:8px;background:rgba(88,101,242,0.12);border:1px solid rgba(88,101,242,0.35);border-radius:999px;padding:5px 14px;font-size:11.5px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:' + accentSoft + ';margin-bottom:16px;">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
            STR.badge +
          '</div>' +
          '<h2 id="perax-hello" style="margin:0 0 4px;font-size:24px;font-weight:800;letter-spacing:-0.01em;color:' + textCol + ';">' + greeting() + '</h2>' +
          '<p style="margin:0 0 6px;font-size:13.5px;font-weight:700;color:' + accentSoft + ';">' + brandName + '</p>' +
          '<p style="margin:0 0 22px;font-size:13.5px;line-height:1.6;color:' + mutedCol + ';">' + STR.subtitle + '</p>' +
          '<div id="perax-progress" style="height:4px;border-radius:999px;background:' + borderCol + ';overflow:hidden;margin-bottom:16px;"><div id="perax-bar" style="height:100%;width:30%;border-radius:999px;background:linear-gradient(90deg,' + accent + ',#22c55e);animation:perax-slide 1.4s ease-in-out infinite;"></div></div>' +
          '<p id="perax-status" style="margin:0 0 16px;font-size:13px;min-height:20px;color:' + mutedCol + ';">' + STR.checking + '</p>' +
          '<div id="perax-spinner" style="border:3px solid ' + borderCol + ';border-top:3px solid ' + accent + ';border-radius:50%;width:34px;height:34px;animation:perax-spin 1s linear infinite;margin:0 auto 18px;"></div>' +
          '<label id="perax-human-row" style="display:none;align-items:flex-start;gap:12px;background:rgba(88,101,242,0.07);border:1.5px solid ' + borderCol + ';border-radius:12px;padding:14px 16px;cursor:pointer;user-select:none;text-align:left;margin-bottom:14px;transition:border-color 0.2s ease,background 0.2s ease;">' +
            '<input type="checkbox" id="perax-human-check" style="width:21px;height:21px;accent-color:' + accent + ';cursor:pointer;flex-shrink:0;margin-top:1px;" />' +
            '<span><span style="display:block;font-size:15px;font-weight:700;color:' + textCol + ';">' + STR.iAmHuman + '</span>' +
            '<span style="display:block;font-size:12px;color:' + mutedCol + ';margin-top:2px;">' + STR.iAmHumanHint + '</span></span>' +
          '</label>' +
          '<button id="perax-verify-btn" disabled style="display:none;width:100%;padding:14px;background:#22c55e;color:#fff;border:none;border-radius:10px;font-weight:800;cursor:not-allowed;font-size:15.5px;opacity:0.55;transition:opacity 0.2s ease,transform 0.1s ease;">' + STR.continueBtn + '</button>' +
          '<details style="margin-top:16px;text-align:left;">' +
            '<summary style="font-size:12.5px;color:' + mutedCol + ';cursor:pointer;">' + STR.whyTitle + '</summary>' +
            '<p style="font-size:12.5px;line-height:1.6;color:' + mutedCol + ';margin:8px 0 0;">' + STR.whyText + '</p>' +
            '<p style="font-size:12.5px;margin:8px 0 0;"><a href="/errors.html" style="color:' + accentSoft + ';text-decoration:none;">Tüm hata kodları (Oddiss)</a></p>' +
          '</details>' +
          '<p style="margin:16px 0 0;font-size:11px;letter-spacing:0.02em;color:' + mutedCol + ';">' + STR.footer + '</p>' +
        '</div>' +
        '<style>' +
          '@keyframes perax-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }' +
          '@keyframes perax-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }' +
          '@keyframes perax-slide { 0% { margin-left: -30%; } 100% { margin-left: 100%; } }' +
          '@media (prefers-reduced-motion: reduce) { #perax-card { animation: none; } #perax-bar { animation: none; width: 100%; } #perax-spinner { animation-duration: 2s; } }' +
        '</style>';

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
        var progressEl = document.getElementById("perax-progress");
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
          if (progressEl) progressEl.style.display = "none";
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
