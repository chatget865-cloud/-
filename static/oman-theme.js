/* Oman Majd: presentation helper only. No API, audio, form, timer or scoring logic here. */
(() => {
  /* welcome-music.js creates its toggle (+ hint) next to the <h1>; move it once into its slot. */
  const slot = document.getElementById('omMusicSlot');
  if (slot) {
    ['welcomeMusicToggle', 'welcomeMusicHint'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.parentElement !== slot) slot.append(el);
    });
  }

  /* Status pill icon: locked when closed, open when available (text is set by app.js). */
  const state = document.getElementById('state');
  if (state) {
    const paint = () => state.classList.toggle('is-closed', /مغلقة/.test(state.textContent));
    paint();
    new MutationObserver(paint).observe(state, { childList: true, characterData: true, subtree: true });
  }

  /* Certificate score: app.js writes "النتيجة: X من 300" into #certScore (kept for screen
     readers); show the participant's real X in the approved score box. */
  const raw = document.getElementById('certScore');
  const shown = document.getElementById('omCertScore');
  if (raw && shown) {
    const sync = () => {
      const m = raw.textContent.match(/(\d+)\s*من\s*(\d+)/);
      shown.replaceChildren();
      if (!m) return;
      const small = document.createElement('small');
      small.textContent = 'من ' + m[2];
      shown.append(m[1], small);
    };
    sync();
    new MutationObserver(sync).observe(raw, { childList: true, characterData: true, subtree: true });
  }

  /* Certificate name: shrink long Arabic names until they fit the gold frame (never clipped).
     --fit scales the CSS font size, so the same ratio holds on screen and in print. */
  const certName = document.getElementById('certName');
  const fitName = () => {
    if (!certName) return;
    const box = certName.parentElement;
    certName.style.setProperty('--fit', '1');
    certName.style.whiteSpace = 'nowrap';
    if (!box.clientWidth) return;
    let fit = 1;
    while (certName.scrollWidth > box.clientWidth * 0.94 && fit > 0.5) {
      fit -= 0.04;
      certName.style.setProperty('--fit', fit.toFixed(2));
    }
    if (certName.scrollWidth > box.clientWidth * 0.94) certName.style.whiteSpace = 'normal';
  };
  if (certName) {
    new MutationObserver(fitName).observe(certName, { childList: true, characterData: true, subtree: true });
    window.addEventListener('resize', fitName);
    window.addEventListener('beforeprint', fitName);
  }
  let certBgLoaded = false;
  const preloadCertificate = () => {
    if (certBgLoaded) return;
    certBgLoaded = true;
    new Image().src = '/static/cert/certificate-background.jpg';
  };

  /* When the visible screen changes, bring the top of the page into view. */
  ['quiz', 'done', 'cert'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    let wasHidden = el.classList.contains('hidden');
    new MutationObserver(() => {
      const hidden = el.classList.contains('hidden');
      if (wasHidden && !hidden) {
        window.scrollTo({ top: 0 });
        /* Results reached: preload the certificate background so printing never misses it. */
        if (id !== 'quiz') preloadCertificate();
        if (id === 'cert') requestAnimationFrame(fitName);
      }
      wasHidden = hidden;
    }).observe(el, { attributes: true, attributeFilter: ['class'] });
  });
})();
