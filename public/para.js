// Para — Error and Performance Monitoring SDK for Web Apps
;(function () {
  "use strict";

  const Para = {
    _db: null,
    _userId: null,
    _ready: false,
    _queue: [],
    _initialized: false,
    _seen: {},

    // Dev mode: localStorage para_dev=1 (or window.ParaDevUrl) routes logs to
    // the local para-dev terminal instead of prod, with zero console output.
    _devMode: function () {
      if (typeof window !== "undefined" && window.ParaDevUrl) return true;
      try {
        return typeof localStorage !== "undefined" && localStorage.getItem("para_dev") === "1";
      } catch (_) {
        return false;
      }
    },

    _devUrl: function () {
      if (typeof window !== "undefined" && window.ParaDevUrl) {
        return String(window.ParaDevUrl).replace(/\/$/, "");
      }
      return "http://127.0.0.1:3776";
    },

    _mute: function () {
      return this._devMode();
    },

    init: function () {
      if (this._initialized) return;
      this._initialized = true;

      if (typeof firebase === "undefined" || !firebase.firestore) {
        if (!this._mute()) console.warn("[Para] Firebase not ready, will retry in 1s");
        setTimeout(function () { Para.init(); }, 1000);
        return;
      }

      try {
        this._db = firebase.firestore();
        this._ready = true;
      } catch (e) {
        if (!this._mute()) console.warn("[Para] Could not get Firestore, will retry in 1s:", e);
        setTimeout(function () { Para.init(); }, 1000);
        return;
      }

      this._flushQueue();

      var _this = this;
      if (firebase.auth) {
        firebase.auth().onAuthStateChanged(function (user) {
          _this._userId = user ? user.uid : null;
        });
      }

      this._hookGlobalErrors();
    },

    _hookGlobalErrors: function () {
      var _this = this;

      var origOnError = window.onerror;
      window.onerror = function (message, source, lineno, colno, error) {
        _this.capture(error || message, {
          type: "unhandled",
          source: source,
          line: lineno,
          col: colno,
        });
        if (typeof origOnError === "function") {
          return origOnError.apply(window, arguments);
        }
        return false;
      };

      window.addEventListener("unhandledrejection", function (e) {
        var err = e.reason;
        _this.capture(err || "Unhandled Promise rejection", {
          type: "promise",
        });
      });

      var origConsoleError = console.error;
      console.error = function () {
        var args = Array.prototype.slice.call(arguments);
        var first = args[0];
        if (typeof first === "string" && first.indexOf("[Para]") !== 0) {
          _this.capture(
            first instanceof Error ? first : args.join(" "),
            { type: "console" }
          );
        }
        return origConsoleError.apply(console, args);
      };
    },

    capture: function (err, metadata) {
      var data = this._buildErrorData(err, metadata || {});
      // Dedupe: same fingerprint within 60s is one error, not a storm.
      var now = Date.now();
      if (this._seen[data.fingerprint] && now - this._seen[data.fingerprint] < 60000) return;
      this._seen[data.fingerprint] = now;
      if (Object.keys(this._seen).length > 200) this._seen = {};
      if (!this._ready) {
        if (this._queue.length < 50) this._queue.push(data);
        return;
      }
      this._write(data);
    },

    _buildErrorData: function (err, metadata) {
      var message = "";
      var stack = "";

      if (err instanceof Error) {
        message = err.message || String(err);
        stack = err.stack || "";
      } else if (typeof err === "object" && err !== null) {
        message = err.message || err.code || JSON.stringify(err);
        stack = err.stack || "";
      } else {
        message = String(err);
      }

      var fingerprint = this._hash(message + stack);

      return {
        message: message.slice(0, 2000),
        stack: stack.slice(0, 5000),
        type: metadata.type || "manual",
        url: window.location.href,
        userId: this._userId || null,
        userAgent: navigator.userAgent,
        fingerprint: fingerprint,
        metadata: metadata || {},
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
    },

    _write: function (data) {
      // Dev mode: quiet, straight to the local terminal. Nothing to prod, nothing in console.
      if (this._devMode()) {
        try {
          var devPayload = { message: data.message, stack: data.stack, type: data.type, url: data.url, fingerprint: data.fingerprint, at: new Date().toISOString() };
          fetch(this._devUrl() + "/api/para-dev/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(devPayload),
          }).catch(function () {});
        } catch (_) {}
        return;
      }
      // Logged-out clients must NOT write Firestore directly: the rules deny it,
      // the rejection re-enters capture, and that is the infinite loop. /api/log
      // (server-side write) still carries logged-out errors to the team.
      if (this._userId && this._db) {
        try {
          this._db.collection("errors").add(data).catch(function () {});
        } catch (_) {}
      }
      try {
        var payload = { message: data.message, stack: data.stack, type: data.type, url: data.url };
        fetch("/api/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(function () {});
      } catch (_) {}
    },

    _flushQueue: function () {
      if (!this._ready) return;
      var q = this._queue;
      this._queue = [];
      for (var i = 0; i < q.length; i++) {
        this._write(q[i]);
      }
    },

    _hash: function (str) {
      var hash = 0;
      for (var i = 0; i < str.length; i++) {
        var chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
      }
      return Math.abs(hash).toString(16);
    },
  };

  window.Para = Para;
})();
