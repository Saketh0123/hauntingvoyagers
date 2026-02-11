// Centralized API base URL for admin panel.
// On Vercel (and most static hosts), using same-origin '/api' avoids preview/prod host mismatches.
(function(){
  var isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  var localBase = 'http://localhost:3000/api';
  var prodBase = '/api';

  // Expose API_BASE globally
  window.API_BASE = isLocal ? localBase : prodBase;
})();
