/* 한셀(HCell)로 저장한 .xlsx 손보기.
   한셀은 XML 요소마다 「x:」 접두어를 붙이고, 글꼴에 자기만의 <hs:…> 확장을 끼워 넣습니다.
   우리가 쓰는 SheetJS(0.18)는 그 파일에서 시트를 하나도 못 읽습니다.
   그래서 압축을 풀어 접두어와 확장을 걷어 낸 뒤 다시 묶어서 SheetJS 에 넘깁니다.
   엑셀로 저장한 파일은 손대지 않습니다. 이 작업도 브라우저 안에서만 일어납니다. */

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

function isZip(u8) {
  return ZIP_MAGIC.every((b, i) => u8[i] === b);
}

function scrub(xml) {
  return xml
    .replace(/<mc:AlternateContent\b[\s\S]*?<\/mc:AlternateContent>/g, '')   /* 한셀 확장 묶음 */
    .replace(/<\/?x:/g, m => m.replace('x:', ''))                             /* <x:row> → <row> */
    .replace(/xmlns:x=/g, 'xmlns=')
    .replace(/<hs:[^>]*\/>/g, '').replace(/<\/?hs:[^>]*>/g, '')               /* 남은 hs: 요소 */
    .replace(/\shs:[a-zA-Z]+="[^"]*"/g, '')                                   /* hs:extension="1" 같은 속성 */
    .replace(/\s+=\s+"/g, '="');                                              /* Extension = "rels" → Extension="rels" */
}

/* 한셀 파일이면 고친 바이트를, 아니면 원본을 그대로 돌려줍니다. */
export function fixHcell(bytes, XLSX) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (!isZip(u8) || !XLSX?.CFB) return u8;
  let cfb;
  try { cfb = XLSX.CFB.read(u8, { type: 'array' }); } catch { return u8; }
  const dec = new TextDecoder('utf-8'), enc = new TextEncoder();
  const wbEntry = cfb.FileIndex.find(f => /xl\/workbook\.xml$/.test(f.name || '') || /xl\/workbook\.xml$/.test(cfb.FullPaths[cfb.FileIndex.indexOf(f)] || ''));
  const wbXml = wbEntry?.content ? dec.decode(wbEntry.content) : '';
  if (!/<x:workbook\b/.test(wbXml) && !/HCell/.test(wbXml)) return u8;   /* 엑셀 파일 — 손대지 않음 */

  let touched = 0;
  for (const f of cfb.FileIndex) {
    if (!f.content || !/\.(xml|rels)$/.test(f.name || '')) continue;
    const before = dec.decode(f.content);
    const after = scrub(before);
    if (after !== before) { f.content = enc.encode(after); f.size = f.content.length; touched++; }
  }
  if (!touched) return u8;
  try { return XLSX.CFB.write(cfb, { type: 'array', fileType: 'zip' }); } catch { return u8; }
}
