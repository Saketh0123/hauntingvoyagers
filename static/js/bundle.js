// Minimal stub bundle to avoid 404 when testing static HTML locally.
// This file intentionally does nothing heavy — it's a safe placeholder for local previews.
(function(){
  // Mark that the stub loaded so debugging can detect it
  window.__BUNDLE_STUB_LOADED = true;
  // Remove any simple loader overlay if present
  try {
    var loader = document.querySelector('[data-loader]');
    if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
  } catch (e) {
    // ignore
  }
})();
