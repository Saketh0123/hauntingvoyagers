// Centralized API base URL for admin panel
// Replace <MAIN_PROJECT_HOST> with your actual main project hostname after first deploy
// Example: https://hauntingvoyagers-main.vercel.app
(function(){
  var DEFAULT_HOST = 'hauntingvoyagers-ptcr.vercel.app'; // main project host
  var isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  var localBase = 'http://localhost:3000/api';
  var prodBase = DEFAULT_HOST ? ('https://' + DEFAULT_HOST + '/api') : '/api';

  // Expose API_BASE globally
  window.API_BASE = isLocal ? localBase : prodBase;
})();
