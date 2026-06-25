export function normalizedTitle(value){
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function parseRestockInfo(text=''){
  const result = {};
  String(text || '').split(/\r?\n/).forEach(line => {
    const [rawKey, ...rest] = line.split('：');
    if(!rawKey || !rest.length) return;
    const key = rawKey.trim();
    const value = rest.join('：').trim();
    if(key === '補料批次') result.batch = value;
    if(key === '貨櫃號碼') result.container = value;
    if(key === '補料日期') result.date = value;
    if(key === '補料狀態') result.status = value;
    if(key === '廠商判斷') result.note = value;
  });
  return result;
}

export function buildRestockText(previous='', info={}){
  const old = parseRestockInfo(previous);
  const merged = { ...old, ...info };
  const existingNote = old.note || String(previous || '')
    .split(/\r?\n/)
    .filter(line => !/^(補料批次|貨櫃號碼|補料日期|補料狀態|廠商判斷)：/.test(line))
    .join(' ')
    .trim();
  const note = merged.note || existingNote;
  return [
    merged.batch ? `補料批次：${merged.batch}` : '',
    merged.container ? `貨櫃號碼：${merged.container}` : '',
    merged.date ? `補料日期：${merged.date}` : '',
    merged.status ? `補料狀態：${merged.status}` : '',
    note ? `廠商判斷：${note}` : ''
  ].filter(Boolean).join('\n');
}
