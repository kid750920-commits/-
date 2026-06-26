export function createCaseMetrics({
  state,
  closedStatus,
  byId,
  daysBetween,
  todayStart,
  latestCaseActivityAt,
  isWaitVendorReplyStatus,
  isVendor,
  currentRole,
  isMainTableCase
}){
  function vendorName(id){
    return byId(state.data.vendors, id)?.vendor_name || '未指定';
  }

  function locationName(id){
    return byId(state.data.locations, id)?.location_name || '未指定';
  }

  function returnLocationId(caseRow){
    return caseRow?.return_location_id || '';
  }

  function returnLocationName(caseRow){
    return returnLocationId(caseRow) ? locationName(returnLocationId(caseRow)) : '-';
  }

  function visibleCases(){
    let cases = [...state.data.cases];
    if(isVendor() && state.profile?.vendor_id){
      cases = cases.filter(caseRow => caseRow.vendor_id === state.profile.vendor_id && isMainTableCase(caseRow));
    }
    if(currentRole() === 'viewer' && state.profile?.location_id){
      cases = cases.filter(caseRow => caseRow.location_id === state.profile.location_id || caseRow.return_location_id === state.profile.location_id);
    }
    return cases.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
  }

  function visibleMainCases(){
    return visibleCases().filter(isMainTableCase);
  }

  function calcCase(caseRow){
    const due = caseRow.due_date ? new Date(caseRow.due_date) : null;
    const today = todayStart();
    const open = !closedStatus.includes(caseRow.status);
    const daysToDue = due ? daysBetween(today, due) : null;
    const overdueDays = due && open && daysToDue < 0 ? Math.abs(daysToDue) : 0;
    const soon = due && open && daysToDue >= 0 && daysToDue <= 3;
    const last = new Date(latestCaseActivityAt(caseRow));
    const noReplyDays = Math.max(0, daysBetween(last, new Date()));
    const noReply = open && caseRow.vendor_id && noReplyDays >= Number(caseRow.reminder_days || 7) && !['廠商已寄出','已完成','已退回/已到貨','結案','取消'].includes(caseRow.status);
    const notReceived = open && caseRow.ship_date && !caseRow.vendor_received_date && daysBetween(new Date(caseRow.ship_date), new Date()) >= 3;
    const urgentThreshold = caseRow.priority === '重大' ? 1 : caseRow.priority === '急件' ? 2 : null;
    const urgentNeedReply = open && !!urgentThreshold && caseRow.vendor_id && (isWaitVendorReplyStatus(caseRow.status) || noReplyDays >= urgentThreshold);
    return { open, daysToDue, overdueDays, soon, overdue:overdueDays > 0, noReplyDays, noReply, notReceived, urgentThreshold, urgentNeedReply };
  }

  function caseHealthText(caseRow){
    const calc = calcCase(caseRow);
    if(calc.urgentNeedReply) return `${caseRow.priority}案件已 ${calc.noReplyDays} 天未有有效回覆，建議立即催覆廠商或更新處理進度。`;
    if(calc.overdue) return `此案件已逾期 ${calc.overdueDays} 天，建議立即追蹤廠商處理進度。`;
    if(calc.soon) return `此案件 ${calc.daysToDue === 0 ? '今天到期' : calc.daysToDue + ' 天後到期'}，請確認是否需要催廠商回覆。`;
    if(calc.noReply) return `廠商已 ${calc.noReplyDays} 天沒有回覆，超過提醒天數 ${caseRow.reminder_days || 7} 天。`;
    if(calc.notReceived) return '已送出但廠商尚未確認收件，請確認貨運或貨櫃狀態。';
    return '此案件目前未逾期。';
  }

  return {
    vendorName,
    locationName,
    returnLocationId,
    returnLocationName,
    visibleCases,
    visibleMainCases,
    calcCase,
    caseHealthText
  };
}
