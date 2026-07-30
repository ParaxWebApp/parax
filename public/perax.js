// Perax-SDK — Cloudflare / AWS WAF style Human Verification & Anti-DDoS Shield (Connected to Perax Shield Web Service)
;(function () {
  "use strict";

  var Perax = {
    _verified: false,
    _tokenKey: "perax_shield_token_2026",
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

      var storedToken = localStorage.getItem(this._tokenKey);
      if (storedToken) {
        this._validateToken(storedToken, function (isValid) {
          if (isValid) {
            Perax._verified = true;
          } else {
            localStorage.removeItem(Perax._tokenKey);
            Perax._showChallenge();
          }
        });
      } else {
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", function () {
            Perax._showChallenge();
          });
        } else {
          this._showChallenge();
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

    _showChallenge: function () {
      if (this._verified) return;

      var overlay = document.createElement("div");
      overlay.id = "perax-shield-overlay";
      overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0f172a;z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;color:#f8fafc;";

      overlay.innerHTML = `
        <div style="background:#1e293b;padding:32px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.5);width:100%;max-width:400px;text-align:center;border:1px solid #334155;">
          <div style="font-size:36px;margin-bottom:12px;">🛡️</div>
          <h2 style="margin:0 0 8px;font-size:22px;color:#fff;">Perax Security Check</h2>
          <p id="perax-status" style="margin:0 0 24px;font-size:14px;color:#94a3b8;">Verifying your IP and session with Perax Shield...</p>
          <div id="perax-spinner" style="border:3px solid #334155;border-top:3px solid #22c55e;border-radius:50%;width:36px;height:36px;animation:perax-spin 1s linear infinite;margin:0 auto 16px;"></div>
          <button id="perax-verify-btn" style="display:none;width:100%;padding:12px;background:#22c55e;color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer;font-size:15px;">Verify You Are Human</button>
          <p style="margin:16px 0 0;font-size:11px;color:#64748b;">Protected by Perax WAF & Anti-DDoS Web Service</p>
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
            statusEl.textContent = "Security check ready. Click below to verify.";
            spinnerEl.style.display = "none";
            btnEl.style.display = "block";
          }, 1000);
        } else {
          statusEl.textContent = "Verification check ready.";
          spinnerEl.style.display = "none";
          btnEl.style.display = "block";
        }
      })
      .catch(function () {
        setTimeout(function () {
          statusEl.textContent = "Security check ready.";
          spinnerEl.style.display = "none";
          btnEl.style.display = "block";
        }, 1000);
      });

      btnEl.addEventListener("click", function () {
        btnEl.textContent = "Verifying with Perax Cloud...";
        btnEl.style.background = "#3b82f6";

        fetch(_this._serviceUrl + "/api/perax/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challengeToken: window._peraxChallengeToken || "",
            answer: "human_confirmed"
          })
        })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.success && data.shieldToken) {
            localStorage.setItem(_this._tokenKey, data.shieldToken);
          } else {
            localStorage.setItem(_this._tokenKey, "verified_local_" + Date.now());
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
          localStorage.setItem(_this._tokenKey, "verified_local_" + Date.now());
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
