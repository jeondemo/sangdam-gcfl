/* 화면 렌더링 — HTML 문자열을 만들어 돌려줍니다. */

import { isPass } from './match.js';
import { busan5to9, BUSAN_SRC, BUSAN_ASOF } from './parse.js';

/* 학급 코드는 306처럼 「학년+반」 세 자리입니다. 화면에는 「3학년 6반」으로 풉니다. */
export const clsLabel = c => (c >= 100 ? `${Math.floor(c / 100)}학년 ${c % 100}반` : `${c}반`);

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const pct1 = (a, b) => (b ? ((a / b) * 100).toFixed(1) : '0.0');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const f2 = v => (v == null ? '—' : v.toFixed(2));

const resTag = a => {
  if (a.res === '합격') return '<span class="tag t-ok">합격</span>';
  if (a.res === '추합') return '<span class="tag t-wait">추합</span>';
  if (a.res === '불합') return '<span class="tag t-no">불합</span>';
  return '<span class="tag t-none">결과 없음</span>';
};

const minTag = a => {
  if (a.min === '미충족') return '<span class="tag t-min">최저미달</span>';
  if (a.min === '충족') return '<span class="tag t-minok">최저충족</span>';
  return '';
};

/* 1차 결과가 따로 적힌 해가 있습니다(서류 1차). 1차에서 떨어진 것과 면접·최종에서 떨어진 것을 구분해 보여 줍니다. */
const firstTag = a => (a.first === '1차불합' ? '<span class="tag t-first">1차</span>' : '');

/* 예비번호는 호명 여부와 상관없이 결과 배지 앞에 둡니다.
   그래야 「예비43 추합」과 「예비12 불합」이 같은 자리에서 비교됩니다. */
const waitTag = a => (a.wait ? `<span class="tag t-cand">예비${esc(a.wait)}</span>`
  : (a.res === '추합' ? '<span class="tag t-cand dim" title="원본 자료의 예비번호 칸이 비어 있습니다">예비 미기재</span>' : ''));

const appRow = a => `<div class="app${isPass({ a }) ? ' pass' : ''}">
  <span class="tk">${esc(a.track || '')}</span>
  <span class="nm"><span class="un">${esc(a.univ)}</span><span class="dp">${esc(a.dept || '')}${a.type ? ` <i class="ty">${esc(a.type)}</i>` : ''}</span></span>
  <span class="rt">${minTag(a)}${firstTag(a)}${waitTag(a)}${resTag(a)}</span></div>`;

/* 크게 보기 창 안의 한 줄. 목록보다 글자를 키웁니다. */
const bigRow = a => `<div class="md-r">
  <span class="tk">${esc(a.track || '')}</span>
  <span class="nm"><span class="un">${esc(a.univ)}</span><div class="dp">${esc(a.dept || '')}${a.type ? ` · ${esc(a.type)}` : ''}</div></span>
  <span class="rt">${minTag(a)}${firstTag(a)}${waitTag(a)}${resTag(a)}</span></div>`;

/* ── 학생 카드 (좌측) ────────────────────────────────── */

/* 5등급 세대(2025년 입학 이후)는 학교 기준인 5등급을 크게, 9등급 환산을 괄호로.
   9등급 세대는 9등급만. 석차와 석차백분율은 파일에 적힌 그대로입니다. */
export function studentCard(st, total, meta) {
  const five = !!(meta?.has5 && st.g5);
  const vals = five ? st.g5 : st.g;
  const cell = (lab, i, cls = '') => {
    const v = vals[i];
    const sub = five && i === 3 && st.g[3] != null ? `<small>(${st.g[3].toFixed(2)})</small>` : '';
    return `<div class="${cls}"><span>${lab}</span><b>${f2(v)}</b>${sub}</div>`;
  };
  const bs = five ? busan5to9(st.a5) : null;
  const scale = five
    ? `<div class="fine">5등급 기준 · 괄호는 9등급 환산 <span class="wn" title="이 학교 졸업생의 석차백분율 → 9등급 평균 곡선으로 환산한 값입니다">(석차 기준)</span></div>
      <div class="cv9"><span class="k">9등급<br><span class="sp">환산</span></span>
        <span class="v"><i>외고 졸업생 기준</i><b>${f2(st.g[3])}</b></span>
        <span class="v bs" title="${esc(BUSAN_SRC)}"><i>일반고 기준(부산)</i><i class="asof">${esc(BUSAN_ASOF)}</i><b>${f2(bs)}</b></span></div>`
    : '';
  const d = (vals[2] != null && vals[0] != null) ? vals[2] - vals[0] : (vals[1] != null && vals[0] != null ? vals[1] - vals[0] : null);
  const tol = five ? 0.1 : 0.15;
  const trend = d == null ? ''
    : d < -tol ? `<span class="up">1학년 대비 ${Math.abs(d).toFixed(2)} 상승</span>`
      : d > tol ? `<span class="down">1학년 대비 ${d.toFixed(2)} 하락</span>`
        : '1학년 대비 큰 변화 없음';
  const rank = st.r != null ? `${st.r}위 / ${total}명` : '';
  const prk = st.pr != null ? `상위 ${st.pr.toFixed(1)}%` : '';
  return `<div class="who">${esc(st.nm)}<small>${esc(clsLabel(st.c))} ${st.no}번${st.dept ? ` · ${esc(st.dept)}` : ''}</small></div>
    <div class="rk">${[rank, prk, trend].filter(Boolean).join(' · ')}</div>
    <div class="trend${five ? ' five' : ''}">
      ${[0, 1, 2].map(i => cell(`${i + 1}학년`, i)).join('')}
      ${cell('전학년', 3, 'cur')}
    </div>${scale}`;
}

/* ── 요약 ────────────────────────────────────────────── */

export function statBar(sel, sum) {
  const [lo, hi] = sum.gpaRange;
  return `
  <div class="stat"><b>${sel.length}명</b><i>유사 학생 · 내신 ${lo.toFixed(2)}~${hi.toFixed(2)}</i></div>
  <div class="stat"><b>${sum.su.length}건</b><i>수시 지원 (1인 평균 ${sum.cardsPerStudent.toFixed(1)}장)</i></div>
  <div class="stat"><b class="ok">${pct1(sum.nSuPass, sum.su.length)}%</b><i>건별 합격률 (${sum.nSuPass}건)</i></div>
  <div class="stat"><b class="brand">${pct(sum.stuSuPass.size, sum.stuSu.size)}%</b><i>1개 이상 합격 (${sum.stuSuPass.size}/${sum.stuSu.size}명)</i></div>`;
}

export function headline(sum, sel, gpa, studentName, est, bs) {
  const ns = sum.nonsul;
  let warn = false;
  let s = (studentName ? `<span class="who-tag">${esc(studentName)}</span>` : '')
    + `내신 <b>${gpa.toFixed(2)}</b>${est ? ` <span class="wn">(9등급 환산${bs != null ? ` · 일반고 기준 ${bs.toFixed(2)}` : ''})</span>` : ''} 근처 졸업생 ${sel.length}명 기준입니다. `
    + `수시 카드 ${sum.su.length}장 중 ${sum.nSuPass}장이 합격으로 이어졌고, `
    + `<b>${sum.stuSuPass.size}명(${pct(sum.stuSuPass.size, sum.stuSu.size)}%)</b>이 최소 한 곳에 붙었습니다.`;
  if (ns.n) {
    s += ` 논술은 ${ns.n}장 중 ${ns.pass}장 합격(${pct1(ns.pass, ns.n)}%)`;
    if (ns.miss) {
      s += `이고, 그중 <b class="warn">${ns.miss}장(${pct(ns.miss, ns.n)}%)은 수능최저 미충족</b>으로 사실상 버려진 카드였습니다.`;
      warn = true;
    } else s += '입니다.';
  }
  return `<div class="note${warn ? ' warn' : ''}">${s}</div>`;
}

/* ── 탭 본문 ─────────────────────────────────────────── */

/* 유사 학생 한 명 = 사례 한 건. 목록과 「크게 보기」 창이 같은 배열을 씁니다. */
export function buildCases(sel, rows) {
  const out = [];
  for (const s of sel) {
    const mine = rows.filter(r => r.s.p.pk === s.p.pk);
    if (!mine.length) continue;
    out.push({ p: s.p, su: mine.map(r => r.a), won: mine.filter(isPass).map(r => r.a) });
  }
  return out;
}

const outTag = c => (c.won.length
  ? `<span class="out t-ok">${esc(c.won[0].univ)}${c.won.length > 1 ? ` 外 ${c.won.length - 1}` : ''}</span>`
  : '<span class="out t-no">전체 불합</span>');

const ZOOM = '<span class="zoom">크게 보기</span>';

/* 졸업생(재수생) 사례는 표시해 둡니다 — 재학생 실적과 섞여 읽히지 않게. */
const reTag = c => (/\/G\//.test(c.p.pk) ? '<span class="re" title="졸업생(재수) 지원">재수</span>' : '');

/* 결과 필터 줄 — 탭 아래, 첫 카드 위. 학생 단위로 「합격 있음 / 전부 불합」을 거르고,
   「합격 줄만 보기」는 카드 안의 불합 줄을 접습니다. 실제 걸러내기는 main.js 가 상태를 들고 합니다. */
export function caseFilterBar(cases) {
  const ok = cases.filter(c => c.won.length).length;
  return `<div class="fbar"><span class="fl">결과</span>
    <button class="fc" data-f="all" aria-pressed="true">전체<span class="c">${cases.length}</span></button>
    <button class="fc ok" data-f="ok">합격 있음<span class="c">${ok}</span></button>
    <button class="fc no" data-f="no">전부 불합<span class="c">${cases.length - ok}</span></button>
    <label class="sw"><input type="checkbox" id="onlyok"> 카드 안에서 합격 줄만 보기</label></div>`;
}

export function similarStudents(cases) {
  const html = cases.map((c, i) => `<div class="stu${c.won.length ? ' win' : ''}" data-case="${i}" data-win="${c.won.length ? 1 : 0}">
    <div class="stu-h"><span class="idx">${i + 1}</span><span class="yr">${c.p.y}</span>${reTag(c)}
      <span class="gpa">내신 ${f2(c.p.g[3])}</span>
      <span class="csat">${[0, 1, 2].map(k => f2(c.p.g[k])).join(' · ')}</span>${outTag(c)}${ZOOM}</div>
    ${c.su.map(appRow).join('')}
  </div>`).join('');
  return html ? caseFilterBar(cases) + `<div class="stugrid">${html}</div>` : '<div class="empty">표시할 지원 기록이 없습니다.</div>';
}

export function univTable(list) {
  if (!list.length) return '<div class="empty">집계할 수시 기록이 없습니다.</div>';
  return `<div class="note">유사 학생들이 실제로 지원한 대학·전형입니다. <b>합격 열에 숫자가 있는 행</b>이 이 성적대에서 실제로 뚫린 조합입니다. 열 제목을 누르면 정렬되고, <b>대학 이름을 누르면 그 대학 합격생 전체</b>를 봅니다.</div>
  <div class="tbl-wrap"><table data-sortable>
  <thead><tr><th>대학</th><th>전형</th><th class="n">지원</th><th class="n">합격</th><th class="n">합격률</th><th class="n">합격자 내신</th><th class="n">최저미달</th></tr></thead>
  <tbody>${list.map(o => `<tr>
    <td><button class="ulink" data-univ="${esc(o.univ)}" title="이 대학의 합격생 전체 보기">${esc(o.univ)}</button></td><td class="mut">${esc(o.track || '')}</td>
    <td class="n">${o.n}</td>
    <td class="n ${o.h ? 'ok' : 'mut'}" data-v="${o.h}"><b>${o.h}</b></td>
    <td class="n" data-v="${o.n ? o.h / o.n : 0}">${pct(o.h, o.n)}%</td>
    <td class="n mut" data-v="${o.gs.length ? Math.min(...o.gs) : 99}">${o.gs.length ? `${Math.min(...o.gs).toFixed(2)} ~ ${Math.max(...o.gs).toFixed(2)}` : '—'}</td>
    <td class="n ${o.miss ? 'warn' : 'mut'}" data-v="${o.miss}">${o.miss || '—'}</td>
  </tr>`).join('')}</tbody></table></div>`;
}

export function trackTable(list, sum) {
  if (!list.length) return '<div class="empty">집계할 기록이 없습니다.</div>';
  const maxN = Math.max(1, ...list.map(o => o.n));
  const totN = sum.su.length || 1, totH = sum.nSuPass || 1;
  return `<div class="note">같은 성적대 학생들이 <b>어디에 카드를 썼고, 어디서 실제로 붙었는지</b>를 비교합니다. 지원 비중이 합격 비중보다 훨씬 큰 전형이 카드가 새는 곳입니다.
    <span class="fine">전형 이름은 대학마다 달라(네오르네상스·다빈치·KU자기추천 …) 이름을 보고 갈래로 묶었습니다. 원래 이름은 유사 학생 카드에 나옵니다.</span></div>
  <div class="tbl-wrap"><table data-sortable>
  <thead><tr><th>전형</th><th class="n">지원</th><th class="n">지원 비중</th><th class="n">합격</th><th class="n">합격 비중</th><th class="n">합격률</th><th class="n">최저미달</th></tr></thead>
  <tbody>${list.map(o => `<tr>
    <td><span class="bar" style="width:${Math.round((o.n / maxN) * 54)}px"></span><b>${esc(o.track)}</b></td>
    <td class="n">${o.n}</td>
    <td class="n mut">${pct(o.n, totN)}%</td>
    <td class="n ${o.h ? 'ok' : 'mut'}" data-v="${o.h}"><b>${o.h}</b></td>
    <td class="n mut">${sum.nSuPass ? pct(o.h, totH) : 0}%</td>
    <td class="n" data-v="${o.h / o.n}">${pct(o.h, o.n)}%</td>
    <td class="n ${o.miss ? 'warn' : 'mut'}" data-v="${o.miss}">${o.miss || '—'}</td>
  </tr>`).join('')}</tbody></table></div>`;
}

/* ── 표 정렬 ─────────────────────────────────────────── */

export function enableSort(root) {
  root.querySelectorAll('table[data-sortable]').forEach(tbl => {
    tbl.querySelectorAll('th').forEach((th, i) => {
      th.addEventListener('click', () => {
        const dir = th.dataset.dir === 'desc' ? 'asc' : 'desc';
        tbl.querySelectorAll('th').forEach(x => delete x.dataset.dir);
        th.dataset.dir = dir;
        const body = tbl.tBodies[0];
        [...body.rows].sort((x, y) => {
          const a = x.cells[i].dataset.v ?? x.cells[i].textContent;
          const b = y.cells[i].dataset.v ?? y.cells[i].textContent;
          const na = parseFloat(a), nb = parseFloat(b);
          const r = (!isNaN(na) && !isNaN(nb)) ? na - nb : String(a).localeCompare(String(b), 'ko');
          return dir === 'asc' ? r : -r;
        }).forEach(row => body.appendChild(row));
      });
    });
  });
}

/* ── 사례 크게 보기 ─────────────────────────────────── */

export function caseView(c, i, n) {
  const big = `내신 ${f2(c.p.g[3])}<small>${/\/G\//.test(c.p.pk) ? '졸업생(재수) 지원' : '재학생 지원'}</small>`;
  const chips = [[0, '1학년'], [1, '2학년'], [2, '3학년']].map(([k, t]) => `<span>${t} ${f2(c.p.g[k])}</span>`).join('')
    + (c.p.g[4] != null ? `<span>국수영사과한 ${f2(c.p.g[4])}</span>` : '');
  const res = c.won.length
    ? `합격 ${c.won.length}건 — ${c.won.map(a => esc(a.univ) + (a.dept ? ' ' + esc(a.dept) : '')).join(', ')}`
    : '합격 없음 — 전체 불합';
  return {
    win: c.won.length > 0,
    cnt: `${i + 1} / ${n}`,
    yr: `${c.p.y}학년도`,
    big, chips,
    res, resNo: !c.won.length,
    body: `<div class="md-g">수시 ${c.su.length}장</div>` + c.su.map(bigRow).join(''),
  };
}

/* ── 대학별 합격생 ───────────────────────────────────────
   한 대학의 지원·합격 기록을 내신(9등급 전학년) 좋은 순으로 늘어놓습니다.
   자료에 이름·학번이 없으므로 한 줄은 「학년도 · 내신 · 전형 · 모집단위 · 결과」입니다. */

const median = v => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const isRe = a => /\/G\//.test(a.pk);

/* 칩에는 흔히 부르는 짧은 이름으로 — 서울대학교 → 서울대, 한국외국어대학교 → 한국외대, 이화여자대학교 → 이화여대 */
export const shortUniv = u => String(u || '').replace(/대학교$/, '대').replace(/^한국외국어대$/, '한국외대').replace(/여자대$/, '여대');

/* 검색 제안 칩 */
export function univSuggest(list, picked) {
  if (!list.length) return '<span class="none">맞는 대학이 없습니다. 이름을 줄여서(예: 「외대」「시립대」) 찾아보세요.</span>';
  return list.map(o => `<button class="uchip" data-univ="${esc(o.univ)}" aria-pressed="${o.univ === picked}" title="${esc(o.univ)}">${esc(shortUniv(o.univ))}<span class="c${o.h ? '' : ' z'}">합격 ${o.h}</span></button>`).join('');
}

/* 캠퍼스 고르기 — 캠퍼스가 둘 이상인 대학만. 본교 → 분교 → 전체 순 */
function campBar(cp) {
  if (!cp || (cp.camps || []).length < 2) return '';
  const lab = c => (c.label ? `${c.label} 캠퍼스` : '본교');
  const btn = (v, label, h, n) => `<button class="camp" data-camp="${esc(v)}" aria-pressed="${cp.cur === v}">
    <b>${esc(label)}</b><span>합격 <em>${h}</em> · 지원 ${n}</span></button>`;
  return `<div class="campbar"><span class="fl">캠퍼스</span>
    ${cp.camps.map(c => btn(c.name, lab(c), c.h, c.n)).join('')}
    ${btn('all', '전체 캠퍼스', cp.total?.h ?? 0, cp.total?.n ?? 0)}</div>`;
}

export function univPage(univ, all, pmap, f, me, cp) {
  const showCamp = cp?.cur === 'all' && (cp.camps || []).length > 1;
  const campTag = a => { const m = String(a.univ).match(/\(([^()]*)\)$/); return showCamp ? `<span class="cp${m ? '' : ' main'}">${esc(m ? m[1] : '본교')}</span>` : ''; };
  const pass = all.filter(a => isPass({ a }));
  const people = new Set(all.map(a => a.pk)), passPeople = new Set(pass.map(a => a.pk));
  const gOf = a => pmap.get(a.pk)?.g || [];
  const pg = [...new Set(pass.map(a => a.pk))].map(pk => pmap.get(pk)?.g?.[3]).filter(v => v != null);
  const years = [...new Set(all.map(a => a.y))].sort();
  const tracks = [...new Set(all.map(a => a.track))];

  /* 전형 갈래별 요약 — 지원·합격·합격자 내신 범위 */
  const tsum = tracks.map(t => {
    const rows = all.filter(a => a.track === t), ps = rows.filter(a => isPass({ a }));
    const gs = ps.map(a => gOf(a)[3]).filter(v => v != null);
    return { t, n: rows.length, h: ps.length, lo: gs.length ? Math.min(...gs) : null, hi: gs.length ? Math.max(...gs) : null };
  }).sort((a, b) => b.h - a.h || b.n - a.n);

  /* 걸러진 줄 */
  let rows = all.filter(a => (f.res === 'all' || isPass({ a })) && (f.tr === 'all' || a.track === f.tr) && (f.yr === 'all' || a.y === +f.yr));
  rows = rows.map(a => ({ a, g: gOf(a) })).sort((x, y) => (x.g[3] ?? 99) - (y.g[3] ?? 99) || y.a.y - x.a.y);

  const chip = (k, v, label, n) => `<button class="chip" data-uf="${k}" data-v="${esc(v)}" aria-pressed="${String(f[k]) === String(v)}">${esc(label)}${n != null ? `<small>${n}</small>` : ''}</button>`;
  const cnt = (pred) => all.filter(a => (f.res === 'all' || isPass({ a })) && pred(a)).length;

  const stats = `<div class="stats">
    <div class="stat"><b>${passPeople.size}명</b><i>합격자 (${pass.length}건 · 추합 ${pass.filter(a => a.res === '추합').length})</i></div>
    <div class="stat"><b>${all.length}건</b><i>지원 (${people.size}명)</i></div>
    <div class="stat"><b class="ok">${all.length ? ((pass.length / all.length) * 100).toFixed(1) : '0.0'}%</b><i>건별 합격률</i></div>
    <div class="stat"><b class="brand">${pg.length ? `${Math.min(...pg).toFixed(2)} ~ ${Math.max(...pg).toFixed(2)}` : '—'}</b><i>합격자 내신 · 가운데 ${pg.length ? median(pg).toFixed(2) : '—'}</i></div>
  </div>`;

  const tbl = `<div class="tbl-wrap"><table class="utbl">
    <thead><tr><th>갈래</th><th class="n">지원</th><th class="n">합격</th><th class="n">합격률</th><th class="n">합격자 내신</th></tr></thead>
    <tbody>${tsum.map(o => `<tr><td><b>${esc(o.t)}</b></td><td class="n">${o.n}</td><td class="n ${o.h ? 'ok' : 'mut'}"><b>${o.h}</b></td>
      <td class="n">${o.n ? Math.round((o.h / o.n) * 100) : 0}%</td><td class="n mut">${o.lo != null ? `${o.lo.toFixed(2)} ~ ${o.hi.toFixed(2)}` : '—'}</td></tr>`).join('')}</tbody></table></div>`;

  const tools = `<div class="utools">
    <div class="ug"><span class="fl">결과</span><div class="chips">${chip('res', 'pass', '합격·추합만')}${chip('res', 'all', '전체 지원')}</div></div>
    <div class="ug"><span class="fl">전형</span><div class="chips">${chip('tr', 'all', '전체', cnt(() => true))}${tsum.map(o => chip('tr', o.t, o.t, cnt(a => a.track === o.t))).join('')}</div></div>
    <div class="ug"><span class="fl">학년도</span><div class="chips">${chip('yr', 'all', '전체')}${years.map(y => chip('yr', y, `${y}`, cnt(a => a.y === y))).join('')}</div></div>
  </div>`;

  /* 상담 중인 학생이 있으면 그 내신 자리에 표시 줄을 끼웁니다 */
  let meAt = -1;
  if (me?.g != null) { meAt = rows.findIndex(r => (r.g[3] ?? 99) > me.g); if (meAt < 0) meAt = rows.length; }
  const meRow = me?.g != null ? `<tr class="me"><td class="n">▶</td><td class="n"><b>${me.g.toFixed(2)}</b></td><td colspan="6">${esc(me.nm || '상담 중인 학생')}${me.est ? ' <span class="wn">(9등급 환산)</span>' : ''} — 이 학생의 내신 자리입니다</td></tr>` : '';
  const body = rows.map((r, i) => `<tr class="${isPass(r) ? 'pass' : 'fail'}">
      <td class="n mut">${i + 1}</td>
      <td class="n"><b>${f2(r.g[3])}</b></td>
      <td class="n mut nw">${[0, 1, 2].map(k => f2(r.g[k])).join(' · ')}</td>
      <td class="nw">${r.a.y}${isRe(r.a) ? ' <span class="re">재수</span>' : ''}</td>
      <td class="ty"><span class="tb">${esc(r.a.track)}</span>${esc(r.a.type || '')}</td>
      <td>${campTag(r.a)}${esc(r.a.dept || '')}</td>
      <td class="rt nw">${minTag(r.a)}${firstTag(r.a)}${waitTag(r.a)}${resTag(r.a)}</td>
    </tr>`);
  if (meAt >= 0) body.splice(meAt, 0, meRow);

  const list = rows.length
    ? `<div class="tbl-wrap"><table class="ulist">
      <thead><tr><th class="n">#</th><th class="n">내신 ▲</th><th class="n">1·2·3학년</th><th>학년도</th><th>전형</th><th>모집단위</th><th class="rt">결과</th></tr></thead>
      <tbody>${body.join('')}</tbody></table></div>`
    : '<div class="empty">조건에 맞는 기록이 없습니다.</div>';

  const where = cp?.cur && cp.cur !== 'all' && (cp.camps || []).length > 1 ? (/\(/.test(cp.cur) ? `${esc(cp.cur.match(/\(([^()]*)\)$/)[1])} 캠퍼스` : '본교') : '';
  return `${campBar(cp)}${stats}
    <div class="note">${esc(univ)}${where ? ` ${where}` : ''}에 <b>${years.join('·')}학년도</b> 동안 ${people.size}명이 ${all.length}장을 썼고, <b>${passPeople.size}명</b>이 붙었습니다.
      아래 목록은 <b>내신(9등급 전학년)이 좋은 순</b>입니다. 이름은 자료에 없습니다.</div>
    <div class="usec"><h3>전형 갈래별</h3>${tbl}</div>
    <div class="usec"><h3>${f.res === 'all' ? '지원' : '합격'} 목록 <span class="snote">${rows.length}건</span></h3>${tools}${list}</div>`;
}

/* ── 학과별 · 내신별 합격생 ─────────────────────────────────
   한 묶음(외고 학과 하나, 또는 내신 구간 하나)의 지원 기록을 대학별 표와 내신순 목록으로 보여 줍니다.
   o = { note, rank(univ)→숫자, haks?(학과 거르기 칩), univMore } */
const baseU = u => String(u || '').replace(/\s*\(.*\)$/, '');

/* 내신 좋은 순 목록 — 학과별·내신별·전공별 화면이 같이 씁니다. hkOf 를 주면 줄마다 외고 학과를 붙입니다. */
function poolList(rows, me, hkOf) {
  let meAt = -1;
  if (me?.g != null) { meAt = rows.findIndex(r => (r.g[3] ?? 99) > me.g); if (meAt < 0) meAt = rows.length; }
  const meRow = me?.g != null ? `<tr class="me"><td class="n">▶</td><td class="n"><b>${me.g.toFixed(2)}</b></td><td colspan="7">${esc(me.nm || '상담 중인 학생')}${me.est ? ' <span class="wn">(9등급 환산)</span>' : ''} — 이 학생의 내신 자리입니다</td></tr>` : '';
  const LIMIT = 300;
  const body = rows.slice(0, LIMIT).map((r, i) => `<tr class="${isPass(r) ? 'pass' : 'fail'}">
      <td class="n mut">${i + 1}</td>
      <td class="n"><b>${f2(r.g[3])}</b></td>
      <td class="nw">${r.a.y}${isRe(r.a) ? ' <span class="re">재수</span>' : ''}${hkOf && hkOf(r.a) ? ` <span class="hk">${esc(hkOf(r.a))}</span>` : ''}</td>
      <td class="nw"><button class="ulink" data-univ="${esc(r.a.univ)}">${esc(shortUniv(baseU(r.a.univ)))}${/\(/.test(r.a.univ) ? `<span class="cp">${esc(r.a.univ.match(/\(([^()]*)\)$/)[1])}</span>` : ''}</button></td>
      <td class="ty"><span class="tb">${esc(r.a.track)}</span>${esc(r.a.type || '')}</td>
      <td>${esc(r.a.dept || '')}</td>
      <td class="rt nw">${minTag(r.a)}${firstTag(r.a)}${waitTag(r.a)}${resTag(r.a)}</td>
    </tr>`);
  if (meAt >= 0 && meAt <= LIMIT) body.splice(meAt, 0, meRow);
  return rows.length
    ? `<div class="tbl-wrap"><table class="ulist plist">
      <thead><tr><th class="n">#</th><th class="n">내신 ▲</th><th>학년도</th><th>대학</th><th>전형</th><th>모집단위</th><th class="rt">결과</th></tr></thead>
      <tbody>${body.join('')}</tbody></table></div>${rows.length > LIMIT ? `<div class="fine" style="margin-top:6px">내신 좋은 순으로 ${LIMIT}건까지 보여 줍니다. 전형·학년도로 좁혀 보세요.</div>` : ''}`
    : '<div class="empty">조건에 맞는 기록이 없습니다.</div>';
}

export function poolPage(all, pmap, f, me, o) {
  const gOf = a => pmap.get(a.pk)?.g || [];
  const hkOf = a => pmap.get(a.pk)?.hk || null;
  const inHak = a => !f.hk || f.hk === 'all' || hkOf(a) === f.hk;
  const scope = all.filter(inHak);
  const pass = scope.filter(a => isPass({ a }));
  const people = new Set(scope.map(a => a.pk)), passPeople = new Set(pass.map(a => a.pk));
  const pg = [...passPeople].map(pk => pmap.get(pk)?.g?.[3]).filter(v => v != null);
  const years = [...new Set(scope.map(a => a.y))].sort();
  const tracks = [...new Set(scope.map(a => a.track))];

  /* 대학별 — 캠퍼스를 묶은 대학 단위, 선호도 순 */
  const um = new Map();
  for (const a of scope) {
    const u = baseU(a.univ);
    if (!um.has(u)) um.set(u, { u, n: 0, h: 0, gs: [] });
    const x = um.get(u); x.n++;
    if (isPass({ a })) { x.h++; const g = gOf(a)[3]; if (g != null) x.gs.push(g); }
  }
  const ulist = [...um.values()].filter(x => x.h > 0).sort((a, b) => o.rank(a.u) - o.rank(b.u) || b.h - a.h);
  const SHOW = 15, shown = o.univMore ? ulist : ulist.slice(0, SHOW);
  const utbl = ulist.length ? `<div class="tbl-wrap"><table class="utbl">
    <thead><tr><th>대학</th><th class="n">지원</th><th class="n">합격</th><th class="n">합격률</th><th class="n">합격자 내신</th></tr></thead>
    <tbody>${shown.map(x => `<tr><td><button class="ulink" data-univ="${esc(x.u)}" title="${esc(x.u)} 합격생 전체 보기">${esc(shortUniv(x.u))}</button></td>
      <td class="n">${x.n}</td><td class="n ok"><b>${x.h}</b></td><td class="n">${Math.round((x.h / x.n) * 100)}%</td>
      <td class="n mut">${x.gs.length ? `${Math.min(...x.gs).toFixed(2)} ~ ${Math.max(...x.gs).toFixed(2)}` : '—'}</td></tr>`).join('')}</tbody></table></div>
    ${ulist.length > SHOW ? `<button class="more2" data-umore="1">${o.univMore ? '접기' : `합격 대학 ${ulist.length}곳 모두 보기`}</button>` : ''}`
    : '<div class="empty">합격 기록이 없습니다.</div>';

  let rows = scope.filter(a => (f.res === 'all' || isPass({ a })) && (f.tr === 'all' || a.track === f.tr) && (f.yr === 'all' || a.y === +f.yr));
  rows = rows.map(a => ({ a, g: gOf(a) })).sort((x, y) => (x.g[3] ?? 99) - (y.g[3] ?? 99) || o.rank(baseU(x.a.univ)) - o.rank(baseU(y.a.univ)));

  const chip = (k, v, label, n) => `<button class="chip" data-pf="${k}" data-v="${esc(v)}" aria-pressed="${String(f[k] ?? 'all') === String(v)}">${esc(label)}${n != null ? `<small>${n}</small>` : ''}</button>`;
  const cnt = pred => scope.filter(a => (f.res === 'all' || isPass({ a })) && pred(a)).length;
  const cntAll = pred => all.filter(a => (f.res === 'all' || isPass({ a })) && pred(a)).length;

  const stats = `<div class="stats">
    <div class="stat"><b>${passPeople.size}명</b><i>합격자 (${pass.length}건 · 추합 ${pass.filter(a => a.res === '추합').length})</i></div>
    <div class="stat"><b>${scope.length}건</b><i>지원 (${people.size}명)</i></div>
    <div class="stat"><b class="ok">${scope.length ? ((pass.length / scope.length) * 100).toFixed(1) : '0.0'}%</b><i>건별 합격률</i></div>
    <div class="stat"><b class="brand">${pg.length ? `${Math.min(...pg).toFixed(2)} ~ ${Math.max(...pg).toFixed(2)}` : '—'}</b><i>합격자 내신 · 가운데 ${pg.length ? median(pg).toFixed(2) : '—'}</i></div>
  </div>`;

  const tools = `<div class="utools">
    ${o.haks ? `<div class="ug"><span class="fl">학과</span><div class="chips">${chip('hk', 'all', '전체', cntAll(() => true))}${o.haks.map(h => chip('hk', h, h, cntAll(a => hkOf(a) === h))).join('')}</div></div>` : ''}
    <div class="ug"><span class="fl">결과</span><div class="chips">${chip('res', 'pass', '합격·추합만')}${chip('res', 'all', '전체 지원')}</div></div>
    <div class="ug"><span class="fl">전형</span><div class="chips">${chip('tr', 'all', '전체', cnt(() => true))}${tracks.map(t => chip('tr', t, t, cnt(a => a.track === t))).join('')}</div></div>
    <div class="ug"><span class="fl">학년도</span><div class="chips">${chip('yr', 'all', '전체')}${years.map(y => chip('yr', y, `${y}`, cnt(a => a.y === y))).join('')}</div></div>
  </div>`;

  const list = poolList(rows, me, o.haks && (!f.hk || f.hk === 'all') ? hkOf : null);

  return `${stats}
    <div class="note">${o.note} <b>${years.join('·')}학년도</b> 동안 ${people.size}명이 ${scope.length}장을 썼고 <b>${passPeople.size}명</b>이 붙었습니다. 대학 이름을 누르면 그 대학 합격생 전체를 봅니다.</div>
    <div class="usec"><h3>합격 대학 <span class="snote">주요대학 순</span></h3>${utbl}</div>
    <div class="usec"><h3>${f.res === 'all' ? '지원' : '합격'} 목록 <span class="snote">${rows.length}건 · 내신 좋은 순</span></h3>${tools}${list}</div>`;
}

/* 전공별 합격생 — 모집단위 이름에 찾는 말이 든 지원 기록을 대학별로 모읍니다.
   「내 내신으로 어느 대학 ○○학과까지 붙은 사례가 있나」를 보는 화면이라, 대학마다 합격·불합 내신을 한 줄 띠로 찍고
   상담 중인 학생 자리를 세로줄로 긋습니다. 전형·학년도 거르기는 요약·표·목록 모두에 먹습니다. */
export function majorPage(all, pmap, f, me, o) {
  const g4 = a => pmap.get(a.pk)?.g?.[3] ?? null;
  const hkOf = o.showHk ? (a => pmap.get(a.pk)?.hk || null) : null;
  const years = [...new Set(all.map(a => a.y))].sort();
  const tracks = [...new Set(all.map(a => a.track))];
  const scope = all.filter(a => (f.tr === 'all' || a.track === f.tr) && (f.yr === 'all' || a.y === +f.yr));
  const pass = scope.filter(a => isPass({ a }));
  const people = new Set(scope.map(a => a.pk)), passPeople = new Set(pass.map(a => a.pk));
  const pg = pass.map(g4).filter(v => v != null);
  const has = me?.g != null;
  const under = x => x.gs.filter(g => g >= me.g - 1e-9).length;   /* 이 학생과 같거나 낮은 내신으로 붙은 건수 */

  /* 띠의 눈금 — 이 전공 지원자 내신 전체(와 이 학생)가 들어가도록 정수로 */
  const gsAll = scope.map(g4).filter(v => v != null);
  if (has) gsAll.push(me.g);
  const lo = gsAll.length ? Math.max(1, Math.floor(Math.min(...gsAll))) : 1;
  const hi = gsAll.length ? Math.min(9, Math.max(lo + 1, Math.ceil(Math.max(...gsAll)))) : 9;
  const pos = g => (((g - lo) / (hi - lo)) * 100).toFixed(1);

  const um = new Map();
  for (const a of scope) {
    const u = baseU(a.univ);
    if (!um.has(u)) um.set(u, { u, n: 0, h: 0, gs: [], pts: [], names: new Map() });
    const x = um.get(u), g = g4(a), ok = isPass({ a });
    x.n++; if (a.dept) x.names.set(a.dept, (x.names.get(a.dept) || 0) + 1);
    if (ok) { x.h++; if (g != null) x.gs.push(g); }
    if (g != null) x.pts.push({ g, ok, a });
  }
  const ulist = [...um.values()].sort((a, b) => (b.h > 0) - (a.h > 0) || o.rank(a.u) - o.rank(b.u) || b.h - a.h || b.n - a.n);
  const withPass = ulist.filter(x => x.h > 0).length;
  const SHOW = 15, shown = o.univMore ? ulist : ulist.slice(0, SHOW);
  const can = has ? ulist.filter(x => under(x) > 0) : [];

  const strip = x => `<div class="mstrip">${[...x.pts].sort((p, q) => p.ok - q.ok).map(p =>
    `<i class="${p.ok ? 'ok' : 'no'}" style="left:${pos(p.g)}%" title="${p.a.y} · 내신 ${p.g.toFixed(2)} · ${esc(p.a.track)} · ${esc(p.a.dept || '')} · ${esc(p.a.res || '결과 없음')}"></i>`).join('')}${
    has ? `<u style="left:${pos(me.g)}%" title="${esc(me.nm || '이 학생')} ${me.g.toFixed(2)}"></u>` : ''}</div>`;
  const names = x => {
    const ns = [...x.names.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
    return esc(ns.slice(0, 2).join(' · ')) + (ns.length > 2 ? ` <span class="mut">외 ${ns.length - 2}</span>` : '');
  };
  const meCell = x => {
    if (!has) return '';
    if (!x.h) return '<td class="mj"><span class="mut">합격 없음</span></td>';
    const c = under(x), worst = Math.max(...x.gs);
    return c ? `<td class="mj"><span class="mjok">같거나 낮은 내신 합격 <b>${c}</b>건</span></td>`
      : `<td class="mj"><span class="mjno">가장 낮은 합격 ${worst.toFixed(2)} · 차이 ${(me.g - worst).toFixed(2)}</span></td>`;
  };
  const utbl = ulist.length ? `<div class="tbl-wrap"><table class="utbl mtbl">
    <thead><tr><th>대학</th><th>모집단위</th><th class="n">지원</th><th class="n">합격</th><th class="n">합격자 내신</th>
      <th><div class="maxis"><span>${lo}.0</span><b>내신 분포</b><span>${hi}.0</span></div></th>${has ? `<th>${esc(me.nm || '입력한 내신')} ${me.g.toFixed(2)} 기준</th>` : ''}</tr></thead>
    <tbody>${shown.map(x => `<tr class="${x.h ? '' : 'zero'}${has && under(x) ? ' can' : ''}">
      <td class="nw"><button class="ulink" data-univ="${esc(x.u)}" title="${esc(x.u)} 합격생 전체 보기">${esc(shortUniv(x.u))}</button></td>
      <td class="mn">${names(x)}</td>
      <td class="n">${x.n}</td><td class="n ok"><b>${x.h || '—'}</b></td>
      <td class="n mut nw">${x.gs.length ? `${Math.min(...x.gs).toFixed(2)} ~ ${Math.max(...x.gs).toFixed(2)}` : '—'}</td>
      <td class="ms">${strip(x)}</td>${meCell(x)}</tr>`).join('')}</tbody></table></div>
    <div class="mleg"><i class="ok"></i>합격 <i class="no"></i>불합${has ? ' <u></u>이 학생' : ''} <span class="fine">· 왼쪽일수록 내신이 좋습니다 · 점에 마우스를 올리면 학년도·전형·모집단위가 나옵니다</span></div>
    ${ulist.length > SHOW ? `<button class="more2" data-umore="1">${o.univMore ? '접기' : `지원한 대학 ${ulist.length}곳 모두 보기 (합격 있는 곳 ${withPass})`}</button>` : ''}`
    : '<div class="empty">이 조건의 지원 기록이 없습니다.</div>';

  const chip = (k, v, label, n) => `<button class="chip" data-pf="${k}" data-v="${esc(v)}" aria-pressed="${String(f[k] ?? 'all') === String(v)}">${esc(label)}${n != null ? `<small>${n}</small>` : ''}</button>`;
  const inYr = a => f.yr === 'all' || a.y === +f.yr, inTr = a => f.tr === 'all' || a.track === f.tr;
  const tools = `<div class="utools">
    <div class="ug"><span class="fl">전형</span><div class="chips">${chip('tr', 'all', '전체', all.filter(inYr).length)}${tracks.map(t => chip('tr', t, t, all.filter(a => a.track === t && inYr(a)).length)).join('')}</div></div>
    <div class="ug"><span class="fl">학년도</span><div class="chips">${chip('yr', 'all', '전체')}${years.map(y => chip('yr', y, `${y}`, all.filter(a => a.y === y && inTr(a)).length)).join('')}</div></div>
  </div>`;
  const stats = `<div class="stats">
    <div class="stat"><b>${passPeople.size}명</b><i>합격자 (${pass.length}건 · 추합 ${pass.filter(a => a.res === '추합').length})</i></div>
    <div class="stat"><b>${scope.length}건</b><i>지원 (${people.size}명 · ${um.size}개 대학)</i></div>
    <div class="stat"><b class="ok">${scope.length ? ((pass.length / scope.length) * 100).toFixed(1) : '0.0'}%</b><i>건별 합격률</i></div>
    <div class="stat"><b class="brand">${pg.length ? `${Math.min(...pg).toFixed(2)} ~ ${Math.max(...pg).toFixed(2)}` : '—'}</b><i>합격자 내신 · 가운데 ${pg.length ? median(pg).toFixed(2) : '—'}</i></div>
  </div>`;
  const who = has ? `<b>${esc(me.nm || '입력한 내신')}</b> 내신 <b>${me.g.toFixed(2)}</b>${me.est ? ' <span class="wn">(9등급 환산)</span>' : ''}` : '';
  const meNote = has
    ? (can.length
      ? `${who} 와 같거나 낮은 내신으로 붙은 사례가 있는 대학은 <b>${can.length}곳</b>입니다 — ${can.slice(0, 8).map(x => esc(shortUniv(x.u))).join(' · ')}${can.length > 8 ? ' …' : ''}.`
      : `${who} 와 같거나 낮은 내신으로 붙은 사례는 아직 없습니다.`)
      + '<br><span class="fine">사례가 있다는 뜻이지 합격 가능성은 아닙니다. 논술·특기자는 내신 영향이 작으니 위에서 전형을 골라 보세요.</span>'
    : '학생을 고르거나 내신을 넣어 두면 그 내신 자리가 띠와 목록에 표시됩니다.';

  let rows = scope.filter(a => f.res === 'all' || isPass({ a }));
  rows = rows.map(a => ({ a, g: pmap.get(a.pk)?.g || [] })).sort((x, y) => (x.g[3] ?? 99) - (y.g[3] ?? 99) || o.rank(baseU(x.a.univ)) - o.rank(baseU(y.a.univ)));
  const resChips = `<span class="chips mres">${chip('res', 'pass', '합격·추합만')}${chip('res', 'all', '전체 지원')}</span>`;

  return `${tools}${stats}
    <div class="note">${meNote}</div>
    <div class="usec"><h3>대학별 <span class="snote">합격 있는 대학 먼저 · 주요대학 순 · 대학 이름을 누르면 그 대학 합격생 전체</span></h3>${utbl}</div>
    <div class="usec"><h3>${f.res === 'all' ? '지원' : '합격'} 목록 <span class="snote">${rows.length}건 · 내신 좋은 순</span>${resChips}</h3>${poolList(rows, me, hkOf)}</div>`;
}
