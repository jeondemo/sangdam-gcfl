/* 유사 학생 탐색과 집계 — 순수 계산만 담당합니다. 수시만 다룹니다. */

export function buildIndex(history) {
  const byPerson = new Map();
  history.apps.forEach((a, i) => {
    if (!byPerson.has(a.pk)) byPerson.set(a.pk, []);
    byPerson.get(a.pk).push(i);
  });
  return { byPerson, persons: history.persons, apps: history.apps };
}

/* 내신 전교과(9등급)가 가까운 졸업생부터 topN 명. 거리가 같으면 최근 학년도 먼저. */
export function findSimilar(index, opts) {
  const { gpa, topN, minYear, gy } = opts;
  const cand = [];
  for (const p of index.persons) {
    if (p.y < minYear) continue;
    const g = p.g?.[3];
    if (g == null) continue;
    const idxs = index.byPerson.get(p.pk) || [];
    /* 화면에 실제로 보일 기록(계열 일치)이 하나도 없는 졸업생은 자리를 차지하지 않게 뺍니다. */
    if (gy >= 0 && !idxs.some(i => index.apps[i].gy === gy)) continue;
    cand.push({ p, d: Math.abs(g - gpa), g });
  }
  cand.sort((a, b) => a.d - b.d || b.p.y - a.p.y);
  const sel = cand.slice(0, topN);

  const rows = [];
  for (const s of sel) {
    for (const i of index.byPerson.get(s.p.pk) || []) {
      const a = index.apps[i];
      if (gy >= 0 && a.gy !== gy) continue;
      rows.push({ a, s });
    }
  }
  return { sel, rows };
}

export const isPass = r => r.a.res === '합격' || r.a.res === '추합';
const decided = r => r.a.res != null;

export function summarize(sel, rows) {
  const su = rows.filter(decided);
  const suPass = su.filter(isPass);
  const stuSu = new Set(su.map(r => r.s.p.pk));
  const stuSuPass = new Set(suPass.map(r => r.s.p.pk));
  const nonsul = su.filter(r => r.a.track === '논술');
  return {
    su,
    nSuPass: suPass.length,
    stuSu, stuSuPass,
    gpaRange: sel.length ? [Math.min(...sel.map(s => s.g)), Math.max(...sel.map(s => s.g))] : [0, 0],
    cardsPerStudent: stuSu.size ? su.length / stuSu.size : 0,
    nonsul: {
      n: nonsul.length,
      pass: nonsul.filter(isPass).length,
      miss: nonsul.filter(r => r.a.min === '미충족').length,
    },
  };
}

export function aggregateUniv(su) {
  const m = new Map();
  for (const r of su) {
    const k = r.a.univ + '|' + r.a.track;
    if (!m.has(k)) m.set(k, { univ: r.a.univ, track: r.a.track, n: 0, h: 0, gs: [], miss: 0 });
    const o = m.get(k);
    o.n++;
    if (isPass(r)) { o.h++; const g = r.s.p.g?.[3]; if (g != null) o.gs.push(g); }
    if (r.a.min === '미충족') o.miss++;
  }
  return [...m.values()].sort((a, b) => b.h - a.h || b.n - a.n);
}

export function aggregateTrack(su) {
  const m = new Map();
  for (const r of su) {
    const t = r.a.track || '기타';
    if (!m.has(t)) m.set(t, { track: t, n: 0, h: 0, miss: 0 });
    const o = m.get(t);
    o.n++;
    if (isPass(r)) o.h++;
    if (r.a.min === '미충족') o.miss++;
  }
  return [...m.values()].sort((a, b) => b.n - a.n);
}
