// ====== Configuración de envío (opcional) ======
const ENDPOINT_URL = ""; // p.ej. "https://mi-backend.test/quiz"

// ====== Estado ======
const state = {
  questions: [],
  index: 0,
  answers: [],
  startedAt: null,
  loadedBlock: null, // "html" | "css" | "js"
};

// ====== Elementos ======
const qNumEl = document.getElementById("qNum");
const qTextEl = document.getElementById("qText");
const qCode = document.getElementById("qCode");
const qCodeInner = document.getElementById("qCodeInner");
const qTopicEl = document.getElementById("qTopic");
const qDiffEl = document.getElementById("qDiff");
const optionsEl = document.getElementById("options");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const finishBtn = document.getElementById("finishBtn");
const progressText = document.getElementById("progressText");
const bar = document.getElementById("bar");
const answeredCountEl = document.getElementById("answeredCount");
const resultsEl = document.getElementById("results");
const levelTitleEl = document.getElementById("levelTitle");
const scoreTextEl = document.getElementById("scoreText");
const percentTextEl = document.getElementById("percentText");
const timeTextEl = document.getElementById("timeText");
const byTopicEl = document.getElementById("byTopic");
const solutionsBodyEl = document.getElementById("solutionsBody");
const blockSelect = document.getElementById("blockSelect");
const loadBtn = document.getElementById("loadBtn");

// ====== Eventos de UI ======
loadBtn.addEventListener("click", async () => {
  const block = blockSelect.value; // "html" | "css" | "js"
  const url = block === "html" ? "questions-html.json"
            : block === "css" ? "questions-css.json"
            : "questions-js.json";

  try{
    // Try fetch first, fallback to XMLHttpRequest for local files
    let data;
    try {
      const res = await fetch(`${url}?_t=${Date.now()}`);
      if(!res.ok) throw new Error(`error cargando ${url}`);
      data = await res.json();
    } catch (fetchError) {
      // Fallback for local files
      data = await loadJSONFile(url);
    }

    // Inicializa estado
    state.questions = data;
    state.index = 0;
    state.answers = Array(state.questions.length).fill(null);
    state.startedAt = Date.now();
    state.loadedBlock = block;

    // Habilitar navegación
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    finishBtn.disabled = true;

    resultsEl.style.display = "none";
    updateAnsweredCount();
    renderQuestion();
  }catch(e){
    alert("no se pudo cargar el bloque. revisa que el json esté en la misma carpeta.\n" + (e?.message ?? e));
  }
});

prevBtn.addEventListener("click", () => {
  if(state.index > 0){
    state.index--;
    renderQuestion();
  }
});
nextBtn.addEventListener("click", () => {
  if(state.index < state.questions.length - 1){
    state.index++;
    renderQuestion();
  }
});
finishBtn.addEventListener("click", finalize);

// Accesos con teclado
window.addEventListener("keydown", (e) => {
  if(!state.questions.length) return;
  const hasSelection = state.answers[state.index] != null;
  if(e.key === "ArrowRight"){ e.preventDefault(); nextBtn.click(); }
  if(e.key === "ArrowLeft"){ e.preventDefault(); prevBtn.click(); }
  if(e.key === "Enter" && hasSelection && nextBtn.disabled === false && !nextBtn.classList.contains("hidden")){
    e.preventDefault(); nextBtn.click();
  }
});

// ====== Render ======
function renderQuestion(){
  const i = state.index;
  const q = state.questions[i];

  qNumEl.textContent = i + 1;
  qTextEl.textContent = q.question;
  qTopicEl.textContent = q.topic;
  qDiffEl.textContent = q.difficulty;
  progressText.textContent = state.questions.length ? `Pregunta ${i+1}/${state.questions.length}` : "—";

  const percent = Math.round(((i) / state.questions.length) * 100);
  bar.style.width = `${percent}%`;

  if(q.code){
    qCode.classList.remove("hidden");
    qCodeInner.textContent = q.code;
  }else{
    qCode.classList.add("hidden");
    qCodeInner.textContent = "";
  }

  optionsEl.innerHTML = "";
  q.options.forEach((opt, idx) => {
    const id = `q${q.id}_opt${idx}`;
    const label = document.createElement("label");
    label.className = "opt";
    label.setAttribute("for", id);

    const input = document.createElement("input");
    input.type = "radio";
    input.name = `q_${q.id}`;
    input.id = id;
    input.value = String(idx);
    input.checked = state.answers[i] === idx;
    input.addEventListener("change", () => {
      state.answers[i] = idx;
      updateAnsweredCount();
      nextBtn.disabled = false;
      finishBtn.disabled = state.index !== state.questions.length - 1;
    });

    const span = document.createElement("span");
    span.textContent = opt;

    label.appendChild(input);
    label.appendChild(span);
    optionsEl.appendChild(label);
  });

  prevBtn.disabled = i === 0;
  nextBtn.disabled = state.answers[i] == null || i === state.questions.length - 1;
  finishBtn.disabled = i !== state.questions.length - 1 || state.answers[i] == null;

  nextBtn.classList.toggle("hidden", i === state.questions.length - 1);
  finishBtn.classList.toggle("hidden", i !== state.questions.length - 1);
}

function updateAnsweredCount(){
  const count = state.answers.filter(v => v != null).length;
  answeredCountEl.textContent = `${count}/${state.questions.length} respondidas`;
}

// ====== Finalizar ======
function finalize(){
  const end = Date.now();
  const ms = end - state.startedAt;

  const details = state.questions.map((q, i) => {
    const user = state.answers[i];
    const correct = q.answer;
    const isCorrect = Number(user) === Number(correct);
    return {
      id: q.id, topic: q.topic, difficulty: q.difficulty,
      user, correct, isCorrect, question: q.question, options: q.options,
      explanation: q.explanation, code: q.code || null
    };
  });

  const score = details.reduce((acc, d) => acc + (d.isCorrect ? 1 : 0), 0);
  const percent = Math.round((score / state.questions.length) * 100);

  let level = "Básico";
  if(percent >= 75) level = "Avanzado";
  else if(percent >= 45) level = "Intermedio";

  const topics = [...new Set(state.questions.map(q => q.topic))];
  const byTopic = topics.map(t => {
    const ds = details.filter(d => d.topic === t);
    const ok = ds.filter(d => d.isCorrect).length;
    return { topic: t, ok, total: ds.length };
  });

  resultsEl.style.display = "block";
  levelTitleEl.textContent = `Tu nivel: ${level}`;
  scoreTextEl.innerHTML = `${score}<span class="muted">/${state.questions.length}</span>`;
  percentTextEl.textContent = `${percent}% de aciertos`;
  timeTextEl.textContent = formatDuration(ms);
  byTopicEl.innerHTML = byTopic.map(b => {
    const cls = b.ok / b.total >= 0.6 ? "ok" : "bad";
    return `<div class="${cls}">${escapeHtml(b.topic)}: ${b.ok}/${b.total}</div>`;
  }).join("");

  solutionsBodyEl.innerHTML = details.map((d, i) => {
    const u = d.user == null ? "—" : d.options[d.user];
    const c = d.options[d.correct];
    const good = d.isCorrect ? "ok" : "bad";
    const codeBlock = d.code ? `<pre class="code"><code>${escapeHtml(d.code)}</code></pre>` : "";
    return `
      <div class="sol">
        <h4>#${i+1} · ${escapeHtml(d.question)}</h4>
        ${codeBlock}
        <div><strong>Tu respuesta:</strong> <span class="${good}">${escapeHtml(u)}</span></div>
        <div><strong>Correcta:</strong> ${escapeHtml(c)}</div>
        <div class="ex">${escapeHtml(d.explanation)}</div>
      </div>
    `;
  }).join("");

  if(ENDPOINT_URL){
    try{
      fetch(ENDPOINT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finishedAt: new Date().toISOString(),
          durationMs: ms,
          block: state.loadedBlock,
          score, percent, level,
          answers: state.answers,
          details
        })
      }).catch(()=>{});
    }catch(_e){}
  }

  resultsEl.scrollIntoView({behavior: "smooth"});
}

// ====== Utils ======
function loadJSONFile(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200 || xhr.status === 0) { // 0 for local files
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            reject(new Error(`Error parsing JSON from ${url}: ${e.message}`));
          }
        } else {
          reject(new Error(`Error loading ${url}: ${xhr.status}`));
        }
      }
    };
    xhr.send();
  });
}

function formatDuration(ms){
  const sec = Math.floor(ms/1000);
  const m = Math.floor(sec/60);
  const s = sec % 60;
  return `${m}m ${s.toString().padStart(2,'0')}s`;
}
function escapeHtml(str){
  if(str == null) return "";
  return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}
