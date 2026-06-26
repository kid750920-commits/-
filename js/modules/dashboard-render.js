export function createDashboardRenderer({
  state,
  $,
  safe,
  caseTypes,
  caseListPageSize,
  closedStatus,
  visibleMainCases,
  calcCase,
  getNotificationItems,
  normalizeCaseType,
  returnLocationName,
  locationName,
  vendorName,
  dateText,
  dateTimeText,
  toLocalDateInput,
  isAdmin,
  isWaitVendorReplyStatus,
  typeBadge,
  statusBadge,
  priorityBadge,
  reviewBadge,
  urgentBadge,
  reminderBadge,
  priorityRowClass,
  cardHtml
}){
  function renderDashboard(){
    if(!$('dashboardCards')) return;
    const cases = visibleMainCases();
    const open = cases.filter(caseRow => !closedStatus.includes(caseRow.status));
    const overdue = cases.filter(caseRow => calcCase(caseRow).overdue);
    const soon = cases.filter(caseRow => calcCase(caseRow).soon);
    const noReply = cases.filter(caseRow => calcCase(caseRow).noReply);
    const notificationStats = getNotificationItems();
    const unreadReplies = notificationStats.filter(notice => notice.kind === 'reply' && !notice.read).length;
    const vendorReminders = notificationStats.filter(notice => notice.kind === 'vendorReminder' && !notice.read).length;
    const urgentNeedReply = cases.filter(caseRow => calcCase(caseRow).urgentNeedReply);
    $('dashboardCards').innerHTML = [
      cardHtml('未結案', open.length, '所有尚未結案與取消的案件', 'blue'),
      cardHtml('新回覆通知', unreadReplies, '尚未查看的公司/廠商回覆', unreadReplies ? 'warn' : 'good'),
      cardHtml('廠商未回覆提醒', vendorReminders, '每日自動產生提醒', vendorReminders ? 'bad' : 'good'),
      cardHtml('已逾期', overdue.length, '超過預計完成日', 'bad'),
      ...adminDailyCards(cases)
    ].join('');
    const urgent = [...urgentNeedReply, ...overdue, ...soon, ...noReply].filter(uniqueById).slice(0, 8);
    $('dashboardUrgent').innerHTML = urgent.length ? urgent.map(quickCaseRow).join('') : '<div class="empty">目前沒有需要追蹤的案件</div>';
    $('typeStats').innerHTML = caseTypes.map(type => {
      const count = cases.filter(caseRow => normalizeCaseType(caseRow.case_type) === type.value && !closedStatus.includes(caseRow.status)).length;
      return `<div class="item-box"><div class="row" style="justify-content:space-between"><b>${safe(type.value)}</b><span class="badge blue-b">${count} 件未結</span></div><div class="small muted">${safe(type.hint)}</div></div>`;
    }).join('');
    $('recentCasesBody').innerHTML = cases.slice(0, 10).map(caseRow => `
      <tr><td><b>${safe(caseRow.case_no)}</b></td><td>${typeBadge(caseRow.case_type)}</td><td>${safe(caseRow.title)}</td><td>${safe(vendorName(caseRow.vendor_id))}</td><td>${statusBadge(caseRow.status)}</td><td>${dateText(caseRow.due_date)}</td><td>${dateTimeText(caseRow.last_reply_at)}</td><td><button class="btn ghost small-btn" onclick="window.VCS.openCase('${caseRow.id}')">查看</button></td></tr>`).join('') || '<tr><td colspan="8" class="empty">尚無案件</td></tr>';
  }

  function uniqueById(value, index, self){
    return self.findIndex(row => row.id === value.id) === index;
  }

  function adminDailyCards(cases){
    if(!isAdmin()) return [];
    const today = toLocalDateInput(new Date());
    const todayCases = cases.filter(caseRow => toLocalDateInput(caseRow.created_at || caseRow.updated_at) === today);
    const cards = caseTypes.map(type => {
      const count = todayCases.filter(caseRow => normalizeCaseType(caseRow.case_type) === type.value).length;
      return cardHtml(`今日${type.value}`, count, '今日新增案件', count ? 'warn' : 'good');
    });
    const restockCount = state.data.case_logs.filter(log => log.action === '補料登記通知' && toLocalDateInput(log.created_at) === today).length;
    cards.push(cardHtml('今日補料', restockCount, '今日補料登記筆數', restockCount ? 'warn' : 'good'));
    return cards;
  }

  function quickCaseRow(caseRow){
    const calc = calcCase(caseRow);
    return `<div class="item-box"><div class="row" style="justify-content:space-between"><div><b>${safe(caseRow.case_no)}</b> ${typeBadge(caseRow.case_type)} ${priorityBadge(caseRow.priority)} ${urgentBadge(calc)}</div>${reminderBadge(calc)}</div><div style="margin:8px 0">${safe(caseRow.title)}</div><div class="small muted">廠商：${safe(vendorName(caseRow.vendor_id))}｜預計完成：${dateText(caseRow.due_date)}｜最後回覆：${dateTimeText(caseRow.last_reply_at)}</div><button class="btn ghost small-btn" style="margin-top:10px" onclick="window.VCS.openCase('${caseRow.id}')">查看案件</button></div>`;
  }

  function renderCaseList(){
    if(!$('caseTableBody')) return;
    const keyword = $('filterKeyword').value.trim().toLowerCase();
    const type = $('filterType').value;
    const status = $('filterStatus').value;
    const vendor = $('filterVendor').value;
    const location = $('filterLocation').value;
    const overdue = $('filterOverdue').value;
    let cases = visibleMainCases();
    if(keyword){
      const itemCases = state.data.case_items
        .filter(item => [item.item_name, item.spec, item.sn, item.problem_desc].join(' ').toLowerCase().includes(keyword))
        .map(item => item.case_id);
      cases = cases.filter(caseRow => [caseRow.case_no, caseRow.case_type, caseRow.title, caseRow.status, caseRow.tracking_no, caseRow.return_tracking_no, returnLocationName(caseRow), caseRow.description, caseRow.owner_name, caseRow.applicant_name].join(' ').toLowerCase().includes(keyword) || itemCases.includes(caseRow.id));
    }
    if(type) cases = cases.filter(caseRow => normalizeCaseType(caseRow.case_type) === type);
    if(status) cases = cases.filter(caseRow => caseRow.status === status);
    if(vendor) cases = cases.filter(caseRow => caseRow.vendor_id === vendor);
    if(location) cases = cases.filter(caseRow => caseRow.location_id === location);
    if(overdue){
      cases = cases.filter(caseRow => {
        const calc = calcCase(caseRow);
        if(overdue === 'soon') return calc.soon;
        if(overdue === 'overdue') return calc.overdue;
        if(overdue === 'normal') return !calc.soon && !calc.overdue;
        return true;
      });
    }
    renderCaseListStats(cases);
    const visibleRows = cases.slice(0, state.caseListLimit);
    $('caseTableBody').innerHTML = visibleRows.map(caseRow => {
      const calc = calcCase(caseRow);
      return `<tr class="${priorityRowClass(caseRow.priority, calc)}">
        <td><b>${safe(caseRow.case_no)}</b><div class="small muted">${dateText(caseRow.created_at)}</div></td>
        <td>${typeBadge(caseRow.case_type)}</td>
        <td><b>${safe(caseRow.title)}</b><div style="margin-top:6px">${priorityBadge(caseRow.priority)} ${reviewBadge(caseRow)} ${urgentBadge(calc)}</div><div class="small muted">${safe((caseRow.description || '').slice(0,70))}${(caseRow.description || '').length > 70 ? '…' : ''}</div></td>
        <td>${safe(locationName(caseRow.location_id))}</td>
        <td>${safe(vendorName(caseRow.vendor_id))}</td>
        <td>${statusBadge(caseRow.status)}</td>
        <td>${safe(caseRow.tracking_no || '-')}<div class="small muted">回寄：${safe(caseRow.return_tracking_no || '-')}</div><div class="small muted">回寄地點：${safe(returnLocationName(caseRow))}</div></td>
        <td>${dateText(caseRow.due_date)}</td>
        <td>${reminderBadge(calc)}</td>
        <td>${safe(caseRow.owner_name || '-')}</td>
        <td><button class="btn ghost small-btn" onclick="window.VCS.openCase('${caseRow.id}')">查看/編輯</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="11" class="empty">沒有符合條件的案件</td></tr>';
    renderCaseListPager(cases.length, visibleRows.length);
  }

  function loadMoreCases(){
    state.caseListLimit += caseListPageSize;
    renderCaseList();
  }

  function renderCaseListPager(total, shown){
    const el = $('caseListPager');
    if(!el) return;
    if(total <= shown){
      el.innerHTML = total ? `<span class="small muted">已顯示全部 ${total} 筆</span>` : '';
      return;
    }
    el.innerHTML = `<span class="small muted">目前顯示 ${shown} / ${total} 筆</span><button class="btn ghost small-btn" id="loadMoreCasesBtn">載入更多</button>`;
    $('loadMoreCasesBtn')?.addEventListener('click', loadMoreCases);
  }

  function renderCaseListStats(cases){
    if(!$('caseListStats')) return;
    const open = cases.filter(caseRow => !closedStatus.includes(caseRow.status));
    const overdue = cases.filter(caseRow => calcCase(caseRow).overdue);
    const urgent = cases.filter(caseRow => calcCase(caseRow).urgentNeedReply || caseRow.priority === '重大' || caseRow.priority === '急件');
    const pendingVendor = cases.filter(caseRow => isWaitVendorReplyStatus(caseRow.status) || calcCase(caseRow).noReply);
    $('caseListStats').innerHTML = [
      cardHtml('符合條件', cases.length, '目前篩選結果', 'blue'),
      cardHtml('未結案', open.length, '未結案與未取消', 'blue'),
      cardHtml('逾期', overdue.length, '超過預計完成日', overdue.length ? 'bad' : 'good'),
      cardHtml('待廠商回覆中', pendingVendor.length, '需要廠商回覆/更新', pendingVendor.length ? 'warn' : 'good'),
      cardHtml('急件/重大', urgent.length, '優先處理案件', urgent.length ? 'bad' : 'good')
    ].join('');
  }

  return {
    renderDashboard,
    renderCaseList,
    loadMoreCases,
    renderCaseListPager,
    renderCaseListStats
  };
}
