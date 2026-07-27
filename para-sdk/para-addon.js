// Para Addon — Breadcrumbs & Performance Tracker
;(function () {
  "use strict";

  if (typeof window.Para === "undefined") {
    console.warn("[ParaAddon] Para core not found. Load para.js first.");
    return;
  }

  var MAX_BREADCRUMBS = 20;
  var breadcrumbs = [];

  var ParaAddon = {
    init: function () {
      this._hookClicks();
      this._hookNavigation();
      this._hookFetch();
    },

    _addBreadcrumb: function (category, message, data) {
      var crumb = {
        category: category,
        message: message,
        data: data || {},
        timestamp: new Date().toISOString()
      };
      breadcrumbs.push(crumb);
      if (breadcrumbs.length > MAX_BREADCRUMBS) {
        breadcrumbs.shift();
      }
    },

    _hookClicks: function () {
      var _this = this;
      document.addEventListener("click", function (e) {
        var target = e.target.closest("button, a, input, [data-track]");
        if (target) {
          var name = target.id || target.className || target.tagName.toLowerCase();
          _this._addBreadcrumb("ui.click", "Clicked " + name, {
            tag: target.tagName,
            id: target.id,
            text: (target.innerText || "").slice(0, 30)
          });
        }
      }, true);
    },

    _hookNavigation: function () {
      var _this = this;
      var origPushState = history.pushState;
      history.pushState = function () {
        origPushState.apply(this, arguments);
        _this._addBreadcrumb("navigation", "Navigated to " + window.location.pathname);
      };
      window.addEventListener("popstate", function () {
        _this._addBreadcrumb("navigation", "Popped state to " + window.location.pathname);
      });
    },

    _hookFetch: function () {
      var _this = this;
      var origFetch = window.fetch;
      window.fetch = async function () {
        var url = arguments[0];
        var start = performance.now();
        try {
          var res = await origFetch.apply(this, arguments);
          var duration = Math.round(performance.now() - start);
          if (!res.ok) {
            _this._addBreadcrumb("http.error", "HTTP " + res.status + " on " + url, { status: res.status, duration: duration });
          }
          return res;
        } catch (err) {
          var duration = Math.round(performance.now() - start);
          _this._addBreadcrumb("http.fail", "Failed fetch to " + url, { error: err.message, duration: duration });
          throw err;
        }
      };
    },

    getBreadcrumbs: function () {
      return breadcrumbs;
    },

    clearBreadcrumbs: function () {
      breadcrumbs.length = 0;
    }
  };

  var origCapture = window.Para.capture;
  window.Para.capture = function (err, metadata) {
    metadata = metadata || {};
    metadata.breadcrumbs = ParaAddon.getBreadcrumbs();
    return origCapture.call(window.Para, err, metadata);
  };

  ParaAddon.init();
  window.ParaAddon = ParaAddon;
})();
