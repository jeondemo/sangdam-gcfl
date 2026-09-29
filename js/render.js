/* 화면 렌더링 — HTML 문자열을 만들어 돌려줍니다. */

import { isPass } from './match.js';

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
  const scale = five
    ? '<div class="fine">5등급 기준 · 괄호는 9등급 환산 <span class="wn" title="이 학교 졸업생의 석차백분율 → 9등급 평균 곡선으로 환산한 값입니다">(석차 기준)</span></div>'
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

export function headline(sum, sel, gpa, studentName, est) {
  const ns = sum.nonsul;
  let warn = false;
  let s = (studentName ? `<span class="who-tag">${esc(studentName)}</span>` : '')
    + `내신 <b>${gpa.toFixed(2)}</b>${est ? ' <span class="wn">(9등급 환산)</span>' : ''} 근처 졸업생 ${sel.length}명 기준입니다. `
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

/* 검색 제안 칩 */
export function univSuggest(list, picked) {
  if (!list.length) return '<span class="none">맞는 대학이 없습니다. 이름을 줄여서(예: 「외대」「시립대」) 찾아보세요.</span>';
  return list.map(o => `<button class="uchip" data-univ="${esc(o.univ)}" aria-pressed="${o.univ === picked}">${esc(o.univ)}<span class="c">합격 ${o.h}</span></button>`).join('');
}

export function univPage(univ, all, pmap, f, me) {
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
      <td>${esc(r.a.dept || '')}</td>
      <td class="rt nw">${minTag(r.a)}${firstTag(r.a)}${waitTag(r.a)}${resTag(r.a)}</td>
    </tr>`);
  if (meAt >= 0) body.splice(meAt, 0, meRow);

  const list = rows.length
    ? `<div class="tbl-wrap"><table class="ulist">
      <thead><tr><th class="n">#</th><th class="n">내신 ▲</th><th class="n">1·2·3학년</th><th>학년도</th><th>전형</th><th>모집단위</th><th class="rt">결과</th></tr></thead>
      <tbody>${body.join('')}</tbody></table></div>`
    : '<div class="empty">조건에 맞는 기록이 없습니다.</div>';

  return `${stats}
    <div class="note">${esc(univ)}에 <b>${years.join('·')}학년도</b> 동안 ${people.size}명이 ${all.length}장을 썼고, <b>${passPeople.size}명</b>이 붙었습니다.
      아래 목록은 <b>내신(9등급 전학년)이 좋은 순</b>입니다. 이름은 자료에 없습니다.</div>
    <div class="usec"><h3>전형 갈래별</h3>${tbl}</div>
    <div class="usec"><h3>${f.res === 'all' ? '지원' : '합격'} 목록 <span class="snote">${rows.length}건</span></h3>${tools}${list}</div>`;
}
