import * as CFG from '../config.js';
const { GAS_URL, SCHOOL, ROSTER_STEPS } = CFG;
import * as store from './store.js';
import * as api from './api.js';
import { encode, decode } from './codec.js';
import { parseApps, mergeApps, parseRoster, ROSTER_PV } from './parse.js';
import { fixHcell } from './xlfix.js';
import { buildIndex, findSimilar, summarize, aggregateUniv, aggregateTrack } from './match.js';
import * as R from './render.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const S = {
  key: null, admin: null, history: null, index: null, version: null,
  roster: null,   // 학년별 내신 석차 명단 — { sets: {학년: {students, meta}}, students, meta }
  cur: null,      // 선택한 학생
  cases: [],      // 현재 화면의 유사 학생 사례 — 목록과 「크게 보기」가 함께 씁니다
};

/* ── 학교 표기 ─────────────────────────────────────── */

function brand() {
  document.title = `${SCHOOL.ko} 진학상담 프로그램`;
  document.querySelectorAll('[data-school]').forEach(el => {
    const k = el.dataset.school;
    if (k === 'en') el.textContent = SCHOOL.en;
    else if (k === 'en2') el.innerHTML = esc(SCHOOL.en).replace(/ (?=[A-Z]+ [A-Z]+$)/, '<br>');   /* 마지막 두 단어를 아랫줄로 */
    else if (k === 'title') el.innerHTML = `${esc(SCHOOL.title[0])}<br><span class="accent">${esc(SCHOOL.title[1])}</span>`;
    else if (k === 'titleEn') el.textContent = SCHOOL.titleEn;
  });
}

/* ── 표지 조각 ─────────────────────────────────────── */

const LEFT = () => `<div>
  <div class="cv-since">${esc(SCHOOL.since)}</div>
  <div class="cv-title">${esc(SCHOOL.title[0])}<br><span class="accent">${esc(SCHOOL.title[1])}</span></div>
  <div class="cv-en">${esc(SCHOOL.titleEn)}</div>
  <div class="cv-feats" id="cv-feats"></div>
  ${SCHOOL.motto?.length ? `<div class="cv-motto"><div class="m">${esc(SCHOOL.motto[0])}</div><div class="m"><b>${esc(SCHOOL.motto[1] || '')}</b></div></div>` : ''}
</div>`;

/* 대상 연도 — 실제로 들어온 학년도로 칸을 만듭니다. 기본은 「전부」. */
function fillYears() {
  const el = $('yrs'), ys = S.history?.meta?.years || [];
  if (!el || ys.length < 2) return;
  const last = ys[ys.length - 1];
  const want = [];
  for (let n = ys.length; n >= 2; n--) want.push(n);
  const cur = el.dataset.set ? +el.value : ys.length;
  el.innerHTML = want.map(n => {
    const from = n >= ys.length ? ys[0] : last - n + 1;
    return `<option value="${n}">최근 ${n}개년 · ${String(from).slice(2)}~${String(last).slice(2)}</option>`;
  }).join('');
  el.value = want.includes(cur) ? cur : ys.length;
  el.dataset.set = '1';
}

function feats() {
  const el = $('cv-feats');
  if (!el) return;
  if (!S.history) { el.innerHTML = ''; return; }
  const m = S.history.meta;
  const yr = m?.years?.length ? `${m.years[0]}~${m.years[m.years.length - 1]}학년도` : '자료 없음';
  const rows = [
    [m?.years?.length ? `${m.years.length}개년` : '지원결과', yr],
    [`${(m?.nApps || 0).toLocaleString()}건`, '수시 지원'],
    ['유사 사례', '내신 기준'],
    ['카드 배분', '전형별 실적'],
    ['수능최저', '충족 여부'],
  ];
  el.innerHTML = rows.map(([a, b]) => `<div class="cv-feat"><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('');
}

const howto = steps => `<details class="howto">
  <summary><span class="tk2"></span>자료 받는 방법<span class="arw2">▾</span></summary>
  <div class="path">${steps.map((s, i) =>
    `${i ? '<span class="arw">›</span>' : ''}<span class="s ${i === 0 ? 'a' : i === steps.length - 1 ? 'z' : ''}">${esc(s)}</span>`).join('')}</div>
</details>`;

const SHIELD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  style="width:13px;height:13px"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/></svg>`;

function pills(list) {
  $('cv-pills').innerHTML = list.map(([cls, text]) =>
    `<span class="cv-pill"><i class="d ${cls}"></i>${esc(text)}</span>`).join('');
}

function cover(html, pillList) {
  $('app').classList.add('hidden');
  $('cover').classList.remove('hidden');
  pills(pillList || []);
  $('cv-body').innerHTML = html;
  feats();
}

const centered = inner => `<div class="centerwrap">${inner}</div>`;

/* ── 화면들 ────────────────────────────────────────── */

function screenLoading(msg, pct) {
  cover(centered(`<div class="spin"></div>
    <h3>${esc(msg)}</h3>
    <p>${S.history ? '' : '처음 한 번만 기다리시면 됩니다'}</p>
    <div class="prog"><i style="width:${pct ?? 55}%"></i></div>`), [['d-gold', '자료 확인 중']]);
}

function screenBlocked(reason) {
  cover(centered(`<div class="lockic">🔒</div>
    <h3>접근 권한이 필요합니다</h3>
    <p>${esc(SCHOOL.dept || '담당 부서')}에서 받은 <b style="color:#e5ebfa">전용 링크</b>로 접속해 주세요.<br>
      주소 뒤에 <span class="kbd">?k=…</span> 가 붙은 형태입니다.
      ${reason ? `<br><span style="color:#ff9c9c;font-size:12px">${esc(reason)}</span>` : ''}</p>`), []);
}

const gradeLabel = m => `${m.grade}학년 내신 석차${m.scale === 5 ? ' · 5등급' : ''}`;

function screenUpload(err) {
  const m = S.history.meta;
  const tag = S.roster ? `<span class="p-tag">${(S.roster.meta.grades || []).map(g => `${g}학년`).join('·')} ${S.roster.meta.n}명 불러옴</span>` : '';
  cover(`<div class="cv-main">${LEFT()}
    <div>
      <div class="cv-panel one">
        <div class="p-head"><span class="p-num">1</span><h2>${m.years?.length ? `${m.years.length}개년 ` : ''}수시 지원결과</h2>
          <span class="p-line">지원 ${m.nApps.toLocaleString()}건 · 학생 ${m.nPersons.toLocaleString()}명 —
            자동으로 들어옵니다. 따로 올리실 것 없습니다.</span>
          <span class="p-tag">불러옴</span></div>
      </div>

      <div class="cv-panel two">
        <div class="p-head"><span class="p-num">2</span><h2>내신 석차 파일 · 수시 상담</h2>${tag}</div>
        <div class="p-hint">학교 성적 프로그램에서 내려받은 학년별 내신 석차 파일을 올리면 됩니다.
          1·2학년(5등급)은 우리 졸업생 석차 곡선으로 9등급으로 환산해 보여 줍니다. 학년마다 따로 보관되고, 올린 파일의 학년만 바뀝니다.</div>
        ${howto(ROSTER_STEPS)}
        <div class="dropzone" id="dz">
          <strong>파일을 끌어다 놓거나 클릭해서 선택</strong>
          <div class="dz-hint">○학년 내신석차.xls · 「재학(전교과)」 시트가 든 .xlsx · 여러 학년을 한꺼번에 골라도 됩니다</div>
          <div class="dz-tags"><span class="dz-tag">학년·반·번호·이름</span><span class="dz-tag">석차 · 석차백분율</span>
            <span class="dz-tag">석차백분율 → 9등급 환산</span><span class="dz-tag">학년별 따로 보관</span></div>
        </div>
      </div>

      <label class="opt"><input type="checkbox" id="keep" checked>
        <span class="t">체크를 하시면 다음 접속 때부터 이 화면 없이 바로 상담 화면으로 들어갑니다.
          <b>공용 PC에서는 체크를 하지 마세요.</b></span></label>
      ${err ? `<div class="cv-err">${esc(err)}</div>` : ''}
      ${S.roster ? '<button class="mini" id="btn-go" style="width:100%;margin-top:12px;padding:10px">상담 화면으로</button>' : ''}
      <div class="cv-safe">${SHIELD} 명단은 이 브라우저 안에서만 열립니다 · 주민등록번호 열은 읽지 않습니다</div>
    </div>
  </div>`, [['d-gold', `${new Date().getFullYear() + 1}학년도`], ['d-green', '명단은 서버로 전송되지 않습니다']]);

  bindDrop($('dz'), files => loadRoster(files));
  $('dz').addEventListener('click', () => $('f-roster').click());
  $('btn-go')?.addEventListener('click', () => showApp());
}

function bindDrop(el, cb) {
  el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('over'); });
  el.addEventListener('dragleave', () => el.classList.remove('over'));
  el.addEventListener('drop', e => {
    e.preventDefault(); el.classList.remove('over');
    if (e.dataTransfer.files.length) cb([...e.dataTransfer.files]);
  });
}

/* ── 명단 읽기 (학년별 보관) ─────────────────────────── */

const keepChecked = () => $('keep') ? $('keep').checked : true;

/* 엑셀 읽기 — 한셀로 저장한 파일은 먼저 손봅니다 */
async function readBook(file) {
  const bytes = fixHcell(new Uint8Array(await file.arrayBuffer()), XLSX);
  return XLSX.read(bytes, { type: 'array' });
}

function buildRoster(sets) {
  const grades = Object.keys(sets).map(Number).filter(g => sets[g]?.students?.length).sort();
  if (!grades.length) return null;
  const students = grades.flatMap(g => sets[g].students).sort((a, b) => (a.c - b.c) || (a.no - b.no));
  return { sets, students, meta: { n: students.length, grades, has5: grades.some(g => sets[g].meta.has5), pv: ROSTER_PV, loadedAt: Math.max(...grades.map(g => sets[g].meta.loadedAt || 0)) } };
}

async function saveRoster() {
  if (keepChecked() && S.roster) await store.set(store.KEY_ROSTER, S.roster); else await store.del(store.KEY_ROSTER);
}

async function loadRoster(files) {
  try {
    const sets = { ...(S.roster?.sets || {}) };
    for (const f of files) {
      const data = parseRoster(await readBook(f), XLSX);
      if (!data.students.length) throw new Error(`${f.name} 에서 학생을 찾지 못했습니다. 내신 석차 파일이 맞는지 확인해 주세요.`);
      /* 한 파일에 학년이 섞여 있어도 학년별 자리에 나눠 넣습니다. 올린 학년은 통째로 바뀝니다. */
      const split = {};
      for (const st of data.students) { const g = st.gr || Math.floor(st.c / 100); if (g) (split[g] ||= []).push(st); }
      if (!Object.keys(split).length) throw new Error(`${f.name} 에 학년 칸이 없습니다.`);
      for (const g of Object.keys(split).map(Number)) {
        sets[g] = { students: split[g], meta: { ...data.meta, grade: g, grades: [g], n: split[g].length, loadedAt: Date.now() } };
      }
    }
    S.roster = buildRoster(sets);
    await saveRoster();
    showApp();
  } catch (e) {
    screenUpload('내신 석차 파일을 읽지 못했습니다 — ' + e.message);
  }
}

async function dropRosterGrade(g) {
  if (!S.roster?.sets?.[g]) return;
  const sets = { ...S.roster.sets }; delete sets[g];
  S.roster = buildRoster(sets);
  await saveRoster();
  if (S.roster) showApp(); else screenUpload();
}

/* ── 상담 화면 ─────────────────────────────────────── */

function showApp() {
  $('cover').classList.add('hidden');
  $('app').classList.remove('hidden');
  if (!S.index) S.index = buildIndex(S.history);
  const m = S.history.meta;
  const when = d => {
    if (!d?.meta?.loadedAt) return '';
    const t = new Date(d.meta.loadedAt);
    const old = (Date.now() - t) > 180 * 86400e3;
    return `<i class="when${old ? ' old' : ''}">${t.getFullYear()}.${t.getMonth() + 1}.${t.getDate()} 올림${old ? ' · 오래됨' : ''}</i>`;
  };
  $('sb-scope').innerHTML =
    `<div class="row"><span>수시 지원결과</span><b>지원 ${m.nApps.toLocaleString()}건</b></div>` +
    (S.roster ? S.roster.meta.grades.map(g => { const st = S.roster.sets[g];
      return `<div class="row mockg"><span>${esc(gradeLabel(st.meta))}${when(st)}${S.roster.meta.stale ? '<i class="when old">예전 판으로 읽힘 · 다시 올려 주세요</i>' : ''}</span><b class="off">${st.meta.n}명<button class="xg" data-rdel="${g}" title="${g}학년 명단 지우기" aria-label="${g}학년 명단 지우기">×</button></b></div>`; }).join('') : '');
  clearStudent();
  selectTab('stu');
  fillClasses();
  fillStudents();
  $('results').classList.add('hidden');
  showEmpty();
  run();
}

/* 학생을 바꾸거나 목록을 바꿀 때 앞 학생의 값이 한 칸도 남지 않게 전부 비웁니다. */
function clearStudent() {
  S.cur = null;
  $('gpa').value = '';
  $('gpanote').textContent = '';
  $('gpasubs').innerHTML = '';
  $('gpa5c').classList.add('hidden');
  $('gpa5c').classList.remove('est');
  $('stucard').classList.add('hidden');
}

function toast(msg) {
  let t = $('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 4000);
}

const currentList = () => S.roster?.students || [];

function fillClasses() {
  const cs = [...new Set(currentList().map(s => s.c))].sort((a, b) => a - b);
  $('cls').innerHTML = '<option value="">전체 학급</option>'
    + cs.map(c => `<option value="${c}">${esc(R.clsLabel(c))}</option>`).join('');
}

function fillStudents() {
  const c = $('cls').value, q = ($('q').value || '').trim();
  const f = currentList().filter(s => (!c || String(s.c) === c) && (!q || s.nm.includes(q)));
  /* 목록에는 성적을 넣지 않습니다. 펼치면 반 전체의 점수가 한눈에 보이기 때문입니다. */
  $('stu').innerHTML = '<option value="">직접 입력</option>' + f.map(s => `<option value="${s.c}-${s.no}">${s.no}번 ${esc(s.nm)}</option>`).join('');
  if (S.cur && f.some(s => s.c === S.cur.c && s.no === S.cur.no)) $('stu').value = `${S.cur.c}-${S.cur.no}`;
  else if (S.cur) { clearStudent(); run(); }
}

const gradeOf = st => st.gr || Math.floor(st.c / 100);

function onStudentChange() {
  const v = $('stu').value;
  clearStudent();
  if (!v) return run();
  const [c, no] = v.split('-').map(Number);
  S.cur = currentList().find(s => s.c === c && s.no === no) || null;
  if (!S.cur) return run();
  const set = S.roster.sets[gradeOf(S.cur)];
  $('stucard').innerHTML = R.studentCard(S.cur, set?.meta.n || S.roster.meta.n, set?.meta);
  $('stucard').classList.remove('hidden');
  if (S.cur.g[3] == null) {
    return showEmpty(`이 학생은 파일에 <b>성적이 비어</b> 있습니다(석차 ${S.cur.r ?? '—'}위). 내신 전학년(9등급)을 위 칸에 직접 넣으면 볼 수 있습니다.`);
  }
  $('gpa').value = S.cur.g[3].toFixed(2);
  if (S.cur.a5 != null) {
    /* 5등급 세대 — 9등급 칸은 석차백분율로 환산한 값입니다 */
    $('gpa5').textContent = S.cur.a5.toFixed(2);
    $('gpa5c').classList.remove('hidden');
    $('gpa5c').title = '학교 파일의 5등급 평균입니다. 9등급 칸은 석차백분율을 졸업생 곡선으로 환산한 값입니다.';
    $('gpasubs').innerHTML = `<div class="cbt">석차 → 9등급</div>
      <div class="cbv"><div><span>상위</span><b>${S.cur.pr != null ? S.cur.pr.toFixed(1) + '%' : '—'}</b></div>
      <div><span>환산</span><b>${S.cur.g[3].toFixed(2)}</b></div></div>`;
  } else if (S.cur.g[4] != null) {
    $('gpasubs').innerHTML = `<div class="cbt">국수영사과한</div><div class="cbv"><div><span>9등급</span><b>${S.cur.g[4].toFixed(2)}</b></div></div>`;
  }
  run();
}

/* ── 분석 ──────────────────────────────────────────── */

const numOf = id => { const v = parseFloat($(id).value); return isNaN(v) ? null : v; };
let selGy = -1;

let emptyDefault = null;
function showEmpty(msg) {
  $('results').classList.add('hidden');
  $('placeholder').classList.remove('hidden');
  if (emptyDefault == null) emptyDefault = $('placeholder').innerHTML;
  $('placeholder').innerHTML = msg || emptyDefault;
}

function run() {
  if (!S.index) return;
  caseClose();
  const gpa = numOf('gpa');
  if (gpa == null) return showEmpty();
  const years = S.history.meta.years;
  const opts = { gpa, topN: +$('topn').value, minYear: years[years.length - 1] + 1 - (+$('yrs').value), gy: selGy };
  const { sel, rows } = findSimilar(S.index, opts);
  if (!sel.length) return showEmpty('조건에 맞는 졸업생이 없습니다. 연도 범위나 계열 조건을 넓혀 보세요.');

  const sum = summarize(sel, rows);
  const [lo, hi] = sum.gpaRange;
  $('rtitle').textContent = S.cur ? `${S.cur.nm} · 유사 사례` : '유사 사례';
  $('rnote').textContent = `내신 ${lo.toFixed(2)}~${hi.toFixed(2)} 구간 졸업생 ${sel.length}명 기준`;
  $('stats').innerHTML = R.statBar(sel, sum);
  $('headline').innerHTML = R.headline(sum, sel, gpa, S.cur?.nm, S.cur?.a5 != null && Math.abs(gpa - S.cur.g[3]) < 0.005);
  S.cases = R.buildCases(sel, rows);
  $('p-stu').innerHTML = R.similarStudents(S.cases);
  applyCaseFilter();
  const uni = aggregateUniv(sum.su);
  $('p-univ').innerHTML = R.univTable(uni);
  $('p-track').innerHTML = R.trackTable(aggregateTrack(sum.su), sum);
  R.enableSort($('results'));
  $('c-stu').textContent = sel.length;
  $('c-univ').textContent = uni.length;
  $('placeholder').classList.add('hidden');
  $('results').classList.remove('hidden');
}

/* ── 관리자 ────────────────────────────────────────── */

function screenAdmin(status, msg) {
  cover(`<div class="cv-main">${LEFT()}
    <div>
      <div class="cv-panel">
        <div class="p-head"><span class="p-num">✓</span><h2>현재 자료</h2>
          <span class="p-tag ${status?.ok ? '' : 'err'}">${status?.ok ? '연결됨' : '연결 안 됨'}</span></div>
        <div class="p-hint">${status?.ok
          ? `${esc(status.요약 || '아직 자료가 없습니다')}<br>최종 갱신 ${esc(status.갱신 || '—')}`
          : esc(status?.error || '스프레드시트에 연결하지 못했습니다.')}</div>
      </div>
      <div class="cv-panel">
        <div class="p-head"><span class="p-num">↻</span><h2>새 자료 반영</h2></div>
        <div class="p-hint">학년도별 「수시합격현황」 파일(재학생·졸업생 시트)을 올립니다. <b>올리면 서버 자료가 통째로 바뀌므로 볼 학년도를 전부 한꺼번에</b> 고르세요 —
          한 번에 여러 파일을 골라도, 한 파일씩 차례로 골라도 됩니다. 같은 학년도를 다시 고르면 그 학년도만 바뀝니다.<br>
          이름·학번·주민등록번호는 읽지 않고, 학년도·내신·지원 내역만 보냅니다.</div>
        <div class="adm-row"><span class="n">1</span><span class="t"><b>수시합격현황 파일 올리기</b>
          <span>「○○○○학년도 수시 원서 접수 현황」 — 엑셀·한셀 저장본 모두 됩니다</span>
          <div id="a-files" class="adm-files"></div></span>
          <button class="mini" id="a-pick">파일 추가</button></div>
        <div class="adm-row"><span class="n">2</span><span class="t"><b>변환 확인</b>
          <span id="a-parsed">파일을 올리면 학년도와 건수를 확인합니다</span></span>
          <button class="mini" id="a-send" disabled>시트에 반영</button></div>
      </div>
      ${msg ? `<div class="cv-panel"><div class="p-hint" style="color:#e5ebfa">${msg}</div></div>` : ''}
    </div>
  </div>`, [['d-gold', '관리자']]);
  $('a-pick').addEventListener('click', () => $('f-history').click());
  $('a-send').addEventListener('click', sendHistory);
  renderAdminFiles();
}

/* 고른 파일이 학년도별로 쌓입니다. 같은 학년도를 다시 고르면 그 학년도만 바뀝니다. */
let histParts = [];   // [{ name, part }]
let pending = null;

function renderAdminFiles() {
  const el = $('a-files'); if (!el) return;
  el.innerHTML = histParts.map(p => `<span class="af">${esc(p.name)} <i>${p.part.sheetInfo.map(s => `${s.year} ${s.phase} ${s.rows}건`).join(' · ')}</i></span>`).join('');
}

async function pickHistory(files) {
  $('a-parsed').textContent = `${files.map(f => f.name).join(', ')} 읽는 중…`;
  try {
    for (const f of files) {
      const part = parseApps(await readBook(f), XLSX, f.name);
      if (!part.apps.length) throw new Error(`${f.name} 에서 지원 기록을 찾지 못했습니다. 「수시합격현황」 시트가 있는지 확인해 주세요.`);
      const years = new Set(part.sheetInfo.map(s => s.year));
      histParts = histParts.filter(p => !p.part.sheetInfo.some(s => years.has(s.year)));
      histParts.push({ name: f.name, part });
    }
    const data = mergeApps(histParts.map(p => p.part));
    pending = encode(data);
    const m = data.meta;
    $('a-parsed').innerHTML = `${m.years.join('·')}학년도 · 지원 <b style="color:#e5ebfa">${m.nApps.toLocaleString()}건</b> · 학생 ${m.nPersons.toLocaleString()}명`
      + (m.years.length < 2 ? ' <span class="wn">— 다른 학년도 파일도 같이 올리셔야 그 해 자료가 남습니다</span>' : '');
    $('a-send').disabled = false;
  } catch (e) {
    $('a-parsed').innerHTML = `<span style="color:#ff9c9c">읽지 못했습니다 — ${esc(e.message)}</span>`;
    $('a-send').disabled = true;
  }
  renderAdminFiles();
}

async function sendHistory() {
  if (!pending) return;
  $('a-send').disabled = true;
  try {
    const res = await api.uploadData(S.admin, pending, (i, n) => { $('a-parsed').textContent = `보내는 중 ${i}/${n}`; });
    await store.del(store.KEY_DATA);
    histParts = []; pending = null;
    screenAdmin(await api.adminStatus(S.admin).catch(() => null),
      `반영이 끝났습니다. ${esc(res.요약 || '')}<br>선생님들 화면은 다음 접속 때 자동으로 새 자료를 받습니다.`);
  } catch (e) {
    $('a-parsed').innerHTML = `<span style="color:#ff9c9c">${esc(e.message)}</span>`;
    $('a-send').disabled = false;
  }
}

/* ── 자료 불러오기 ─────────────────────────────────── */

async function loadHistory() {
  const cached = await store.get(store.KEY_DATA);
  if (cached?.enc) {
    S.history = decode(cached.enc);
    S.version = cached.version;
    fillYears();
    api.fetchVersion(S.key).then(v => { if (v.version && v.version !== S.version) refresh(); })
      .catch(() => { /* 다음 접속 때 다시 확인합니다 */ });
    return;
  }
  screenLoading('지원결과를 불러오는 중', 55);
  const res = await api.fetchData(S.key);
  S.history = decode(res.data);
  S.version = res.version;
  fillYears();
  await store.set(store.KEY_DATA, { enc: res.data, version: res.version });
}

async function refresh() {
  try {
    const res = await api.fetchData(S.key);
    await store.set(store.KEY_DATA, { enc: res.data, version: res.version });
    S.history = decode(res.data);
    S.version = res.version;
    fillYears();
    S.index = null;
    if (!$('app').classList.contains('hidden')) {
      S.index = buildIndex(S.history);
      showApp();
      toast('지원결과 자료가 새 버전으로 바뀌었습니다.');
    }
  } catch { /* 다음 접속 때 다시 시도합니다 */ }
}

/* ── 시작 ──────────────────────────────────────────── */

async function boot() {
  brand();
  const p = new URLSearchParams(location.search);
  if (p.get('admin')) {
    S.admin = p.get('admin');
    screenAdmin(await api.adminStatus(S.admin).catch(e => ({ ok: false, error: e.message })));
    return;
  }
  S.key = p.get('k') || await store.get(store.KEY_LINK);
  if (!S.key) { screenBlocked(); return; }
  if (p.get('k')) await store.set(store.KEY_LINK, S.key);
  if (!GAS_URL.includes('/exec')) { screenBlocked('config.js 에 Apps Script 주소가 아직 설정되지 않았습니다.'); return; }

  try { await loadHistory(); }
  catch (e) {
    if (e.auth) await store.del(store.KEY_LINK);
    screenBlocked(e.auth ? e.message : `자료를 받지 못했습니다 (${e.message}). 잠시 뒤 새로고침해 주세요.`);
    return;
  }

  const saved = await store.get(store.KEY_ROSTER);
  S.roster = saved?.sets ? buildRoster(saved.sets) : null;
  if (S.roster && saved.meta?.pv !== ROSTER_PV) S.roster.meta.stale = true;
  if (S.roster) {
    showApp();
    if (S.roster.meta.stale) setTimeout(() => toast('프로그램이 새로워졌습니다 — 내신 석차 파일을 다시 올려 주세요.'), 800);
  } else screenUpload();
}

/* ── 이벤트 ────────────────────────────────────────── */

function bindChips(id, cb) {
  $(id).addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    [...e.currentTarget.children].forEach(c => c.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true'); cb(b);
  });
}

function toTop(el) {
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 12;
  window.scrollTo({ top: Math.max(0, y), behavior: 'auto' });
}

function selectTab(t) {
  document.querySelectorAll('#results .tab').forEach(x => x.setAttribute('aria-selected', String(x.dataset.t === t)));
  ['stu', 'univ', 'track'].forEach(k => $('p-' + k).classList.toggle('hidden', k !== t));
}

/* ── 사례 크게 보기 ──────────────────────────────────── */

let caseAt = -1;

function caseOpen(i) {
  if (!S.cases.length) return;
  caseAt = Math.max(0, Math.min(i, S.cases.length - 1));
  casePaint();
  $('mask').classList.add('on');
  $('md-next').focus();
}

function caseClose() {
  $('mask').classList.remove('on');
  caseAt = -1;
}

function caseGo(d) {
  let n = caseAt + d;
  while (n >= 0 && n < S.cases.length && !caseVisible(n)) n += d;
  if (n < 0 || n >= S.cases.length) return;
  caseAt = n;
  casePaint();
}
const caseHasNext = d => { let n = caseAt + d; while (n >= 0 && n < S.cases.length && !caseVisible(n)) n += d; return n >= 0 && n < S.cases.length; };

function casePaint() {
  const v = R.caseView(S.cases[caseAt], caseAt, S.cases.length);
  $('md').classList.toggle('win', v.win);
  $('md-cnt').textContent = v.cnt;
  $('md-yr').textContent = v.yr;
  $('md-big').innerHTML = v.big;
  $('md-sc').innerHTML = v.chips;
  $('md-res').className = 'res' + (v.resNo ? ' no' : '');
  $('md-res').textContent = v.res;
  $('md-b').innerHTML = v.body;
  $('md-b').scrollTop = 0;
  $('md-prev').disabled = !caseHasNext(-1);
  $('md-next').disabled = !caseHasNext(1);
}

/* 결과 필터 — 유사 학생 탭. 선택은 세션 동안 유지됩니다. */
const CF = { mode: 'all', onlyOk: false };
function applyCaseFilter() {
  const p = $('p-stu');
  const bar = p.querySelector('.fbar');
  if (!bar) return;
  bar.querySelectorAll('.fc').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === CF.mode)));
  p.querySelectorAll('.stu[data-case]').forEach(c => {
    const w = c.dataset.win === '1';
    c.classList.toggle('hidden', !(CF.mode === 'all' || (CF.mode === 'ok') === w));
  });
  p.querySelector('.stugrid')?.classList.toggle('only-ok', CF.onlyOk);
  const sw = $('onlyok'); if (sw) sw.checked = CF.onlyOk;
}
const caseVisible = i => (CF.mode === 'all' || (CF.mode === 'ok') === (S.cases[i].won.length > 0));

$('p-stu').addEventListener('click', e => {
  const fc = e.target.closest('.fc[data-f]');
  if (fc) {
    CF.mode = fc.dataset.f;
    if (CF.mode === 'ok') CF.onlyOk = true;
    if (CF.mode !== 'ok') CF.onlyOk = false;
    applyCaseFilter(); return;
  }
  if (e.target.id === 'onlyok') { CF.onlyOk = e.target.checked; applyCaseFilter(); return; }
  if (e.target.closest('.sw')) return;
  const card = e.target.closest('.stu[data-case]');
  if (card) caseOpen(+card.dataset.case);
});
$('md-prev').addEventListener('click', () => caseGo(-1));
$('md-next').addEventListener('click', () => caseGo(1));
$('md-x').addEventListener('click', caseClose);
$('md-close').addEventListener('click', caseClose);
$('mask').addEventListener('click', e => { if (e.target === $('mask')) caseClose(); });
document.addEventListener('keydown', e => {
  if (!$('mask').classList.contains('on')) return;
  if (e.key === 'Escape') { caseClose(); return; }
  if (e.key === 'ArrowLeft') { e.preventDefault(); caseGo(-1); }
  if (e.key === 'ArrowRight') { e.preventDefault(); caseGo(1); }
});

$('f-roster').addEventListener('change', e => { if (e.target.files.length) loadRoster([...e.target.files]); e.target.value = ''; });
$('f-history').addEventListener('change', e => { if (e.target.files.length) pickHistory([...e.target.files]); e.target.value = ''; });

$('cls').addEventListener('change', fillStudents);
$('q').addEventListener('input', fillStudents);
$('stu').addEventListener('change', onStudentChange);
$('gpa').addEventListener('input', () => {
  const v = parseFloat($('gpa').value);
  const off = S.cur?.g?.[3] != null && !isNaN(v) && Math.abs(v - S.cur.g[3]) > 0.004;
  $('gpanote').textContent = off ? `· ${S.cur.nm} 실제 ${S.cur.g[3].toFixed(2)}${S.cur.a5 != null ? ' (환산)' : ''}` : '';
});

let timer = null;
['gpa', 'topn', 'yrs'].forEach(id =>
  $(id).addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 350); }));

bindChips('gychips', b => { selGy = +b.dataset.gy; run(); });

document.querySelectorAll('#results .tab').forEach(t => t.addEventListener('click', () => {
  selectTab(t.dataset.t); toTop(t.closest('.tabs'));
}));

$('btn-roster').addEventListener('click', () => screenUpload());
$('sb-scope').addEventListener('click', e => {
  const b = e.target.closest('[data-rdel]'); if (!b) return;
  const g = Number(b.dataset.rdel);
  if (!confirm(`${g}학년 내신 석차 명단을 이 컴퓨터에서 지웁니다. 다른 학년은 그대로 둡니다.\n계속할까요?`)) return;
  dropRosterGrade(g);
});
$('btn-wipe').addEventListener('click', async () => {
  if (!confirm('이 컴퓨터에 저장된 명단과 자료를 지웁니다.\n다음 접속 때 링크로 다시 받아옵니다.\n계속할까요?')) return;
  await store.clearAll();
  location.replace(location.pathname);
});

boot();
