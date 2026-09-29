/* ────────────────────────────────────────────────────────────
   설정 — 이 파일 한 줄만 고치면 됩니다.

   GAS_URL 에 Apps Script 웹앱 주소를 넣으세요.
   Apps Script 편집기 → 배포 → 새 배포 → 웹 앱 →
   「액세스 권한: 모든 사용자」로 배포한 뒤 나오는 주소입니다.
   .../exec 로 끝나야 합니다.

   ※ 이 주소는 공개되어도 됩니다. 열쇠가 없으면 자료를 내주지 않습니다.
   ※ 열쇠(교사용키·관리자키)는 이 파일에 넣지 마세요. 스프레드시트에만 둡니다.
   ──────────────────────────────────────────────────────────── */

export const GAS_URL = 'https://script.google.com/macros/s/https://script.google.com/macros/s/AKfycbzQjPaW21VPS11O6xwaNV0BiT-So2li340o5bR8HiEKp3QYA3MyWv3FPqRkyGmO9sVnMQ/exec/exec';

/* 학교 표기 — 표지와 사이드바에 그대로 나옵니다. 표어는 나중에 바꿔 넣으면 됩니다. */
export const SCHOOL = {
  ko: '과천외국어고등학교',
  en: 'GWACHEON FOREIGN LANGUAGE HIGH SCHOOL',
  since: 'SINCE · 1990',
  motto: ['LANGUAGE · WORLD ·', 'FUTURE'],
  title: ['과천외국어고등학교', '진학상담 프로그램'],
  titleEn: 'COLLEGE ADMISSION COUNSELING',
  dept: '진학 담당 부서',   /* 「○○에서 받은 전용 링크로 접속해 주세요」에 들어가는 이름 */
};

/* 내신 석차 파일을 어디서 받는지 — 표지의 「받는 방법」을 펼치면 그대로 표시됩니다.
   학교 프로그램의 실제 메뉴 이름을 알면 이 배열만 고치면 됩니다. */
export const ROSTER_STEPS = [
  '학교 성적 프로그램', '내신 석차', '학년 선택', '엑셀로 내보내기',
];
