
const $ = id => document.getElementById(id);

const axes = {
  history: 'التاريخ الوطني',
  geography: 'الجغرافيا والمحافظات',
  heritage: 'التراث والثقافة',
  development: 'النهضة والإنجازات',
  landmarks: 'الشخصيات والمعالم'
};

let session = localStorage.getItem('omanMajdSession');
let question = null;
let selected = null;
let tick = null;
let result = null;
let busy = false;

const show = id => {
  ['welcome', 'quiz', 'done', 'cert'].forEach(x => {
    $(x).classList.toggle('hidden', x !== id);
  });
};

const msg = s => {
  $('message').textContent = s;
};

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Session': session || '',
      ...(options.headers || {})
    }
  });

  const data = await res.json();

  if (!res.ok) {
    throw Error(data.error || 'تعذر الاتصال بالخادم');
  }

  return data;
}

function clearFinishedSession() {
  localStorage.removeItem('omanMajdSession');
  session = null;
}

function render(q) {
  question = q;
  selected = null;

  show('quiz');

  $('counter').textContent =
    `السؤال ${q.number} من ${q.total}`;

  $('axis').textContent = axes[q.axis] || q.axis;

  $('bar').style.width =
    ((q.number - 1) / q.total * 100) + '%';

  $('question').textContent = q.text;

  $('next').disabled = true;
  $('options').replaceChildren();

  q.options.forEach((option, i) => {
    const button = document.createElement('button');

    button.className = 'option';
    button.textContent = 'أبجد'[i] + ' — ' + option;

    button.onclick = () => {
      selected = i;

      document.querySelectorAll('.option').forEach(el => {
        el.classList.remove('selected');
      });

      button.classList.add('selected');
      $('next').disabled = false;
    };

    $('options').appendChild(button);
  });

  clearInterval(tick);

  function countdown() {
    const remaining = Math.max(
      0,
      Math.ceil(q.deadline - Date.now() / 1000)
    );

    $('timer').textContent = remaining;

    $('timer').classList.toggle(
      'urgent',
      remaining <= 10
    );

    if (remaining === 0) {
      clearInterval(tick);
      submit(null);
    }
  }

  countdown();
  tick = setInterval(countdown, 250);
}

async function submit(value) {
  if (busy || !question) return;

  busy = true;
  clearInterval(tick);
  $('next').disabled = true;

  try {
    const data = await api('/api/answer', {
      method: 'POST',
      body: JSON.stringify({
        number: question.number,
        selected: value
      })
    });

    if (data.done) {
      finish(data.result);
    } else {
      render(data.question);
    }

  } catch (error) {
    msg(error.message);

    try {
      await resume();
    } catch {
      msg('تعذر استعادة السؤال. تحقق من الاتصال.');
    }

  } finally {
    busy = false;
  }
}

$('next').onclick = () => submit(selected);

$('startForm').onsubmit = async event => {
  event.preventDefault();
  msg('');

  const form = new FormData(event.target);

  try {
    const data = await api('/api/start', {
      method: 'POST',
      body: JSON.stringify(
        Object.fromEntries(form)
      )
    });

    session = data.session;

    localStorage.setItem(
      'omanMajdSession',
      session
    );

    result = null;
    render(data.question);

  } catch (error) {
    msg(error.message);
  }
};

function finish(data) {
  clearInterval(tick);

  question = null;
  result = data;

  $('score').textContent = data.score;

  $('correct').textContent =
    `إجابات صحيحة: ${data.correct} من 30`;

  show('done');

  // إزالة الجلسة المحلية بعد اكتمال المشاركة
  // دون حذف النتيجة من قاعدة البيانات
  clearFinishedSession();
}

async function resume() {
  if (!session) return;

  const data = await api('/api/me');

  if (data.done) {
    // لا نعرض نتيجة المشاركة القديمة عند فتح الموقع
    clearFinishedSession();
    result = null;
    show('welcome');
    return;
  }

  if (data.question) {
    render(data.question);
  }
}

// عرض شهادة المشاركة
$('certificate').onclick = () => {
  if (!result) return;

  $('certName').textContent = result.name;
  $('certOrg').textContent = result.org;

  $('certScore').textContent =
    `النتيجة: ${result.score} من 300`;

  show('cert');
};

// العودة إلى النتيجة
$('back').onclick = () => show('done');

// ترتيب الفائزين
$('rank').onclick = async () => {
  try {
    const data = await api('/api/leaderboard');

    const container = $('rankings');
    container.classList.remove('hidden');
    container.replaceChildren();

    const table = document.createElement('table');
    const header = document.createElement('tr');

    ['الترتيب', 'المشارك', 'الجهة', 'النقاط'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      header.appendChild(th);
    });

    table.appendChild(header);

    data.rows.forEach((row, index) => {
      const tr = document.createElement('tr');

      [
        index + 1,
        row.name,
        row.org,
        row.score
      ].forEach(value => {
        const td = document.createElement('td');
        td.textContent = value;
        tr.appendChild(td);
      });

      table.appendChild(tr);
    });

    container.appendChild(table);

  } catch (error) {
    msg(error.message);
  }
};

// حالة المسابقة
api('/api/status')
  .then(data => {
    $('state').textContent =
      data.status === 'open'
        ? 'المسابقة متاحة الآن'
        : 'المسابقة مغلقة حاليًا';
  })
  .catch(() => {});

// استعادة المشاركة غير المكتملة فقط
if (session) {
  resume().catch(() => {
    clearFinishedSession();
    show('welcome');
  });
} else {
  show('welcome');
}
