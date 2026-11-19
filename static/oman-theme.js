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

  /* When the visible screen changes, bring the top of the page into view. */
  ['quiz', 'done', 'cert'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    let wasHidden = el.classList.contains('hidden');
    new MutationObserver(() => {
      const hidden = el.classList.contains('hidden');
      if (wasHidden && !hidden) {
        window.scrollTo({ top: 0 });
        /* Results reached: preload the certificate artwork so printing never misses it. */
        if (id !== 'quiz') document.querySelectorAll('.om-c').forEach(img => { img.loading = 'eager'; });
      }
      wasHidden = hidden;
    }).observe(el, { attributes: true, attributeFilter: ['class'] });
  });
})();
