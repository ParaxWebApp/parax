// Para Dashboard SDK — Optional UI & Error Fetcher Widget
;(function () {
  "use strict";

  if (typeof window.Para === "undefined") {
    console.warn("[ParaDashboard] Para core not found. Load para.js first.");
    return;
  }

  var ParaDashboard = {
    // Fetch recent errors from Firestore for developer's monitoring app
    getRecentErrors: async function (limitCount) {
      if (!window.Para._db) {
        console.warn("[ParaDashboard] Firestore not initialized yet.");
        return [];
      }
      try {
        var snapshot = await window.Para._db.collection("errors")
          .orderBy("createdAt", "desc")
          .limit(limitCount || 20)
          .get();
        
        var errors = [];
        snapshot.forEach(function (doc) {
          errors.push(Object.assign({ id: doc.id }, doc.data()));
        });
        return errors;
      } catch (err) {
        console.error("[ParaDashboard] Failed to fetch errors:", err);
        return [];
      }
    },

    // Render a lightweight error monitoring widget into a container element
    renderWidget: async function (containerId) {
      var container = document.getElementById(containerId);
      if (!container) return;

      container.innerHTML = '<div style="padding:15px; background:#1e1e2e; color:#fff; border-radius:8px; font-family:sans-serif;">Loading Para Errors...</div>';

      var errors = await this.getRecentErrors(10);

      var html = '<div style="padding:15px; background:#1e1e2e; color:#fff; border-radius:8px; font-family:sans-serif; max-height:400px; overflow-y:auto;">';
      html += '<h3 style="margin-top:0; color:#22c55e;">🛡️ Para Error Monitor</h3>';
      
      if (errors.length === 0) {
        html += '<p style="color:#949ba4;">No errors logged yet. Great job!</p>';
      } else {
        html += '<ul style="list-style:none; padding:0; margin:0;">';
        for (var i = 0; i < errors.length; i++) {
          var e = errors[i];
          html += '<li style="padding:8px 0; border-bottom:1px solid #313244;">';
          html += '<span style="color:#ef4444; font-weight:bold;">[' + (e.type || 'error') + ']</span> ';
          html += '<span style="font-size:0.9em;">' + (e.message || '').slice(0, 80) + '</span>';
          html += '</li>';
        }
        html += '</ul>';
      }
      html += '</div>';

      container.innerHTML = html;
    }
  };

  window.ParaDashboard = ParaDashboard;
})();
