(function () {
  try {
    var params = new URLSearchParams(window.location.search);
    var shouldRecover = params.has('recover') || params.has('reset');
    if (!shouldRecover) return;

    var attemptedKey = '__boot_recover_attempted__';
    var attempted = false;
    try {
      attempted = window.localStorage && localStorage.getItem(attemptedKey) === '1';
      if (!attempted) localStorage.setItem(attemptedKey, '1');
    } catch (e) {
      // si localStorage falla, igual seguimos (best effort)
      attempted = false;
    }

    // Si ya se intentó, solo limpiar query params y salir
    if (attempted) {
      var cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('recover');
      cleanUrl.searchParams.delete('reset');
      window.location.replace(cleanUrl.toString());
      return;
    }

    var tasks = [];

    // unregister SW
    try {
      if ('serviceWorker' in navigator) {
        tasks.push(
          navigator.serviceWorker.getRegistrations().then(function (regs) {
            return Promise.all(regs.map(function (r) { return r.unregister(); }));
          }).catch(function () {})
        );
      }
    } catch (e) {}

    // clear caches
    try {
      if ('caches' in window) {
        tasks.push(
          caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (k) { return caches.delete(k); }));
          }).catch(function () {})
        );
      }
    } catch (e) {}

    Promise.all(tasks).finally(function () {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('original_token');
        localStorage.removeItem('activeFacilityId');
        localStorage.removeItem('lastActivityAt');
      } catch (e) {}
      try { sessionStorage.clear(); } catch (e) {}

      var url = new URL(window.location.href);
      url.searchParams.delete('recover');
      url.searchParams.delete('reset');
      window.location.replace(url.toString());
    });
  } catch (e) {
    // si boot.js rompe, NO hacer loop
    console.warn('[boot] recover failed', e);
  }
})();
