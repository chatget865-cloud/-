// Welcome music: attempt autoplay, then retry on first user interaction if blocked.
(() => {
  const welcome = document.getElementById('welcome');
  const form = document.getElementById('startForm');
  const soundToggle = document.getElementById('soundToggle');
  const quiz = document.getElementById('quiz');
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

  let userStopped = false;
  let playing = false;
  let pending = false;
  const inWelcome = () => !welcome.classList.contains('hidden') && (!quiz || quiz.classList.contains('hidden'));
  const muted = () => localStorage.getItem('omanMajdSound') === 'off';
  function updateButton() {
    button.textContent = playing ? '❚❚ إيقاف موسيقى الترحيب' : '♫ تشغيل موسيقى الترحيب';
    button.setAttribute('aria-pressed', String(playing));
  }
  function stop(reset = true) {
    audio.pause();
    if (reset) audio.currentTime = 0;
    playing = false;
    updateButton();
  }
  async function start() {
    if (pending || playing || userStopped || muted() || !inWelcome()) return;
    pending = true;
    try {
      await audio.play();
      if (userStopped || muted() || !inWelcome()) { stop(); return; }
      playing = true;
      updateButton();
    } catch (_) {
      // Autoplay is blocked on some browsers. First interaction can retry.
    } finally { pending = false; }
  }
  updateButton();
  button.addEventListener('click', async () => {
    if (playing || pending) { userStopped = true; stop(); return; }
    userStopped = false;
    if (muted()) {
      button.textContent = '🔇 فعّل الصوت من زر المؤثرات الصوتية';
      return;
    }
    await start();
  });
  function firstInteraction(event) {
    if (event.target === button || button.contains(event.target)) return;
    if (!userStopped) void start();
  }
  document.addEventListener('pointerdown', firstInteraction, {passive:true});
  document.addEventListener('keydown', firstInteraction);
  if (quiz) new MutationObserver(() => {
    if (!quiz.classList.contains('hidden')) { userStopped = true; stop(); }
  }).observe(quiz, {attributes:true, attributeFilter:['class']});
  form.addEventListener('submit', () => {userStopped = true; stop();});
  if (soundToggle) soundToggle.addEventListener('click', () => {
    if (muted()) {userStopped = true; stop();}
  });
  window.addEventListener('pagehide', () => stop(false));
  // Browser may allow autoplay immediately; otherwise wait for interaction.
  void start();
})();
