// Oman Majd welcome music: autoplay where permitted, otherwise invite a tap.
(() => {
  const welcome = document.getElementById('welcome');
  const form = document.getElementById('startForm');
  const quiz = document.getElementById('quiz');
  const soundToggle = document.getElementById('soundToggle');
  if (!welcome || !form) return;

  const audio = new Audio('/static/welcome-music.mp3');
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0.35;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary no-print';
  button.id = 'welcomeMusicToggle';
  const heading = welcome.querySelector('h1');
  if (heading) heading.insertAdjacentElement('afterend', button);
  else welcome.insertBefore(button, welcome.firstChild);

  const hint = document.createElement('p');
  hint.id = 'welcomeMusicHint';
  hint.className = 'hint no-print';
  hint.textContent = '🎵 اضغط لتشغيل موسيقى الترحيب';
  hint.hidden = true;
  button.insertAdjacentElement('afterend', hint);

  let userStopped = false;
  let pending = false;
  let playing = false;
  const inWelcome = () => !welcome.classList.contains('hidden') && (!quiz || quiz.classList.contains('hidden'));
  const muted = () => localStorage.getItem('omanMajdSound') === 'off';

  function refresh() {
    button.textContent = playing ? '❚❚ إيقاف موسيقى الترحيب' : '♫ تشغيل موسيقى الترحيب';
    button.setAttribute('aria-pressed', String(playing));
    hint.hidden = playing || userStopped || muted() || !inWelcome();
  }
  function stop(reset = true) {
    audio.pause();
    if (reset) audio.currentTime = 0;
    playing = false;
    pending = false;
    refresh();
  }
  function start() {
    if (pending || playing || userStopped || muted() || !inWelcome()) return;
    // Call play() synchronously in the user's gesture; do not await before it.
    pending = true;
    let promise;
    try { promise = audio.play(); }
    catch (_) { pending = false; refresh(); return; }
    Promise.resolve(promise).then(() => {
      pending = false;
      if (userStopped || muted() || !inWelcome()) { stop(); return; }
      playing = true;
      refresh();
    }).catch(() => { pending = false; playing = false; refresh(); });
  }

  button.addEventListener('click', () => {
    if (playing) { userStopped = true; stop(); }
    else { userStopped = false; start(); }
  });
  // The first permitted user interaction starts music unless they chose to stop it.
  function firstInteraction(event) {
    if (event.target === button || button.contains(event.target)) return;
    if (!userStopped && !playing && !pending) start();
  }
  document.addEventListener('pointerdown', firstInteraction, { passive: true });
  document.addEventListener('keydown', firstInteraction);
  form.addEventListener('submit', () => { userStopped = true; stop(); });
  if (quiz) new MutationObserver(() => {
    if (!quiz.classList.contains('hidden')) { userStopped = true; stop(); }
    else refresh();
  }).observe(quiz, { attributes: true, attributeFilter: ['class'] });
  if (soundToggle) soundToggle.addEventListener('click', () => {
    // Existing sound toggle owns the saved preference; check after its handler.
    queueMicrotask(() => { if (muted()) { userStopped = true; stop(); } else refresh(); });
  });
  window.addEventListener('pagehide', () => stop(false));
  refresh();
  start();
})();
