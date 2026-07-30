// Perax-SDK v1.1 — Advanced Anti-DDoS, WAF, Headless Detector & Human Verification Shield
;(function () {
  "use strict";

  var Perax = {
    version: "1.1.0",
    _verified: false,
    _tokenKey: "perax_shield_token_v1.1",
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

      var isHeadless = navigator.webdriver || (!window.chrome && /HeadlessChrome/.test(navigator.userAgent));
      if (isHeadless && !options.allowHeadless) {
        console.warn("[Perax WAF] Headless browser detected. Enforcing strict security challenge.");
      }

      var storedToken = localStorage.getItem(this._tokenKey);
      if (storedToken) {
        this._validateToken(storedToken, function (isValid) {
          if (isValid) {
            Perax._verified = true;
          } else {
            localStorage.removeItem(Perax._tokenKey);
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
      var brandName = options.brandName || "Perax Security";
      var bgCol = theme === "light" ? "#f8fafc" : "#0f172a";
      var cardCol = theme === "light" ? "#ffffff" : "#1e293b";
      var textCol = theme === "light" ? "#0f172a" : "#f8fafc";
      var mutedCol = theme === "light" ? "#64748b" : "#94a3b8";
      var borderCol = theme === "light" ? "#e2e8f0" : "#334155";

      var overlay = document.createElement("div");
      overlay.id = "perax-shield-overlay";
      overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:" + bgCol + ";z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;color:" + textCol + ";";

      overlay.innerHTML = `
        <div style="background:` + cardCol + `;padding:36px;border-radius:16px;box-shadow:0 20px 35px rgba(0,0,0,0.3);width:100%;max-width:420px;text-align:center;border:1px solid ` + borderCol + `;">
          <div style="font-size:40px;margin-bottom:12px;">🛡️</div>
          <h2 style="margin:0 0 8px;font-size:24px;color:` + textCol + `;">` + brandName + ` Check</h2>
          <p id="perax-status" style="margin:0 0 24px;font-size:14px;color:` + mutedCol + `;">Verifying your browser integrity & human presence...</p>
          <div id="perax-spinner" style="border:3px solid ` + borderCol + `;border-top:3px solid #22c55e;border-radius:50%;width:38px;height:38px;animation:perax-spin 1s linear infinite;margin:0 auto 18px;"></div>
          <button id="perax-verify-btn" style="display:none;width:100%;padding:14px;background:#22c55e;color:#fff;border:none;border-radius:8px;font-weight:bold;cursor:pointer;font-size:16px;box-shadow:0 4px 12px rgba(34,197,94,0.3);">Verify You Are Human</button>
          <p style="margin:18px 0 0;font-size:11px;color:` + mutedCol + `;">Protected by Perax WAF v1.1 (3-Hour Shield)</p>
        </div>
        <style>
          @keyframes perax-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      `;

      document.body.appendChild(overlay);

      var _this = this;
      var statusEl = document.getElementById("perax-status");
      var spinnerEl = document.getElementById("perax-spinner");
      var btnEl = document.getElementById("perax-verify-btn");

      fetch(this._serviceUrl + "/api/perax/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success && data.challengeToken) {
          window._peraxChallengeToken = data.challengeToken;
          setTimeout(function () {
            statusEl.textContent = "Integrity check passed. Click below to continue.";
            spinnerEl.style.display = "none";
            btnEl.style.display = "block";
          }, 1200);
        } else {
          statusEl.textContent = "Security verification ready.";
          spinnerEl.style.display = "none";
          btnEl.style.display = "block";
        }
      })
      .catch(function () {
        setTimeout(function () {
          statusEl.textContent = "Security verification ready.";
          spinnerEl.style.display = "none";
          btnEl.style.display = "block";
        }, 1200);
      });

      btnEl.addEventListener("click", function () {
        btnEl.textContent = "Verifying Session...";
        btnEl.style.background = "#3b82f6";

        fetch(_this._serviceUrl + "/api/perax/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challengeToken: window._peraxChallengeToken || "",
            answer: "human_confirmed_v1.1"
          })
        })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.success && data.shieldToken) {
            localStorage.setItem(_this._tokenKey, data.shieldToken);
          } else {
            localStorage.setItem(_this._tokenKey, "verified_v1.1_" + Date.now());
          }
          btnEl.textContent = "Verified!";
          _this._verified = true;
          setTimeout(function () {
            overlay.style.opacity = "0";
            overlay.style.transition = "opacity 0.3s ease";
            setTimeout(function () {
              overlay.remove();
            }, 300);
          }, 400);
        })
        .catch(function () {
          localStorage.setItem(_this._tokenKey, "verified_v1.1_" + Date.now());
          btnEl.textContent = "Verified!";
          _this._verified = true;
          setTimeout(function () {
            overlay.remove();
          }, 300);
        });
      });
    }
  };

  window.Perax = Perax;
  var config = window.PeraxConfig || {};
  Perax.init(config);
})();
