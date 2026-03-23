// ════════════════════════════════════════════════
//  CONFIGURACIÓN
// ════════════════════════════════════════════════
const CONFIG = {
  numQuestions: 20,      // preguntas por test
  shuffleOptions: true,  // barajar opciones
  maxErrors: 4,          // fallos máximos antes de reprobar
};

const JSON_FILES = ['tema-1.json', 'tema-2.json', 'tema-3.json', 'tema-7.json'];

// ════════════════════════════════════════════════

let current = 0;
let score   = 0;
let errors  = 0;
let answered = false;
let activeQuestions = [];
let userAnswers = [];
let testTema = '';

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - .5);
}

function extractQuestions(data) {
  const questions = [];
  for (const temaKey of Object.keys(data)) {
    const temaData = data[temaKey];
    for (const subtopic of Object.keys(temaData)) {
      for (const q of temaData[subtopic]) {
        if (q.answer !== null && q.answer !== undefined) {
          questions.push(q);
        }
      }
    }
  }
  return questions;
}

async function loadQuestions(files) {
  let all = [];
  for (const file of files) {
    try {
      const res = await fetch(file);
      if (!res.ok) throw new Error(`No se pudo cargar ${file}`);
      const data = await res.json();
      all = all.concat(extractQuestions(data));
    } catch (e) {
      console.warn(e);
    }
  }
  return all;
}

async function startTest() {
  const select = document.getElementById('tema-select');
  const errEl  = document.getElementById('load-error');
  errEl.style.display = 'none';

  const files = select.value === 'all' ? JSON_FILES : [select.value];

  let pool;
  try {
    pool = await loadQuestions(files);
  } catch (e) {
    errEl.textContent = 'Error al cargar las preguntas. Asegúrate de servir el proyecto con un servidor local.';
    errEl.style.display = 'block';
    return;
  }

  if (pool.length === 0) {
    errEl.textContent = 'No hay preguntas disponibles con respuesta correcta definida en los JSON seleccionados.';
    errEl.style.display = 'block';
    return;
  }

  const n = Math.min(CONFIG.numQuestions, pool.length);
  let selected = shuffle(pool).slice(0, n);

  if (CONFIG.shuffleOptions) {
    selected = selected.map(q => {
      const correctText = q.options[q.answer];
      const opts = shuffle(q.options);
      return { q: q.q, options: opts, answer: opts.indexOf(correctText) };
    });
  }

  activeQuestions = selected;
  testTema = select.options[select.selectedIndex].text;
  current = 0; score = 0; errors = 0; userAnswers = [];
  show('screen-quiz');
  renderQuestion();
}

function renderErrorCounter() {
  const el = document.getElementById('error-counter');
  el.innerHTML = '';
  for (let i = 0; i < CONFIG.maxErrors; i++) {
    const s = document.createElement('span');
    s.className = 'heart' + (i < errors ? ' lost' : '');
    s.textContent = '❤️';
    el.appendChild(s);
  }
}

function renderQuestion() {
  answered = false;
  const q = activeQuestions[current];

  document.getElementById('progress-bar').style.width =
    ((current / activeQuestions.length) * 100) + '%';
  document.getElementById('question-counter').textContent =
    `Pregunta ${current + 1} de ${activeQuestions.length}`;
  renderErrorCounter();
  document.getElementById('question-text').textContent = q.q;

  const container = document.getElementById('options');
  container.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.onclick = () => selectAnswer(i);
    container.appendChild(btn);
  });

  document.getElementById('feedback').textContent = '';
  document.getElementById('feedback').className = '';
  document.getElementById('btn-next').style.display = 'none';
}

function selectAnswer(index) {
  if (answered) return;
  answered = true;

  const q    = activeQuestions[current];
  const btns = document.querySelectorAll('.option-btn');
  btns.forEach(b => b.disabled = true);

  const isCorrect = index === q.answer;
  btns[index].classList.add(isCorrect ? 'correct' : 'incorrect');
  if (!isCorrect) btns[q.answer].classList.add('correct');

  const fb = document.getElementById('feedback');
  if (isCorrect) {
    fb.textContent = '✓ ¡Correcto!';
    fb.className = 'ok';
    score++;
  } else {
    errors++;
    renderErrorCounter();
    const remaining = CONFIG.maxErrors - errors;
    if (remaining > 0) {
      fb.textContent = `✗ Incorrecto. Correcta: "${q.options[q.answer]}" — Te quedan ${remaining} fallo${remaining === 1 ? '' : 's'}.`;
    } else {
      fb.textContent = `✗ Incorrecto. Correcta: "${q.options[q.answer]}" — Ya estás suspendido, pero puedes terminar el test.`;
    }
    fb.className = 'err';
  }

  userAnswers.push({ q: q.q, chosen: q.options[index], correct: q.options[q.answer], ok: isCorrect });

  const nextBtn = document.getElementById('btn-next');
  nextBtn.textContent = current + 1 < activeQuestions.length ? 'Siguiente →' : 'Ver resultado';
  nextBtn.style.display = 'block';
}

function nextQuestion() {
  current++;
  if (current < activeQuestions.length) {
    renderQuestion();
  } else {
    showResult();
  }
}

// ── HISTORIAL ─────────────────────────────────
function saveHistory(entry) {
  const hist = JSON.parse(localStorage.getItem('test-history') || '[]');
  hist.unshift(entry);
  if (hist.length > 30) hist.length = 30;
  localStorage.setItem('test-history', JSON.stringify(hist));
}

function renderHistory() {
  const hist = JSON.parse(localStorage.getItem('test-history') || '[]');
  const section = document.getElementById('history-section');
  const list    = document.getElementById('history-list');
  if (hist.length === 0) { section.classList.add('hidden'); return; }
  section.classList.remove('hidden');
  list.innerHTML = '';
  hist.forEach(h => {
    const div = document.createElement('div');
    div.className = 'hist-item ' + (h.passed ? 'pass' : 'fail');
    div.innerHTML =
      `<span>${h.date} · ${h.tema}</span>` +
      `<span class="hist-badge" style="color:${h.passed ? '#38a169' : '#e53e3e'}">${h.passed ? '✓' : '✗'} ${h.score}/${h.total} (${h.pct}%)</span>`;
    list.appendChild(div);
  });
}

function clearHistory() {
  localStorage.removeItem('test-history');
  renderHistory();
}

window.addEventListener('DOMContentLoaded', renderHistory);
// ──────────────────────────────────────────────

function showResult() {
  document.getElementById('progress-bar').style.width = '100%';
  const failed = errors >= CONFIG.maxErrors;
  const answeredCount = userAnswers.length;
  const pct = Math.round((score / answeredCount) * 100);

  document.getElementById('score-number').textContent = `${score}/${answeredCount}`;
  document.getElementById('score-label').textContent  = `${pct}%`;

  const badge = document.getElementById('result-badge');
  if (failed) {
    badge.textContent = '❌ TEST FALLIDO';
    badge.style.color = '#e53e3e';
  } else {
    badge.textContent = '✅ TEST SUPERADO';
    badge.style.color = '#38a169';
  }

  let msg = '';
  if (failed) msg = `Cometiste ${errors} fallos (límite ${CONFIG.maxErrors}). ¡Repasa y vuelve a intentarlo!`;
  else if (pct === 100) msg = '¡Perfecto! Todo correcto 🎉';
  else if (pct >= 80) msg = '¡Muy bien! Casi perfecto.';
  else if (pct >= 60) msg = 'Bien, pero puedes mejorar.';
  else if (pct >= 40) msg = 'Regular. Repasa el tema.';
  else msg = 'Necesitas estudiar más. ¡Ánimo!';
  document.getElementById('result-msg').textContent = msg;

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-ES') + ' ' +
    now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  saveHistory({ date: dateStr, tema: testTema, score, total: answeredCount, pct, passed: !failed });

  const reviewEl = document.getElementById('review');
  reviewEl.innerHTML = '<h3>Revisión de respuestas</h3>';
  userAnswers.forEach((a, i) => {
    const div = document.createElement('div');
    div.className = 'review-item';
    div.innerHTML = `<span class="ri-q">${i + 1}. ${a.q}</span><br>` +
      (a.ok
        ? `<span class="ri-correct">✓ ${a.chosen}</span>`
        : `<span class="ri-incorrect">✗ Tu respuesta: ${a.chosen}</span>` +
          `<br><span class="ri-correct">✓ Correcta: ${a.correct}</span>`);
    reviewEl.appendChild(div);
  });

  show('screen-result');
}

function restartTest() {
  renderHistory();
  show('screen-start');
}

function show(id) {
  ['screen-start', 'screen-quiz', 'screen-result', 'screen-theory'].forEach(s => {
    document.getElementById(s).classList.toggle('hidden', s !== id);
  });
}

// ── TEORÍA ────────────────────────────────────
async function openTheory() {
  show('screen-theory');
  await renderTheory();
}

async function renderTheory() {
  const select    = document.getElementById('theory-select');
  const container = document.getElementById('theory-content');
  container.innerHTML = '<p style="color:#718096;text-align:center;">Cargando...</p>';

  const files = select.value === 'all' ? JSON_FILES : [select.value];
  let html = '';

  for (const file of files) {
    try {
      const res = await fetch(file);
      if (!res.ok) continue;
      const data = await res.json();

      for (const temaKey of Object.keys(data)) {
        const temaData = data[temaKey];
        const temaLabel = temaKey.replace(/-/g, ' ');
        html += `<div class="theory-tema"><h2 class="theory-tema-title">${temaLabel}</h2>`;

        let qNum = 1;
        for (const subtopic of Object.keys(temaData)) {
          html += `<div class="theory-subtopic"><h3 class="theory-subtopic-title">${subtopic}</h3>`;

          for (const q of temaData[subtopic]) {
            html += `<div class="theory-question"><p class="theory-q-text">${qNum++}. ${q.q}</p><ul class="theory-options">`;
            q.options.forEach((opt, i) => {
              const correct = q.answer !== null && q.answer !== undefined && i === q.answer;
              html += `<li class="theory-option${correct ? ' theory-correct' : ''}">${opt}</li>`;
            });
            html += `</ul></div>`;
          }
          html += `</div>`;
        }
        html += `</div>`;
      }
    } catch (e) {
      console.warn(e);
    }
  }

  container.innerHTML = html || '<p style="color:#718096;text-align:center;">No hay contenido disponible.</p>';
}
