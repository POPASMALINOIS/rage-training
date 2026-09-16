/* v2.4.58: the splash is presentation only. Data initialization belongs to persistencia. */
(() => {
  if (window.RageSplashV258) return;
  window.RageSplashV258 = true;
  let started = false;
  function hide() {
    const splash = document.getElementById('rage-splash');
    if (!splash) return;
    splash.classList.add('is-hidden');
    setTimeout(() => splash.remove(), 450);
  }
  function loadTariffs() {
    if (window.RageTarifasV255 || document.querySelector('script[data-rage-tarifas-v255]')) return;
    const script = document.createElement('script');
    script.src = 'tarifas-v2.4.55.js?v=2.4.57';
    script.dataset.rageTarifasV255 = '1';
    script.async = true;
    script.onerror = () => console.error('[Rage] No se han podido cargar las tarifas.');
    document.body.appendChild(script);
  }
  function start() {
    if (started || !window.RageDatosCargados) return;
    started = true;
    const loader = document.querySelector('.rage-splash-loader');
    if (loader) loader.innerHTML = `
      <svg class="rage-dumbbell-svg" viewBox="0 0 120 48" role="img" aria-label="Cargando">
        <defs><clipPath id="rageDumbbellClip">
          <rect x="4" y="15" width="10" height="18" rx="2"/><rect x="14" y="10" width="12" height="28" rx="2"/><rect x="26" y="19" width="68" height="10" rx="3"/><rect x="94" y="10" width="12" height="28" rx="2"/><rect x="106" y="15" width="10" height="18" rx="2"/>
        </clipPath></defs>
        <g class="rage-dumbbell-base"><rect x="4" y="15" width="10" height="18" rx="2"/><rect x="14" y="10" width="12" height="28" rx="2"/><rect x="26" y="19" width="68" height="10" rx="3"/><rect x="94" y="10" width="12" height="28" rx="2"/><rect x="106" y="15" width="10" height="18" rx="2"/></g>
        <rect class="rage-dumbbell-fill" x="0" y="0" width="120" height="48" fill="#F15A24" clip-path="url(#rageDumbbellClip)"/>
        <g class="rage-dumbbell-outline"><rect x="4" y="15" width="10" height="18" rx="2"/><rect x="14" y="10" width="12" height="28" rx="2"/><rect x="26" y="19" width="68" height="10" rx="3"/><rect x="94" y="10" width="12" height="28" rx="2"/><rect x="106" y="15" width="10" height="18" rx="2"/></g>
      </svg>`;
    setTimeout(() => { hide(); setTimeout(loadTariffs, 650); }, 5000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
  window.addEventListener('rage:data-ready', start, {once:true});
  // This timer only hides an overlay. It never opens Resumen or saves anything.
  setTimeout(hide, 7000);
})();
