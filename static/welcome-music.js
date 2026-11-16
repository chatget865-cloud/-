// Welcome-only music. Playback starts only after a visitor clicks the music button.
(() => {
  const welcome = document.getElementById('welcome');
  const form = document.getElementById('startForm');
  const soundToggle = document.getElementById('soundToggle');
  if (!welcome || !form) return;
  const audio = new Audio('/static/welcome-music.mp3');
  audio.loop = true;
  audio.preload = 'none';
  audio.volume = 0.35;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary no-print';
  button.id = 'welcomeMusicToggle';
  button.textContent = '♫ تشغيل موسيقى الترحيب';
  button.setAttribute('aria-pressed','false');
  const heading = welcome.querySelector('h1');
  if (heading) heading.insertAdjacentElement('afterend', button);
  else welcome.insertBefore(button, welcome.firstChild);
  function stop(){audio.pause();audio.currentTime=0;button.textContent='♫ تشغيل موسيقى الترحيب';button.setAttribute('aria-pressed','false');}
  button.addEventListener('click', async () => {
    if (!audio.paused) {stop();return;}
    if (localStorage.getItem('omanMajdSound') === 'off') {
      button.textContent='🔇 فعّل الصوت أولًا من زر المؤثرات الصوتية';return;
    }
    try {await audio.play();button.textContent='❚❚ إيقاف موسيقى الترحيب';button.setAttribute('aria-pressed','true');}
    catch (_) {button.textContent='تعذر تشغيل الموسيقى — اضغط للمحاولة مجددًا';}
  });
  // Do not let music continue into the question screen, including resumed sessions.
  const quiz = document.getElementById('quiz');
  if(quiz) new MutationObserver(() => {if(!quiz.classList.contains('hidden'))stop();}).observe(quiz,{attributes:true,attributeFilter:['class']});
  form.addEventListener('submit', stop);
  if(soundToggle) soundToggle.addEventListener('click', () => {
    if(localStorage.getItem('omanMajdSound') === 'off') stop();
  });
  window.addEventListener('pagehide',()=>audio.pause());
})();
