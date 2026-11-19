/* Decorative UI only: no API, timer, audio, form, certificate or result changes. */
(() => {
  const welcome = document.getElementById('welcome');
  if (!welcome || document.getElementById('omanAxes')) return;
  const heading = welcome.querySelector('h1');
  const stats = welcome.querySelector('.stats');
  if (!heading || !stats) return;
  const art = document.createElement('div');
  art.className = 'om-hero-art';
  art.setAttribute('aria-hidden','true');
  heading.insertAdjacentElement('afterend',art);
  const categories = [
    ['🏰','التاريخ الوطني'],
    ['🗺️','الجغرافيا والمحافظات'],
    ['🏺','التراث والثقافة'],
    ['🌱','النهضة والإنجازات'],
    ['📚','الشخصيات والمعالم']
  ];
  const group = document.createElement('div');
  group.id='omanAxes';group.className='om-axes';
  group.setAttribute('aria-label','محاور المسابقة الخمسة');
  categories.forEach(([symbol,label]) => {
    const item=document.createElement('div');item.className='om-axis';
    const icon=document.createElement('span');icon.className='om-icon';icon.textContent=symbol;
    const title=document.createElement('span');title.textContent=label;
    item.append(icon,title);group.append(item);
  });
  stats.insertAdjacentElement('beforebegin',group);
})();
