export function createReportHelpers({
  safe,
  closedStatus,
  calcCase,
  groupBy
}){
  function groupStats(cases, keyFn){
    const groups = groupBy(cases, keyFn);
    return Object.entries(groups).map(([name, list]) => ({
      name,
      total:list.length,
      open:list.filter(caseRow => !closedStatus.includes(caseRow.status)).length,
      overdue:list.filter(caseRow => calcCase(caseRow).overdue).length,
      urgent:list.filter(caseRow => calcCase(caseRow).urgentNeedReply || caseRow.priority === '重大' || caseRow.priority === '急件').length
    })).sort((a, b) => b.total - a.total);
  }

  function statTable(rows, label){
    const body = rows.map(row => `<tr><td><b>${safe(row.name)}</b></td><td>${row.total}</td><td>${row.open}</td><td>${row.overdue}</td><td>${row.urgent}</td></tr>`).join('')
      || '<tr><td colspan="5" class="empty">尚無資料</td></tr>';
    return `<div class="table-wrap"><table><thead><tr><th>${safe(label)}</th><th>總數</th><th>未結</th><th>逾期</th><th>急件/重大</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }

  return {
    groupStats,
    statTable
  };
}
