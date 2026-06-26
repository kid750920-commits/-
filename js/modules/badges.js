export function createBadgeHelpers({
  safe,
  closedStatus,
  reviewStatusValues,
  normalizeCaseType,
  isPartCase,
  reviewStatus
}){
  function typeBadge(type){
    const label = normalizeCaseType(type);
    const cls = label === '程式BUG回報' ? 'bad-b'
      : label === '維修料品申請' ? 'good-b'
      : label === '貨櫃送修' ? 'violet-b'
      : 'blue-b';
    return `<span class="badge ${cls}">${safe(label || '-')}</span>`;
  }

  function statusBadge(status){
    const cls = closedStatus.includes(status) ? 'good-b'
      : status === '待廠商回覆' || status === '待廠商回覆中' || status === '待負責人審核' ? 'warn-b'
      : status === '審核退回' || status === '取消' ? 'bad-b'
      : status === '廠商已寄出' || status === '已完成' ? 'good-b'
      : 'blue-b';
    return `<span class="badge ${cls}">${safe(status || '-')}</span>`;
  }

  function reviewBadge(caseRow){
    if(!isPartCase(caseRow)) return '';
    const status = reviewStatus(caseRow);
    if(status === reviewStatusValues.pending) return '<span class="badge warn-b">待審核</span>';
    if(status === reviewStatusValues.rejected) return '<span class="badge bad-b">審核退回</span>';
    return '<span class="badge good-b">審核通過</span>';
  }

  function reminderBadge(calc){
    if(calc.overdue) return `<span class="badge bad-b">逾期 ${calc.overdueDays} 天</span>`;
    if(calc.soon) return `<span class="badge warn-b">${calc.daysToDue === 0 ? '今天到期' : calc.daysToDue + ' 天後到期'}</span>`;
    if(calc.noReply) return `<span class="badge violet-b">未回覆 ${calc.noReplyDays} 天</span>`;
    if(calc.notReceived) return '<span class="badge warn-b">收件未確認</span>';
    return '<span class="badge good-b">正常</span>';
  }

  function priorityBadge(priority){
    if(priority === '重大') return '<span class="priority-badge priority-critical">重大</span>';
    if(priority === '急件') return '<span class="priority-badge priority-urgent">急件</span>';
    return '<span class="priority-badge priority-normal">一般</span>';
  }

  function urgentBadge(calc){
    if(!calc?.urgentNeedReply) return '';
    return `<span class="badge bad-b">需盡快回覆｜${calc.noReplyDays} 天</span>`;
  }

  function priorityRowClass(priority, calc){
    if(calc?.urgentNeedReply || priority === '重大') return 'priority-row-critical';
    if(priority === '急件') return 'priority-row-urgent';
    return '';
  }

  return {
    typeBadge,
    statusBadge,
    reviewBadge,
    reminderBadge,
    priorityBadge,
    urgentBadge,
    priorityRowClass
  };
}
