/* 엑셀 파싱 — 브라우저에서만 실행됩니다. 파일은 서버로 전송되지 않습니다.
   외고 자체 프로그램이 내보내는 「수시합격현황」 파일과 「내신 석차」 파일을 읽습니다. */

const NULLS = new Set(['', 'nan', 'null', 'undefined', '#N/A', '#VALUE!', '#REF!', '#DIV/0!', '-', '–', '—', '★']);

export function clean(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(/\s+/g, ' ');
  return NULLS.has(s) ? null : s;
}

export function num(v) {
  if (typeof v === 'number' && isFinite(v)) return Math.round(v * 1000) / 1000;
  if (typeof v === 'string') {
    const s = v.trim();
    if (NULLS.has(s)) return null;
    const n = Number(s);
    if (isFinite(n)) return Math.round(n * 1000) / 1000;
  }
  return null;
}

const squash = v => (clean(v) || '').replace(/\s+/g, '');

/* ── 계열 분류 ───────────────────────────────────────────
   외고 지원은 대부분 인문사회라 「인문사회 / 자연공학」으로는 갈리지 않습니다.
   어문과 사회·상경을 따로 두고, 자연·의약과 예체능은 한 묶음씩 둡니다. */

const ART = ['체육', '음악', '미술', '디자인', '무용', '연극', '영화', '실용음악', '예술', '스포츠',
  '회화', '조소', '공예', '뷰티', '태권도', '골프', '댄스', '성악', '피아노', '관현악', '작곡',
  '연기', '모델', '만화', '애니', '사진', '도예', '조형', '국악', '영상', '뮤지컬', '패션'];
const SCI = ['인지과학', '의예', '치의', '한의', '약학', '수의', '간호', '의학', '제약', '임상병리', '물리치료',
  '작업치료', '방사선', '치위생', '응급구조', '보건', '재활', '안경광학', '치기공', '의료',
  '공학', '공과', '전자', '전기', '기계', '컴퓨터', '소프트웨어', '정보', '통신', '화학',
  '생명', '물리', '수학', '통계', '건축', '토목', '환경', '신소재', '재료', '산업공', '에너지',
  '반도체', 'AI', '인공지능', '데이터', '바이오', '식품', '원예', '산림', '조경', '해양',
  '항공', '자동차', '로봇', '나노', '우주', '지구', '천문', '시스템', '메카트로', '제어', '섬유',
  '고분자', '동물', '축산', '스마트팜', '보안', '게임', '클라우드', '빅데이터', '융합공', '자연', '농'];
const LANG = ['어문', '외국어', '영어', '영문', '중국', '중어', '일본', '일어', '독일', '독어', '프랑스', '불어',
  '스페인', '러시아', '노어', '아랍', '이탈리아', '포르투갈', '베트남', '태국', '인도네시아', '말레이',
  '터키', '튀르키예', '페르시아', '몽골', '힌디', '언어', '문학', '통번역', '국어국문', '국문', '한국어',
  '유럽', '동양어', '서양어', '언더우드', '영미', '불문', '독문', '중문', '일문', '노문', '서문', '이란', '스칸디나비아',
  '그리스', '폴란드', '루마니아', '루마니', '체코', '헝가리', '세르비아', '우크라이나', '히브리', '인도', '아시아', '아프리카', '한문',
  '네덜란드', '이탈리', '스웨덴', '노르웨이', '핀란드', '덴마크', '중동', 'Language', 'TESL', '테슬', 'KFL', 'EICC', 'ELLT', '유러피', '한국학', '문예창작', '극작', '영어학'];
const SOC = ['경영', '경제', '무역', '회계', '금융', '정치', '외교', '행정', '법', '사회', '심리', '언론', '미디어',
  '광고', '홍보', '국제', '글로벌', '통상', '교육', '인문', '철학', '사학', '역사', '지리', '관광', '호텔',
  '복지', '아동', '가족', '소비자', '문화', '콘텐츠', '신문방송', '커뮤니케이션', '공공', '정책', '부동산',
  '세무', '유아', '종교', '신학', '불교', '인류', '고고', '학부대학', 'LD', 'LT', '자유전공', '무전공', '인재', '융합', '교양',
  '군사', '경찰', '항공서비스', '비서', '물류', '창업', '기업', '마케팅', '리더', '상학', '상경', '경상', '기독교', '유학', '보험',
  '앙트러', '상담', 'Business', '비즈니스', 'HASS', '자율전공', '자율융합', '전학부', '단일계열', '무학과', '학부', '계열'];

export const GYEYEOL = ['어문', '사회·상경', '자연·의약', '예체능', '기타'];

export function gyeyeol(dept) {
  if (!dept) return 4;
  const d = dept.replace(/\s+/g, '');
  for (const k of ART) if (d.includes(k)) return 3;
  for (const k of SCI) if (d.includes(k)) return 2;
  /* 「인문학부」「미디어학과」는 「문학」「어」로 어문에 걸리므로 먼저 사회로 보냅니다 */
  if (/인문|미디어|콘텐츠|문화|국제|글로벌|커뮤니케이션/.test(d)) return 1;
  for (const k of LANG) if (d.includes(k)) return 0;
  for (const k of SOC) if (d.includes(k)) return 1;
  return 4;
}

/* ── 전형 갈래 ───────────────────────────────────────────
   원본의 「전형구분」은 대학마다 이름이 달라 370가지가 넘습니다(네오르네상스·다빈치·KU자기추천 …).
   화면의 「카드 배분」은 갈래로 묶어야 뜻이 있으므로 이름을 보고 갈래로 나눕니다.
   외고 수시는 대부분 학생부종합이라, 어느 규칙에도 안 걸리는 이름은 「종합」으로 둡니다. */
export const TRACKS = ['종합', '논술', '특기자', '교과', '실기', '고른기회', '기타'];

export function trackOf(type) {
  const t = squash(type);
  if (!t) return '기타';
  if (/논술/.test(t)) return '논술';
  if (/실기|실적|재능우수|미술|연기|예능|예체능|공연|영화|음악|체육/.test(t)) return '실기';
  if (/특기|어학|외국어/.test(t)) return '특기자';
  if (/고른|기회균|사회통합|사회배려|사회기여|사회공헌|농어촌|기초생활|특수교육|장애|다문화|이웃사랑|배려|다자녀|보훈|특례|재외국민|외국인|유학생|해외이수|신한국인|귀국/.test(t)) return '고른기회';
  if (/사관학교|경찰대/.test(t)) return '기타';
  if (!/종합/.test(t) && /교과|학교장추천|학교추천|지역균형|지정교추천|추천전형|교과우수|지역인재/.test(t)) return '교과';
  return '종합';
}

/* ── 대학 이름 다듬기 ──────────────────────────────────────
   원본에 같은 대학이 여러 이름으로 적혀 있습니다(오타·띄어쓰기·줄임).
   대학별 화면에서 한 대학이 두 칩으로 갈라지지 않게 한 이름으로 모읍니다.
     고려대학교(새종) → 고려대학교(세종) · 동국대학교(wise) → 동국대학교(WISE)
     차 의과학대학교 → 차의과학대학교 · 조지메이슨 대학 → 조지메이슨대학
     광운대·호서대·서울과학기술대 → ○○대학교 · 을지대(의정부) → 을지대학교(의정부)
     카이스트 (KAIST)·카이스트 → KAIST · 유니스트 (UNIST) → UNIST
     와세다대학교(일본) → 와세다대학교 (나라 표시는 떼고 한 대학으로)
   화면에 나올 때마다 거치므로, 이미 서버에 올라간 자료도 다시 올리지 않고 바로 맞춰집니다. */
const UNIV_FIX = [
  [/\(새종\)/, '(세종)'], [/\(wise\)/i, '(WISE)'],
  [/^카이스트\s*(\(KAIST\))?$|^한국과학기술원$/i, 'KAIST'], [/^유니스트\s*(\(UNIST\))?$|^울산과학기술원$/i, 'UNIST'],
  [/^포스텍$|^POSTECH$/i, '포항공과대학교'],
  [/\((일본|영어|sophia)\)/gi, ''],   /* 캠퍼스가 아니라 나라·과정 표시 — 떼어 냅니다 */
  /* 교대 — 「경인교대」「경인교대학교」「경인교대육대학교」 → 경인교육대학교 */
  [/교대(육대)?(학교)?$/, '교육대학교'], [/^교원대학교$/, '한국교원대학교'],
  /* 외국 대학 표기 흔들림 */
  [/^케이오/, '게이오'], [/^칸사이/, '간사이'], [/^칸세이가쿠인(대학교?)?$/, '간세이가쿠인대학교'], [/^리츠메이칸$/, '리츠메이칸대학교'],
  [/카톨릭/, '가톨릭'],
];
export function univFix(name) {
  let u = String(name || '').trim().replace(/[（]/g, '(').replace(/[）]/g, ')').replace(/^일본\s+/, '');
  u = u.replace(/([가-힣])\s+(?=[가-힣])/g, '$1').replace(/\s+\(/g, '(').replace(/\s+/g, ' ');
  for (const [re, to] of UNIV_FIX) u = u.replace(re, to);
  u = u.replace(/([가-힣])대(?=$|\()/, '$1대학교');   /* 「광운대」「을지대(의정부)」 */
  u = u.replace(/([가-힣])대학(?=$|\()/, '$1대학교');  /* 「와세다대학」「조지메이슨대학」 → ○○대학교 */
  return u;
}

/* ── 결과 표기 ─────────────────────────────────────────── */

const isPassWord = s => /^합/.test(s || '');
const isFailWord = s => /^불|미응시|미등록|포기|결시/.test(s || '');
const waitOf = s => { const m = (s || '').match(/^예(?:비)?\s*(\d+)/); return m ? m[1] : null; };

/* 첫 줄 몇 개에서 「2024학년도」를 찾습니다. 파일 이름에 있으면 그것도 씁니다. */
function yearOf(rows, filename) {
  for (const r of rows.slice(0, 4)) for (const v of r || []) {
    const m = String(v ?? '').match(/(20\d{2})\s*학년도/);
    if (m) return Number(m[1]);
  }
  const m = String(filename || '').match(/(20\d{2})/);
  return m ? Number(m[1]) : null;
}

function forwardFill(row, width) {
  const out = []; let cur = null;
  for (let i = 0; i < width; i++) { const v = clean(row?.[i]); if (v) cur = v; out.push(cur); }
  return out;
}

/* ── 지원결과 (학년도별 「수시합격현황」 파일) ─────────────────
   한 파일이 한 학년도이고, 재학생 시트와 졸업생(재수생) 시트가 따로 있습니다.
   해마다 열 배치가 다르므로 자리 번호를 믿지 않고 머리글을 읽습니다.
     2023: 학번·학년·반·번호 있음 · 결과는 「1차 / 최종」 · 1차 칸에 최저Y/N
     2024: 학번 없음 · 「1차 / 최초 / 추가1~4 / 최종」
     2025: 「인증번호/최저」 · 「추합1~4」
     2026: 「환산점수 / 수능최저(P·F) / 추합1~5」
   학번이 없는 해는 내신 8개 값이 같은 연속 행을 한 학생으로 봅니다(파일이 학생별로 묶여 있습니다). */
export function parseApps(workbook, XLSX, filename) {
  const persons = [];
  const apps = [];
  const sheetInfo = [];
  let seq = 0;

  for (const name of workbook.SheetNames) {
    if (!/수시\s*합격/.test(name)) continue;
    const isGrad = /졸업/.test(name);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: true, defval: null, blankrows: true });
    const year = yearOf(rows, filename);
    if (!year) continue;

    const h = rows.findIndex(r => r && r.some(v => squash(v) === '학과') && r.some(v => squash(v) === '지원대학'));
    if (h < 0) continue;
    const width = Math.max(...rows.slice(Math.max(0, h - 2), h + 1).map(r => (r ? r.length : 0)));
    const gA = forwardFill(rows[h - 2], width);   // 내신성적 / 6월모평 / 9월모평
    const gB = forwardFill(rows[h - 1], width);   // 전교과 / 국수영사과한국사 / 국어 …
    const base = (rows[h] || []).map(squash);
    const find = (pred) => base.findIndex((b, i) => pred(b, gB[i] || '', gA[i] || ''));
    const col = {
      univ: find(b => b === '지원대학'), type: find(b => b === '전형구분'), dept: find(b => b === '지원학과명'),
      id: find(b => b === '학번'), grade: find(b => b === '학년'), cls: find(b => b === '반'), no: find(b => b === '번호'),
      first: find(b => b === '1차'), init: find(b => b === '최초'), fin: find(b => b === '최종'),
      min: find(b => /최저/.test(b) && !/^1차$/.test(b)),
      g1: find((b, m, t) => /내신/.test(t) && /전교과/.test(m) && b === '1년'),
      g2: find((b, m, t) => /내신/.test(t) && /전교과/.test(m) && b === '2년'),
      g3: find((b, m, t) => /내신/.test(t) && /전교과/.test(m) && b === '3년'),
      gA: find((b, m, t) => /내신/.test(t) && /전교과/.test(m) && b === '전'),
      mA: find((b, m, t) => /내신/.test(t) && /국수영사/.test(m) && b === '전'),
    };
    const addCols = base.map((b, i) => (/^(추합|추가)\d*$/.test(b) ? i : -1)).filter(i => i >= 0);
    if (col.univ < 0 || col.gA < 0) continue;
    const at = (row, i) => (i < 0 ? null : row[i]);

    let prevKey = null, p = null, n = 0;
    for (let r = h + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const univ = clean(at(row, col.univ)) && univFix(clean(at(row, col.univ)));
      if (!univ) { prevKey = null; continue; }   /* 빈 줄은 학생 사이의 경계로 봅니다 */

      const g = [num(at(row, col.g1)), num(at(row, col.g2)), num(at(row, col.g3)), num(at(row, col.gA)), num(at(row, col.mA)), null];
      if (g[3] == null) continue;   /* 내신이 없는 줄(합계·메모)은 뺍니다 */

      /* 사람 구분 */
      const id = clean(at(row, col.id));
      const key = id ? `id:${id}` : `g:${g.map(v => (v == null ? '' : v.toFixed(2))).join('|')}`;
      if (key !== prevKey) {
        p = { pk: `${year}/${isGrad ? 'G' : 'S'}/${seq++}`, y: year, g, gj: null, csat: null };
        persons.push(p);
        prevKey = key;
      }

      /* 결과 — 1차 → 최초 → 추합 → 최종 순서로 읽고, 최종을 최우선으로 믿습니다 */
      const first = squash(at(row, col.first));
      const init = squash(at(row, col.init));
      const fin = squash(at(row, col.fin));
      const adds = addCols.map(i => squash(row[i]));
      let min = null;
      const minRaw = squash(at(row, col.min));
      if (/^P$|^충족|^Y$/i.test(minRaw)) min = '충족';
      else if (/^F$|^미충족|^N$|^미달/i.test(minRaw)) min = '미충족';
      if (/최저Y/i.test(first)) min = '충족';
      if (/최저N/i.test(first)) min = '미충족';

      let firstRes = null;
      if (/^합/.test(first) || /^1차합/.test(first)) firstRes = '1차합격';
      else if (/^불/.test(first) || /^1차불/.test(first) || /최저N/i.test(first)) firstRes = '1차불합';

      let wait = waitOf(init);
      for (const a of adds) { const w = waitOf(a); if (w) wait = w; }
      if (!wait) wait = waitOf(fin);

      let res = null;
      const addPass = adds.some(isPassWord);
      if (isPassWord(fin)) res = (isPassWord(init) || (!init && !addPass)) ? '합격' : '추합';
      else if (isFailWord(fin) || waitOf(fin)) res = '불합';
      else if (fin === '예비' || /^예비/.test(fin)) res = '불합';
      else if (!fin) {
        /* 최종 칸이 빈 줄 — 앞 칸들로 판단합니다 */
        if (addPass) res = '추합';
        else if (isPassWord(init)) res = '합격';
        else if (isFailWord(init) || firstRes === '1차불합' || min === '미충족') res = '불합';
      }
      if (min === '미충족' && res == null) res = '불합';

      const dept = clean(at(row, col.dept));
      const type = clean(at(row, col.type));
      apps.push({
        pk: p.pk, y: year, ph: 0, cat: 0,
        track: trackOf(type), type, univ, dept, gy: gyeyeol(dept),
        first: firstRes, wait, res, min, grp: null,
      });
      n++;
    }
    sheetInfo.push({ name, year, phase: isGrad ? '졸업생' : '재학생', rows: n });
  }
  return { persons, apps, sheetInfo };
}

/* 여러 학년도 파일을 한 자료로 합칩니다. 같은 학년도 파일을 다시 올리면 그 학년도만 바뀝니다. */
export function mergeApps(parts) {
  const byYear = new Map();
  for (const part of parts) for (const s of part.sheetInfo) byYear.set(s.year, part);   /* 나중 파일이 이깁니다 */
  const use = [...new Set(byYear.values())];
  const persons = use.flatMap(x => x.persons);
  const apps = use.flatMap(x => x.apps);
  const sheets = use.flatMap(x => x.sheetInfo).sort((a, b) => a.year - b.year);
  const years = [...new Set(sheets.map(s => s.year))].sort();
  return {
    persons, apps, mincond: {},
    meta: { years, sheets, nApps: apps.length, nPersons: persons.length, loadedAt: Date.now() },
  };
}

/* ── 5등급 → 9등급 환산 곡선 ─────────────────────────────────
   2015~2022년 졸업생 2,069명의 「석차백분율 → 9등급 전학년 평균」 곡선입니다(같은 학교 자료).
   1% 마다 중앙값을 잡고 단조가 되게 다듬었습니다. 실제 값과의 평균 오차 0.10, 90%가 0.19 이내.
   5등급 평균을 산술로 바꾸는 게 아니라 「이 학교에서 이 석차였던 졸업생의 9등급 평균」을 씁니다. */
export const PCT_TO_9 = [1.87, 1.98, 2.11, 2.21, 2.29, 2.44, 2.53, 2.61, 2.71, 2.75, 2.83, 2.9, 2.97, 3.02, 3.1, 3.16, 3.25, 3.3, 3.33, 3.39,
  3.45, 3.49, 3.54, 3.58, 3.66, 3.7, 3.75, 3.79, 3.83, 3.86, 3.9, 3.95, 4.0, 4.05, 4.1, 4.14, 4.17, 4.21, 4.25, 4.3,
  4.33, 4.37, 4.4, 4.44, 4.47, 4.52, 4.57, 4.58, 4.63, 4.68, 4.72, 4.75, 4.79, 4.8, 4.85, 4.89, 4.91, 4.96, 4.99, 5.01,
  5.07, 5.11, 5.16, 5.21, 5.23, 5.28, 5.32, 5.36, 5.39, 5.45, 5.5, 5.55, 5.59, 5.64, 5.69, 5.72, 5.82, 5.85, 5.88, 5.92,
  5.97, 6.01, 6.06, 6.11, 6.16, 6.21, 6.28, 6.35, 6.44, 6.52, 6.59, 6.67, 6.75, 6.81, 6.95, 7.11, 7.21, 7.37, 7.54, 7.59, 7.7];

export function pctTo9(p) {
  if (p == null || !isFinite(p)) return null;
  const x = Math.min(100, Math.max(0, p));
  const i = Math.floor(x), f = x - i;
  const v = i >= 100 ? PCT_TO_9[100] : PCT_TO_9[i] + (PCT_TO_9[i + 1] - PCT_TO_9[i]) * f;
  return Math.round(v * 100) / 100;
}

/* ── 내신 석차 파일 (학교 프로그램 출력) ───────────────────────
   머리글 세 줄: 계열·학년·반·번호·이름 | 석차·석차백분율 | 1학년(1학기·2학기·전학기) 2학년(…) 3학년(…) | 전학년.
   .XLS(1·2학년)와 지원결과 파일 안의 「재학(전교과)」 시트 둘 다 같은 배치입니다.
   주민등록번호 열은 읽지 않습니다. 파일 전체가 브라우저 밖으로 나가지 않습니다.
   전학년 값이 전부 5 이하이면 5등급제(2025년 입학 이후) 파일로 보고 9등급 환산을 붙입니다. */
export const ROSTER_PV = 1;

export function parseRoster(workbook, XLSX) {
  const name = workbook.SheetNames.find(n => /재학\s*\(?전교과/.test(n)) || workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: true, defval: null, blankrows: true });
  const h = rows.findIndex(r => r && r.some(v => squash(v) === '이름') && r.some(v => /석차/.test(squash(v))));
  if (h < 0) return { students: [], meta: { n: 0 } };
  const width = Math.max(...rows.slice(h, h + 3).map(r => (r ? r.length : 0)));
  const top = forwardFill(rows[h], width).map(v => (v || '').replace(/\s+/g, ''));
  const mid = forwardFill(rows[h + 1], width).map(v => (v || '').replace(/\s+/g, ''));
  const sub = (rows[h + 2] || []).map(squash);
  const dataStart = h + 3;

  const fx = (pred) => top.findIndex((t, i) => pred(t, mid[i], sub[i]));
  const c = {
    dept: fx(t => /^계열$|^학과$/.test(t)), grade: fx(t => t === '학년'), cls: fx(t => t === '반'), no: fx(t => t === '번호'),
    nm: fx(t => t === '이름' || t === '성명'), rank: fx((t, m) => m === '석차' || (t === '석차' && !/백분율/.test(m))),
    pct: fx((t, m) => /석차백분율/.test(m) || /석차백분율/.test(t)),
    y1: fx((t, m, s) => m === '1학년' && s === '전학기'), y2: fx((t, m, s) => m === '2학년' && s === '전학기'),
    y3: fx((t, m, s) => m === '3학년' && s === '전학기'), all: fx((t, m) => m === '전학년' || t === '전학년'),
  };
  if (c.nm < 0 || c.all < 0) return { students: [], meta: { n: 0 } };

  const out = [];
  for (let r = dataStart; r < rows.length; r++) {
    const row = rows[r] || [];
    const nm = clean(row[c.nm]);
    const grade = num(row[c.grade]), cls = num(row[c.cls]), no = num(row[c.no]);
    if (!nm || cls == null || no == null) continue;
    out.push({
      nm, no, c: (grade || 0) * 100 + cls, gr: grade, dept: clean(row[c.dept]),
      r: num(row[c.rank]), pr: num(row[c.pct]),
      raw: [num(row[c.y1]), num(row[c.y2]), num(row[c.y3]), num(row[c.all])],
    });
  }
  if (!out.length) return { students: [], meta: { n: 0 } };

  const vals = out.map(s => s.raw[3]).filter(v => v != null);
  const scale = vals.length && Math.max(...vals) <= 5.05 ? 5 : 9;
  for (const s of out) {
    if (scale === 5) {
      s.g5 = s.raw; s.a5 = s.raw[3];
      s.g = [null, null, null, s.raw[3] != null ? pctTo9(s.pr) : null];   /* 석차백분율 → 9등급 환산 */
    } else {
      s.g = s.raw; s.g5 = null; s.a5 = null;
    }
    delete s.raw;
  }
  out.sort((a, b) => (a.c - b.c) || (a.no - b.no));
  const grades = [...new Set(out.map(s => s.gr).filter(Boolean))].sort();
  return {
    students: out,
    meta: { n: out.length, scale, has5: scale === 5, grade: grades.length === 1 ? grades[0] : null, grades, pv: ROSTER_PV, loadedAt: Date.now() },
  };
}
