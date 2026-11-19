/* Oman Majd: decorative-only enhancement. No API, audio, form or timer changes. */
(() => {
  const welcome = document.getElementById('welcome');
  if (!welcome) return;
  welcome.querySelectorAll('.om-hero-art').forEach(el => el.remove());
  const stats = welcome.querySelector('.stats');
  if (!stats) return;
  let axes = document.getElementById('omanAxes');
  if (!axes) {
    axes = document.createElement('div');
    axes.id = 'omanAxes';
    axes.className = 'om-axes';
    axes.setAttribute('aria-label', 'محاور المعرفة الخمسة');
    const categories = [
      ['🏰', 'التاريخ الوطني'],
      ['🗺️', 'الجغرافيا والمحافظات'],
      ['🏺', 'التراث والثقافة'],
      ['🌱', 'النهضة والإنجازات'],
      ['📚', 'الشخصيات والمعالم']
    ];
    categories.forEach(([symbol, name]) => {
      const card = document.createElement('div');
      card.className = 'om-axis';
      const icon = document.createElement('span');
      icon.className = 'om-icon';
      icon.textContent = symbol;
      icon.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span');
      text.textContent = name;
      card.append(icon, text);
      axes.append(card);
    });
    stats.insertAdjacentElement('beforebegin', axes);
  }
  if (!welcome.querySelector('.om-axis-title')) {
    const heading = document.createElement('div');
    heading.className = 'om-axis-title';
    heading.textContent = 'اكتشف عُمان عبر خمسة محاور معرفية';
    axes.insertAdjacentElement('beforebegin', heading);
  }
  const formHeading = welcome.querySelector('.form-heading span:first-child');
  if (formHeading) formHeading.textContent = 'ابدأ رحلتك المعرفية';
  // Only decorate existing DOM; music toggle remains owned by welcome-music.js.
})();
