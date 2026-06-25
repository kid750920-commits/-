import { safe } from './html.js';

export function csvEscape(value){
  return `"${String(value ?? '').replaceAll('"','""')}"`;
}

export function downloadText(filename, text, type='text/plain;charset=utf-8'){
  const blob = new Blob([text], {type});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function statRows(rows, label){
  return [[label,'總數','未結','逾期','急件/重大'], ...rows.map(row => [row.name,row.total,row.open,row.overdue,row.urgent])];
}

export function excelHtml(sheets){
  return `\ufeff<html><head><meta charset="utf-8"></head><body>${sheets.map(sheet => `<h2>${safe(sheet.name)}</h2><table border="1">${sheet.rows.map(row => `<tr>${row.map(cell => `<td>${safe(cell)}</td>`).join('')}</tr>`).join('')}</table><br>`).join('')}</body></html>`;
}

export function parseCsv(text){
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for(let i = 0; i < text.length; i++){
    const ch = text[i];
    const next = text[i + 1];
    if(quoted && ch === '"' && next === '"'){
      cell += '"';
      i++;
      continue;
    }
    if(ch === '"'){
      quoted = !quoted;
      continue;
    }
    if(!quoted && ch === ','){
      row.push(cell);
      cell = '';
      continue;
    }
    if(!quoted && (ch === '\n' || ch === '\r')){
      if(ch === '\r' && next === '\n') i++;
      row.push(cell);
      if(row.some(value => value.trim())) rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += ch;
  }
  row.push(cell);
  if(row.some(value => value.trim())) rows.push(row);
  return rows;
}
