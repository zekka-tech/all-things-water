// Service-worker registration. Kept as an external file (not inline) so the
// Content-Security-Policy can drop script-src 'unsafe-inline'.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  });
}
