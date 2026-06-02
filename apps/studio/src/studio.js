/* ============================================================
   Executagent Studio — interactions
   ============================================================ */
import { configured } from './lib/supabaseClient.js';
import { ensureSession } from './lib/auth.js';
import * as api from './lib/api.js';
import { subscribeTaskEvents, pollTaskEvents } from './lib/realtime.js';

(function () {
  'use strict';
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Real backend when Supabase is configured; otherwise a clearly-labeled DEMO.
  const REAL = configured;
  if (REAL) ensureSession();

  /* ---------- seeded rng ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ============================================================
     Specimen generator — honest abstract placeholders that read
     as distinct "generated directions" (simple shapes only).
     ============================================================ */
  function specimen(template, seed, opts = {}) {
    const r = mulberry32(seed);
    const W = 200, H = 150;
    const ink = 'currentColor';
    const acc = 'var(--sacc, var(--accent))';
    const el = opts.elements ?? 1;      // density multiplier 0.6..1.4
    const pad = 22;
    let g = '';

    const rect = (x, y, w, h, fill, o = 1, extra = '') =>
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" opacity="${o}" ${extra}/>`;
    const line = (x1, y1, x2, y2, o = 1, sw = 2) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ink}" stroke-width="${sw}" opacity="${o}"/>`;
    const circ = (cx, cy, rad, fill, o = 1) =>
      `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${fill}" opacity="${o}"/>`;

    if (template === 'identidade') {
      // mark
      const cx = 64, cy = 56, s = 30;
      const variant = Math.floor(r() * 3);
      if (variant === 0) {
        g += circ(cx, cy, s, acc);
        g += rect(cx - s * 0.5, cy - s * 0.5, s, s, ink, 0.9);
      } else if (variant === 1) {
        g += rect(cx - s, cy - s, s * 2, s * 2, ink, 0.18);
        g += circ(cx, cy, s * 0.62, acc);
      } else {
        g += `<path d="M${cx - s} ${cy + s} L${cx} ${cy - s} L${cx + s} ${cy + s} Z" fill="${ink}" opacity="0.9"/>`;
        g += circ(cx + s * 0.4, cy - s * 0.2, s * 0.4, acc);
      }
      // wordmark bars
      for (let i = 0; i < 4; i++) g += rect(108, 40 + i * 11, 30 + r() * 36, 5, ink, 0.5 - i * 0.08);
      // palette
      const hues = [acc, ink, ink, acc];
      for (let i = 0; i < 4; i++) g += rect(pad + i * 22, 104, 18, 18, i % 2 ? ink : acc, i % 2 ? 0.25 + r() * 0.4 : 1);
      g += line(pad, 96, W - pad, 96, 0.12, 1);
    }

    else if (template === 'ui') {
      // screen frame
      g += rect(54, 16, 92, 118, ink, 0.06, `rx="6"`);
      g += rect(54, 16, 92, 118, 'none', 1, `rx="6" stroke="${ink}" stroke-opacity="0.35"`);
      g += rect(86, 22, 28, 4, ink, 0.4); // notch
      g += rect(64, 38, 72, 22, acc, 0.9, `rx="3"`); // hero
      for (let i = 0; i < 3; i++) g += rect(64, 70 + i * 14, 56 - r() * 24, 6, ink, 0.4);
      for (let i = 0; i < 3; i++) g += rect(64 + i * 26, 112, 18, 14, ink, 0.18, `rx="2"`);
    }

    else if (template === 'poster') {
      g += rect(pad, 16, 84, 60, ink, 0.1);
      g += rect(pad, 16, 84, 60, 'none', 1, `stroke="${ink}" stroke-opacity="0.3"`);
      g += `<path d="M${pad} 76 L${pad + 30} 46 L${pad + 50} 62 L${pad + 84} 28" stroke="${ink}" stroke-width="2" fill="none" opacity="0.3"/>`;
      // big title
      g += rect(pad, 90, 120, 12, ink, 0.85);
      g += rect(pad, 106, 150 - r() * 30, 12, acc, 1);
      g += rect(pad, 126, 70, 4, ink, 0.4);
      g += rect(150, 16, 6, 100, acc, 0.9); // accent rail
    }

    else { // icones
      const cols = 4, rows = 3, cw = (W - pad * 2) / cols, ch = (H - 30) / rows;
      for (let i = 0; i < cols * rows; i++) {
        const cxp = pad + (i % cols) * cw + cw / 2;
        const cyp = 22 + Math.floor(i / cols) * ch + ch / 2;
        const k = Math.floor(r() * 4);
        const isAcc = r() > 0.74;
        const f = isAcc ? acc : ink, o = isAcc ? 1 : 0.65;
        if (k === 0) g += circ(cxp, cyp, 9, 'none') , g += `<circle cx="${cxp}" cy="${cyp}" r="9" fill="none" stroke="${f}" stroke-width="2" opacity="${o}"/>`;
        else if (k === 1) g += rect(cxp - 8, cyp - 8, 16, 16, 'none', o, `stroke="${f}" stroke-width="2"`);
        else if (k === 2) g += `<path d="M${cxp - 9} ${cyp + 8} L${cxp} ${cyp - 9} L${cxp + 9} ${cyp + 8} Z" fill="none" stroke="${f}" stroke-width="2" opacity="${o}"/>`;
        else g += `<line x1="${cxp - 9}" y1="${cyp - 9}" x2="${cxp + 9}" y2="${cyp + 9}" stroke="${f}" stroke-width="2" opacity="${o}"/>` +
                  `<line x1="${cxp + 9}" y1="${cyp - 9}" x2="${cxp - 9}" y2="${cyp + 9}" stroke="${f}" stroke-width="2" opacity="${o}"/>`;
      }
    }

    const contrast = opts.contrast ?? 1;
    const filter = contrast !== 1 ? `filter:contrast(${contrast});` : '';
    const retro = opts.retro ? 'filter:sepia(0.35) saturate(1.2) contrast(1.05);' : '';
    return `<svg class="specimen" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"
      style="color:var(--ink-2);width:100%;height:100%;display:block;${filter}${retro}">
      <rect x="0" y="0" width="${W}" height="${H}" fill="var(--tile)"/>${g}</svg>`;
  }

  /* ============================================================
     Template / style / suggestion data
     ============================================================ */
  const TEMPLATES = {
    identidade: {
      scaffold: 'Identidade visual para uma fintech brasileira — logo, paleta e tipografia. Transmitir confiança e modernidade.',
      styles: ['editorial brasileiro', 'minimal suíço', 'geométrico', 'monolinha', 'grão analógico'],
      hint: 'identidade · marca',
      suggestion: 'Fintechs com este briefing costumam pedir também um <b>símbolo monocromático</b> para favicon e app icon. Quer que eu gere uma versão reduzida de cada direção?'
    },
    ui: {
      scaffold: 'Mockup de UI para um app de pagamentos — tela inicial com saldo, ações rápidas e histórico.',
      styles: ['neumórfico', 'flat denso', 'cards arejados', 'dark-first', 'alto contraste'],
      hint: 'app · produto',
      suggestion: 'Telas de saldo funcionam melhor com <b>hierarquia tipográfica forte</b>. Posso aplicar uma escala modular e gerar estados (vazio, carregando, erro)?'
    },
    poster: {
      scaffold: 'Pôster editorial para um evento de design — título expressivo, data e local, estética tipográfica.',
      styles: ['suíço tipográfico', 'brutalista', 'art déco', 'cyberpunk paulistano', 'risografia'],
      hint: 'print · capa',
      suggestion: 'Pôsteres ganham com <b>uma única cor de acento</b> sobre preto e branco. Quer explorar variações trocando só o acento?'
    },
    icones: {
      scaffold: 'Conjunto de ícones SVG em estilo linha — navegação, ações e status para um design system.',
      styles: ['linha 2px', 'duotone', 'preenchido', 'cantos retos', 'cantos suaves'],
      hint: 'set · sistema',
      suggestion: 'Para consistência de sistema, recomendo <b>grid de 24px e traço uniforme</b>. Gero o set inteiro sobre o mesmo grid?'
    }
  };

  /* ---------- state ---------- */
  const state = {
    template: null, tier: 'M', styles: new Set(), moods: new Set(),
    variants: [], view: 'grid', focused: null, pinCount: 0, version: 1,
    refine: { contrast: 1, elements: 1, retro: false }
  };

  /* ============================================================
     Topbar — theme, mode
     ============================================================ */
  $('#themeBtn').addEventListener('click', function () {
    const root = document.documentElement;
    root.classList.add('snap');
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    this.setAttribute('aria-pressed', next === 'light');
    if (principlesOn) positionPrinciples();
    setTimeout(() => root.classList.remove('snap'), 60);
  });

  $$('[data-mode-btn]').forEach(b => b.addEventListener('click', function () {
    $$('[data-mode-btn]').forEach(x => x.setAttribute('aria-pressed', 'false'));
    this.setAttribute('aria-pressed', 'true');
    document.documentElement.setAttribute('data-mode', this.dataset.modeBtn);
  }));

  /* ============================================================
     Composer
     ============================================================ */
  const prompt = $('#prompt'), promptCount = $('#promptCount');
  prompt.addEventListener('input', () => promptCount.textContent = `${prompt.value.length} / 480`);

  $$('[data-tier]').forEach(b => b.addEventListener('click', function () {
    $$('[data-tier]').forEach(x => x.setAttribute('aria-pressed', 'false'));
    this.setAttribute('aria-pressed', 'true');
    state.tier = this.dataset.tier;
  }));

  // templates
  $$('#templates .tmpl').forEach(t => t.addEventListener('click', function () {
    const key = this.dataset.tmpl;
    const wasOn = this.getAttribute('aria-pressed') === 'true';
    $$('#templates .tmpl').forEach(x => x.setAttribute('aria-pressed', 'false'));
    if (wasOn) { state.template = null; renderStyles(); $('#suggest').hidden = true; return; }
    this.setAttribute('aria-pressed', 'true');
    state.template = key;
    if (!prompt.value.trim()) { prompt.value = TEMPLATES[key].scaffold; prompt.dispatchEvent(new Event('input')); }
    renderStyles();
    showSuggestion(TEMPLATES[key].suggestion);
  }));

  function renderStyles() {
    const wrap = $('#styles'), hint = $('#styleHint');
    wrap.innerHTML = '';
    if (!state.template) { hint.textContent = 'selecione um template'; wrap.innerHTML = '<span class="label" style="color:var(--faint)">—</span>'; return; }
    hint.textContent = TEMPLATES[state.template].hint;
    state.styles.clear();
    TEMPLATES[state.template].styles.forEach(s => {
      const b = document.createElement('button');
      b.className = 'chip'; b.setAttribute('aria-pressed', 'false');
      b.innerHTML = `<span class="dot"></span>${s}`;
      b.addEventListener('click', () => {
        const on = b.getAttribute('aria-pressed') === 'true';
        b.setAttribute('aria-pressed', String(!on));
        on ? state.styles.delete(s) : state.styles.add(s);
      });
      wrap.appendChild(b);
    });
  }
  renderStyles();

  // moods
  $$('#moods .chip').forEach(c => c.addEventListener('click', function () {
    const on = this.getAttribute('aria-pressed') === 'true';
    this.setAttribute('aria-pressed', String(!on));
  }));

  // suggestion callout
  function showSuggestion(html) {
    $('#suggestText').innerHTML = html;
    $('#suggest').hidden = false;
    $('#suggest').classList.remove('fade-in'); void $('#suggest').offsetWidth; $('#suggest').classList.add('fade-in');
  }
  $('#suggestApply').addEventListener('click', () => {
    $('#suggestApply').innerHTML = '<span class="dot" style="background:var(--accent)"></span>Sugestão aplicada';
    $('#suggestApply').setAttribute('aria-pressed', 'true');
  });

  // surprise / easter-egg
  const SURPRISES = [
    { t: 'identidade', s: ['cyberpunk paulistano', 'grão analógico'], txt: 'Marca para uma fintech — mas e se ela tivesse a alma de um <b>jornal de bairro dos anos 70</b>? Tipografia quente, acento ácido.' },
    { t: 'poster', s: ['risografia'], txt: 'Pôster do evento em <b>risografia de duas cores</b> com erro de registro proposital. Ousado, tátil, memorável.' },
    { t: 'ui', s: ['dark-first', 'alto contraste'], txt: 'App de pagamentos como um <b>terminal de comando</b>: mono, denso, para quem ama controle total.' },
    { t: 'icones', s: ['duotone'], txt: 'Ícones que <b>respiram</b>: cada um com um micro-detalhe vivo. Set duotone, cantos retos.' }
  ];
  $('#surpriseBtn').addEventListener('click', () => {
    const s = SURPRISES[Math.floor(Math.random() * SURPRISES.length)];
    const tb = $(`[data-tmpl="${s.t}"]`);
    $$('#templates .tmpl').forEach(x => x.setAttribute('aria-pressed', 'false'));
    tb.setAttribute('aria-pressed', 'true');
    state.template = s.t; renderStyles();
    // pre-select styles
    requestAnimationFrame(() => $$('#styles .chip').forEach(c => {
      if (s.s.some(x => c.textContent.includes(x))) { c.setAttribute('aria-pressed', 'true'); state.styles.add(c.textContent.trim()); }
    }));
    showSuggestion('⚡ <b>Direção inesperada</b> — ' + s.txt);
    prompt.value = TEMPLATES[s.t].scaffold; prompt.dispatchEvent(new Event('input'));
  });

  /* ============================================================
     Generate → process timeline → gallery
     ============================================================ */
  const discoverBody = $('#discoverBody');
  const PROC = [
    { name: 'Criação da task', meta: '#A4F1', t: 500 },
    { name: 'Roteamento semântico', meta: 'conf. 0.92', t: 850 },
    { name: 'Geração · tier ' , meta: '', t: 1400 },
    { name: 'Validação', meta: 'plágio · PII · marca', t: 900 },
    { name: 'Entrega', meta: '4 variações', t: 500 }
  ];

  $('#generateBtn').addEventListener('click', () => (REAL ? runGenerateReal() : runGenerate()));

  // Build the create-task payload from the composer state.
  function buildBrief() {
    const promptText = (prompt.value || '').trim() ||
      (state.template ? TEMPLATES[state.template].scaffold : 'identidade visual');
    return {
      prompt: promptText,
      tier: state.tier,
      skill_slug: 'visual-identity',
      preferences: {
        template: state.template || 'identidade',
        style: [...state.styles],
        mood: [...state.moods],
      },
    };
  }

  // Render the process timeline once; steps are advanced by real task_events.
  function renderRealTimeline() {
    const labels = ['Criação da task', 'Roteamento semântico', `Geração · tier ${state.tier}`, 'Validação', 'Entrega'];
    discoverBody.innerHTML = `<div class="process"><div class="proc-steps fade-in">${
      labels.map((name, i) => `<div class="proc" data-step="${i}"><div class="proc__dot">${i + 1}</div><div class="proc__name">${name}</div><div class="proc__meta"></div></div>`).join('')
    }</div></div>`;
  }
  function advance(stepIndex, meta) {
    const els = $$('.proc', discoverBody);
    els.forEach((el, i) => {
      el.classList.toggle('done', i < stepIndex);
      el.classList.toggle('active', i === stepIndex);
      if (i < stepIndex) el.querySelector('.proc__dot').textContent = '✓';
    });
    if (meta && els[stepIndex]) els[stepIndex].querySelector('.proc__meta').textContent = meta;
  }

  async function runGenerateReal() {
    const btn = $('#generateBtn'); btn.disabled = true;
    $('#discoverMeta').textContent = 'gerando…';
    renderRealTimeline();
    let unsub = () => {};
    const finish = async () => {
      unsub();
      await renderRealGallery();
      btn.disabled = false;
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4v6h6M20 20v-6h-6M20 9A8 8 0 0 0 6 5M4 15a8 8 0 0 0 14 4"/></svg> Gerar novamente';
    };
    try {
      const { task_id } = await api.createTask(buildBrief());
      state.taskId = task_id;
      advance(0, '#' + String(task_id).slice(0, 4));
      const onEvent = (e) => {
        if (e.type === 'routing_done') advance(1, 'conf. ok');
        else if (e.type === 'generation_started') advance(2, `tier ${state.tier}`);
        else if (e.type === 'variation_ready') advance(2, `${(e.payload?.variation_index ?? 0) + 1}/4`);
        else if (e.type === 'validation_started' || e.type === 'validation_done') advance(3, 'plágio · PII · carbono');
        else if (e.type === 'delivered') { advance(4, '4 variações'); finish(); }
        else if (e.type === 'failed') { $('#discoverMeta').textContent = 'falhou'; btn.disabled = false; unsub(); }
      };
      unsub = subscribeTaskEvents(task_id, onEvent);
      // Polling fallback in case a Realtime message is missed.
      setTimeout(async () => {
        const evs = await pollTaskEvents(task_id);
        if (evs.some((e) => e.type === 'delivered') && !$('.variant', discoverBody)) finish();
      }, 8000);
    } catch (err) {
      $('#discoverMeta').textContent = 'erro: ' + err.message;
      btn.disabled = false;
    }
  }

  async function renderRealGallery() {
    const artifacts = await api.listArtifacts(state.taskId);
    const cards = await Promise.all(artifacts.map(async (a, i) => {
      const url = await api.signedUrl(a.storage_path);
      const env = a.environmental_report || {};
      const kwh = typeof env.energy_kwh === 'number' ? env.energy_kwh.toFixed(3) : '—';
      const q = a.quality_score != null ? a.quality_score : '—';
      return `<article class="variant" data-id="${a.id}" tabindex="0">
        <div class="variant__art">
          <div class="variant__badge">v${a.variation_index} · ${(a.metadata?.provider) || 'mock'}</div>
          <div class="variant__q"><span class="qdot"></span>q${q}</div>
          <img class="specimen" src="${url}" alt="Direção ${i}" style="width:100%;height:100%;object-fit:cover;display:block"/>
        </div>
        <div class="variant__foot"><span class="name">Direção ${String.fromCharCode(65 + i)}</span></div>
        <div class="tech-meta"><dl>
          <dt>modelo</dt><dd>${a.metadata?.model || '—'}</dd>
          <dt>energia</dt><dd>${kwh} kWh</dd>
          <dt>método</dt><dd>${env.method || '—'}</dd>
          <dt>integridade</dt><dd>sha256 ✓</dd>
        </dl></div>
      </article>`;
    }));
    $('#discoverMeta').textContent = `${artifacts.length} variações · reais`;
    discoverBody.innerHTML = `<div class="discover-head"><span class="label">Grade de variações</span></div><div class="gallery">${cards.join('')}</div>`;
  }

  function runGenerate() {
    const btn = $('#generateBtn'); btn.disabled = true;
    $('#discoverMeta').textContent = 'gerando… (DEMO)';
    const steps = PROC.map((p, i) => {
      const meta = i === 2 ? `tier ${state.tier} · 30 passos` : p.meta;
      const name = i === 2 ? `Geração · tier ${state.tier}` : p.name;
      return `<div class="proc" data-i="${i}">
        <div class="proc__dot">${i + 1}</div>
        <div class="proc__name">${name}</div>
        <div class="proc__meta">${meta}</div>
        <div class="proc__bar"><i></i></div>
      </div>`;
    }).join('');
    discoverBody.innerHTML = `<div class="process"><div class="proc-steps fade-in">${steps}</div></div>`;
    const procEls = $$('.proc', discoverBody);
    let i = 0;
    function step() {
      if (i > 0) { procEls[i - 1].classList.remove('active'); procEls[i - 1].classList.add('done'); procEls[i - 1].querySelector('.proc__dot').textContent = '✓'; }
      if (i >= procEls.length) { setTimeout(renderGallery, 280); return; }
      procEls[i].classList.add('active');
      procEls[i].querySelector('.proc__meta').insertAdjacentHTML('afterbegin', '<span class="spinner" style="margin-right:6px;vertical-align:-1px;display:inline-block"></span>');
      const dur = PROC[i].t;
      const bar = procEls[i].querySelector('.proc__bar i'); if (bar) bar.style.animationDuration = dur + 'ms';
      setTimeout(() => { const sp = procEls[i].querySelector('.spinner'); if (sp) sp.remove(); i++; step(); }, dur);
    }
    step();
  }

  const DIRS = ['A', 'B', 'C', 'D'];
  function renderGallery() {
    const tpl = state.template || 'identidade';
    const base = Date.now() % 9000;
    state.variants = DIRS.map((d, i) => ({
      id: `v${String(i + 1).padStart(2, '0')}`,
      dir: d, name: `Direção ${d}`,
      seed: base + i * 137 + 7,
      q: 78 + Math.floor(Math.random() * 20),
      ms: 1.6 + Math.random() * 2.4,
      steps: 30, tier: state.tier, tpl,
      kwh: (0.04 + Math.random() * 0.09)
    }));
    state.view = 'grid';
    $('#discoverMeta').textContent = '4 variações · escolha uma';
    paintDiscover();
    $('#generateBtn').disabled = false;
    $('#generateBtn').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4v6h6M20 20v-6h-6M20 9A8 8 0 0 0 6 5M4 15a8 8 0 0 0 14 4"/></svg> Gerar novamente';
  }

  function variantCard(v, idx) {
    return `<article class="variant" data-id="${v.id}" tabindex="0">
      <div class="variant__art">
        <div class="variant__badge">${v.id} · ${v.tpl}</div>
        <div class="variant__q"><span class="qdot"></span>q${v.q}</div>
        ${specimen(v.tpl, v.seed)}
      </div>
      <div class="variant__foot">
        <span class="name">${v.name}</span>
        <div class="variant__acts">
          <button title="Comparar" data-act="compare"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="7" height="14"/><rect x="14" y="5" width="7" height="14"/></svg></button>
          <button title="Abrir diálogo" data-act="open"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z"/></svg></button>
        </div>
      </div>
      <div class="tech-meta">
        <dl>
          <dt>modelo</dt><dd>sdxl-${v.tier.toLowerCase()}</dd>
          <dt>passos</dt><dd>${v.steps}</dd>
          <dt>latência</dt><dd>${v.ms.toFixed(1)}s</dd>
          <dt>qualidade</dt><dd>0.${v.q}</dd>
          <dt>energia</dt><dd>${v.kwh.toFixed(3)} kWh</dd>
        </dl>
      </div>
    </article>`;
  }

  function paintDiscover() {
    if (state.view === 'grid') {
      discoverBody.innerHTML = `<div class="discover-head">
          <span class="label">Grade de variações</span>
          <div class="viewtoggle">
            <button data-view="grid" aria-pressed="true" title="Grade"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></svg></button>
            <button data-view="compare" aria-pressed="false" title="Lado a lado"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="7" height="14"/><rect x="14" y="5" width="7" height="14"/></svg></button>
          </div>
        </div>
        <div class="gallery">${state.variants.map(variantCard).join('')}</div>`;
    } else {
      const pair = state.variants.slice(0, 2);
      discoverBody.innerHTML = `<div class="discover-head">
          <span class="label">Lado a lado · ${pair[0].name} × ${pair[1].name}</span>
          <div class="viewtoggle">
            <button data-view="grid" aria-pressed="false" title="Grade"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></svg></button>
            <button data-view="compare" aria-pressed="true" title="Lado a lado"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="7" height="14"/><rect x="14" y="5" width="7" height="14"/></svg></button>
          </div>
        </div>
        <div class="gallery compare">${pair.map(v => variantCard(v, 0).replace('aspect-ratio', '')).join('')}</div>
        <div style="padding:0 var(--s5) var(--s5)">
          <div class="tech-meta" style="display:block;border:1px solid var(--line);border-radius:3px">
            <dl style="grid-template-columns:auto 1fr 1fr;padding:var(--s3) var(--s4)">
              <dt style="grid-column:1">métrica</dt><dt style="text-align:right">${pair[0].dir}</dt><dt style="text-align:right">${pair[1].dir}</dt>
              <dt>qualidade</dt><dd>0.${pair[0].q}</dd><dd>0.${pair[1].q}</dd>
              <dt>latência</dt><dd>${pair[0].ms.toFixed(1)}s</dd><dd>${pair[1].ms.toFixed(1)}s</dd>
              <dt>energia</dt><dd>${pair[0].kwh.toFixed(3)}</dd><dd>${pair[1].kwh.toFixed(3)}</dd>
            </dl>
          </div>
        </div>`;
    }
    bindGallery();
  }

  function bindGallery() {
    $$('[data-view]', discoverBody).forEach(b => b.addEventListener('click', function () {
      state.view = this.dataset.view; paintDiscover();
    }));
    $$('.variant', discoverBody).forEach(card => {
      const id = card.dataset.id;
      card.addEventListener('click', e => {
        const act = e.target.closest('[data-act]');
        if (act && act.dataset.act === 'compare') { state.view = 'compare'; paintDiscover(); return; }
        openDialogue(id);
      });
      card.addEventListener('keydown', e => { if (e.key === 'Enter') openDialogue(id); });
    });
    if (state.focused) {
      const c = discoverBody.querySelector(`.variant[data-id="${state.focused.id}"]`);
      if (c) c.classList.add('selected');
    }
  }

  /* ============================================================
     Dialogue (column 3)
     ============================================================ */
  const dialogueBody = $('#dialogueBody');
  const REFINES = [
    { k: 'contraste', label: '+ contraste', fn: () => state.refine.contrast = Math.min(1.6, state.refine.contrast + 0.18), say: 'Aumentei o contraste — a hierarquia ficou mais nítida.' },
    { k: 'menos', label: '− elementos', fn: () => state.refine.elements = Math.max(0.6, state.refine.elements - 0.2), say: 'Removi elementos secundários. Mais respiro, mais foco.' },
    { k: 'retro', label: 'estilo retrô', fn: () => state.refine.retro = !state.refine.retro, say: 'Apliquei um tratamento retrô — grão quente e saturação suave.' },
    { k: 'acento', label: 'trocar acento', fn: rotateAccent, say: 'Troquei a cor de acento. Veja como muda a temperatura da peça.' },
    { k: 'espaco', label: 'mais espaço', fn: () => state.refine.elements = Math.max(0.6, state.refine.elements - 0.12), say: 'Abri as margens e aumentei o espaço negativo.' }
  ];
  const ACCENTS = ['#a3e635', '#34d399', '#22d3ee', '#f0abfc', '#fb923c'];
  let accentIdx = 0;
  function rotateAccent() { accentIdx = (accentIdx + 1) % ACCENTS.length; }

  function openDialogue(id) {
    const v = state.variants.find(x => x.id === id);
    if (!v) return;
    state.focused = v; state.pinCount = 0; state.version = 1;
    state.refine = { contrast: 1, elements: 1, retro: false }; accentIdx = 0;
    $$('.variant', discoverBody).forEach(c => c.classList.toggle('selected', c.dataset.id === id));

    dialogueBody.innerHTML = `
      <div class="focus">
        <div class="focus__meta">
          <div><div class="name">${v.name}</div><div class="sub">${v.id} · ${v.tpl} · v<span id="verNum">1</span></div></div>
          <div class="variant__q" style="position:static;backdrop-filter:none"><span class="qdot"></span>q${v.q}</div>
        </div>
        <div class="focus__stage" id="stage" style="--sacc:${ACCENTS[0]}">
          ${specimen(v.tpl, v.seed)}
          <div class="focus__hint"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>clique no artefato para marcar um ponto</div>
        </div>
        <div class="refine">
          <span class="label">Refinar — diálogo visual</span>
          <div class="chips" id="refineChips" style="margin-top:var(--s3)">
            ${REFINES.map(r => `<button class="chip" data-ref="${r.k}"><span class="dot"></span>${r.label}</button>`).join('')}
          </div>
          <div class="refine__row">
            <input id="refineInput" placeholder="ou peça com suas palavras…">
            <button class="btn" id="refineSend">Enviar</button>
          </div>
        </div>
        <div class="log" id="log">
          <div class="log__item">
            <div class="log__node agent">EA</div>
            <div class="log__c"><div class="who">Executagent · agora</div>
            <div class="msg">Abri <b>${v.name}</b> para diálogo. Marque pontos sobre a peça ou peça um ajuste — eu respondo visualmente.</div></div>
          </div>
        </div>
      </div>`;

    const stage = $('#stage');
    stage.addEventListener('click', e => {
      if (e.target.closest('.pin')) return;
      const rect = stage.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      addPin(x, y);
    });
    $$('#refineChips .chip').forEach(c => c.addEventListener('click', () => applyRefine(c.dataset.ref)));
    $('#refineSend').addEventListener('click', sendRefineText);
    $('#refineInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendRefineText(); });
  }

  function addPin(x, y) {
    state.pinCount++;
    const n = state.pinCount;
    const stage = $('#stage');
    const pin = document.createElement('div');
    pin.className = 'pin'; pin.style.left = x + '%'; pin.style.top = y + '%';
    pin.innerHTML = `<span><b>${n}</b></span>`;
    stage.appendChild(pin);
    const region = y < 38 ? 'topo' : y > 66 ? 'base' : 'centro';
    logItem('you', 'Você · marcação', `Ponto <b>${n}</b> no <b>${region}</b> da peça <span class="mono" style="color:var(--faint)">(${x.toFixed(0)}%, ${y.toFixed(0)}%)</span>`);
    setTimeout(() => logItem('agent', 'Executagent', `Anotado. Quer que eu ajuste especificamente essa região?`), 450);
  }

  function applyRefine(k) {
    const r = REFINES.find(x => x.k === k);
    if (!r) return;
    r.fn();
    logItem('you', 'Você · refinamento', `“${r.label}”`);
    bumpVersion();
    setTimeout(() => {
      reRenderStage();
      logItem('agent', 'Executagent', r.say, true);
    }, 420);
  }

  function sendRefineText() {
    const inp = $('#refineInput'); const t = inp.value.trim(); if (!t) return;
    inp.value = '';
    logItem('you', 'Você · refinamento', `“${t}”`);
    state.refine.contrast = Math.min(1.6, state.refine.contrast + 0.1);
    bumpVersion();
    setTimeout(() => { reRenderStage(); logItem('agent', 'Executagent', `Apliquei <b>“${t}”</b> à direção. Veja o resultado acima — refine de novo se quiser.`, true); }, 420);
  }

  function bumpVersion() { state.version++; const v = $('#verNum'); if (v) v.textContent = state.version; }

  function reRenderStage() {
    const stage = $('#stage'); if (!stage || !state.focused) return;
    stage.style.setProperty('--sacc', ACCENTS[accentIdx]);
    const old = stage.querySelector('.specimen');
    const fresh = specimen(state.focused.tpl, state.focused.seed, state.refine);
    const tmp = document.createElement('div'); tmp.innerHTML = fresh;
    const svg = tmp.firstElementChild;
    svg.classList.add('fade-in');
    if (old) old.replaceWith(svg); else stage.insertAdjacentElement('afterbegin', svg);
  }

  function logItem(who, label, msg, withThumb) {
    const log = $('#log'); if (!log) return;
    const node = who === 'agent' ? 'agent' : 'you';
    const initials = who === 'agent' ? 'EA' : 'V';
    const thumb = withThumb && state.focused
      ? `<div class="log__thumb" style="--sacc:${ACCENTS[accentIdx]}">${specimen(state.focused.tpl, state.focused.seed, state.refine)}</div>` : '';
    const item = document.createElement('div');
    item.className = 'log__item fade-in';
    item.innerHTML = `<div class="log__node ${node}">${initials}</div>
      <div class="log__c"><div class="who">${label}</div><div class="msg">${msg}</div>${thumb}</div>`;
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
  }

  /* ============================================================
     Principles overlay
     ============================================================ */
  let principlesOn = false;
  const overlay = $('#principles');
  $('#principlesBtn').addEventListener('click', function () {
    principlesOn = !principlesOn;
    this.setAttribute('aria-pressed', String(principlesOn));
    overlay.classList.toggle('on', principlesOn);
    overlay.setAttribute('aria-hidden', String(!principlesOn));
    if (principlesOn) positionPrinciples();
  });
  function positionPrinciples() {
    $$('.pmark', overlay).forEach(m => {
      const col = document.getElementById(m.dataset.anchor);
      if (!col) return;
      const r = col.getBoundingClientRect();
      m.style.left = (r.left + r.width / 2) + 'px';
      m.style.top = (r.top + 150) + 'px';
      m.style.transform = 'translateX(-50%)';
    });
  }
  window.addEventListener('resize', () => { if (principlesOn) positionPrinciples(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && principlesOn) { $('#principlesBtn').click(); }
  });

})();
