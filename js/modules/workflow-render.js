export function createWorkflowRenderer({
  state,
  $,
  safe,
  closedStatus,
  visibleCases,
  visibleMainCases,
  calcCase,
  isWaitVendorReplyStatus,
  isVendor,
  isLcdCase,
  isLocationReviewCase,
  needsReview,
  reviewRejected,
  parseRestockInfo,
  itemThumbHtml,
  groupBy,
  cardHtml,
  typeBadge,
  statusBadge,
  priorityBadge,
  urgentBadge,
  reminderBadge,
  reviewBadge,
  priorityRowClass,
  vendorName,
  locationName,
  returnLocationName,
  dateText,
  dateTimeText,
  sfTrackingButtonHtml=()=>''
}){
  function vendorPortalCases(){
    let cases = visibleMainCases();
    const vendor = $('vendorPortalVendor')?.value || '';
    const status = $('vendorPortalStatus')?.value || '';
    const need = $('vendorPortalNeed')?.value || '';
    if(isVendor() && state.profile?.vendor_id) cases = cases.filter(caseRow => caseRow.vendor_id === state.profile.vendor_id);
    else if(vendor) cases = cases.filter(caseRow => caseRow.vendor_id === vendor);
    if(status) cases = cases.filter(caseRow => caseRow.status === status);
    if(need) cases = cases.filter(caseRow => {
      const calc = calcCase(caseRow);
      return calc.urgentNeedReply || calc.overdue || calc.noReply || isWaitVendorReplyStatus(caseRow.status);
    });
    return cases;
  }

  function renderVendorPortal(){
    if(!$('vendorPortalList')) return;
    const cases = vendorPortalCases();
    const open = cases.filter(caseRow => !closedStatus.includes(caseRow.status));
    const need = cases.filter(caseRow => {
      const calc = calcCase(caseRow);
      return calc.urgentNeedReply || calc.overdue || calc.noReply || isWaitVendorReplyStatus(caseRow.status);
    });
    const done = cases.filter(caseRow => ['廠商已寄出','已完成','已退回/已到貨','結案'].includes(caseRow.status));
    $('vendorPortalStats').innerHTML = [
      cardHtml('廠商案件', cases.length, '目前可查看案件', 'blue'),
      cardHtml('未結案', open.length, '尚未完成', 'blue'),
      cardHtml('需回覆', need.length, '逾期/急件/待回覆', need.length ? 'bad' : 'good'),
      cardHtml('完成/結案', done.length, '已處理完成', 'good')
    ].join('');
    $('vendorPortalList').innerHTML = cases.length ? cases.map(caseRow => {
      const calc = calcCase(caseRow);
      const items = state.data.case_items.filter(item => item.case_id === caseRow.id);
      const lcdSummary = isLcdCase(caseRow) ? lcdVendorSummaryHtml(caseRow, items) : '';
      return `<div class="item-box ${priorityRowClass(caseRow.priority, calc)}">
        <div class="row" style="justify-content:space-between"><div><b>${safe(caseRow.case_no)}</b> ${typeBadge(caseRow.case_type)} ${priorityBadge(caseRow.priority)} ${urgentBadge(calc)}</div>${statusBadge(caseRow.status)}</div>
        <h3 style="margin:10px 0 8px">${safe(caseRow.title)}</h3>
        <div class="grid-3 small muted"><div>廠商：${safe(vendorName(caseRow.vendor_id))}</div><div>預計完成：${dateText(caseRow.due_date)}</div><div>最後回覆：${dateTimeText(caseRow.last_reply_at)}</div><div>單號/批號：${safe(caseRow.tracking_no || '-')} ${sfTrackingButtonHtml(caseRow, 'tracking_no')}</div><div>回寄：${safe(caseRow.return_tracking_no || '-')} ${sfTrackingButtonHtml(caseRow, 'return_tracking_no', '查回寄')}</div><div>回寄地點：${safe(returnLocationName(caseRow))}</div><div>品項：${items.length} 筆</div></div>
        ${lcdSummary}
        <p class="small muted" style="line-height:1.7">${safe((caseRow.description || '').slice(0, 120))}${(caseRow.description || '').length > 120 ? '…' : ''}</p>
        <div class="row"><button class="btn ghost small-btn" onclick="window.VCS.openCase('${caseRow.id}')">查看案件</button><button class="btn small-btn" onclick="window.VCS.openCase('${caseRow.id}','replies')">回覆進度</button></div>
      </div>`;
    }).join('') : '<div class="empty">目前沒有廠商案件</div>';
  }

  function lcdVendorSummaryHtml(caseRow, items){
    const pending = items.filter(item => !parseRestockInfo(item.vendor_result).container);
    const supplied = items.length - pending.length;
    const preview = items.slice(0, 5).map(item => {
      const restock = parseRestockInfo(item.vendor_result);
      return `<tr><td>${itemThumbHtml(item, caseRow)}</td><td><b>${safe(item.sn || '-')}</b><div class="small muted">${safe(item.spec || '-')}</div></td><td>${safe((item.problem_desc || '').slice(0, 60))}</td><td>${safe(restock.container || '待補料')}</td></tr>`;
    }).join('');
    return `<div class="lcd-summary">
      <div class="row"><span class="badge warn-b">待補料 ${pending.length}</span><span class="badge good-b">已補料 ${supplied}</span></div>
      <div class="table-wrap"><table class="lcd-mini-table"><thead><tr><th>照片</th><th>SN / 設備</th><th>問題</th><th>貨櫃</th></tr></thead><tbody>${preview || '<tr><td colspan="4" class="empty">尚無面板資料</td></tr>'}</tbody></table></div>
    </div>`;
  }

  function renderLocationReview(){
    if(!$('locationReviewList')) return;
    const loc = $('locationReviewLocation')?.value || '';
    const status = $('locationReviewStatus')?.value || '';
    const keyword = ($('locationReviewKeyword')?.value || '').trim().toLowerCase();
    let cases = visibleCases().filter(isLocationReviewCase);
    if(loc) cases = cases.filter(caseRow => caseRow.location_id === loc);
    if(status) cases = cases.filter(caseRow => caseRow.status === status);
    if(keyword){
      const itemCases = state.data.case_items.filter(item => [item.item_name, item.spec, item.sn, item.problem_desc].join(' ').toLowerCase().includes(keyword)).map(item => item.case_id);
      cases = cases.filter(caseRow => [caseRow.case_no, caseRow.title, caseRow.applicant_name, caseRow.owner_name, caseRow.description].join(' ').toLowerCase().includes(keyword) || itemCases.includes(caseRow.id));
    }
    const totalQty = state.data.case_items.filter(item => cases.some(caseRow => caseRow.id === item.case_id)).reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const overdue = cases.filter(caseRow => calcCase(caseRow).overdue);
    const pending = cases.filter(caseRow => !closedStatus.includes(caseRow.status));
    const pendingReview = cases.filter(needsReview);
    const rejectedReview = cases.filter(reviewRejected);
    $('locationReviewStats').innerHTML = [
      cardHtml('料品申請', cases.length, '目前篩選案件', 'blue'),
      cardHtml('待審核', pendingReview.length, '等待負責人確認', pendingReview.length ? 'warn' : 'good'),
      cardHtml('審核退回', rejectedReview.length, '等待申請人修正', rejectedReview.length ? 'bad' : 'good'),
      cardHtml('未結案', pending.length, '待處理申請', 'blue'),
      cardHtml('申請數量', totalQty, '品項需求總數', 'good'),
      cardHtml('逾期', overdue.length, '需追蹤', overdue.length ? 'bad' : 'good')
    ].join('');
    const groups = groupBy(cases, caseRow => caseRow.location_id || '未指定');
    $('locationReviewList').innerHTML = Object.entries(groups).map(([locationId, list]) => {
      const items = state.data.case_items.filter(item => list.some(caseRow => caseRow.id === item.case_id));
      return `<div class="item-box"><div class="row" style="justify-content:space-between"><h3 style="margin:0">${safe(locationName(locationId))}</h3><span class="badge blue-b">${list.length} 件 / ${items.length} 筆品項</span></div>
        <div class="table-wrap"><table><thead><tr><th>案件</th><th>申請人</th><th>負責人</th><th>審核</th><th>廠商</th><th>狀態</th><th>品項摘要</th><th>預計完成</th><th>操作</th></tr></thead><tbody>
        ${list.map(caseRow => { const its = state.data.case_items.filter(item => item.case_id === caseRow.id); return `<tr><td><b>${safe(caseRow.case_no)}</b><div>${safe(caseRow.title)}</div></td><td>${safe(caseRow.applicant_name || '-')}</td><td>${safe(caseRow.owner_name || '-')}</td><td>${reviewBadge(caseRow)}${caseRow.review_note ? `<div class="small muted">${safe(caseRow.review_note.slice(0, 40))}${caseRow.review_note.length > 40 ? '…' : ''}</div>` : ''}</td><td>${safe(vendorName(caseRow.vendor_id))}</td><td>${statusBadge(caseRow.status)}</td><td>${safe(its.map(item => `${item.item_name || '-'} x ${item.qty || 0}`).join('、') || '-')}</td><td>${dateText(caseRow.due_date)}</td><td><button class="btn ghost small-btn" onclick="window.VCS.openCase('${caseRow.id}')">查看</button></td></tr>`; }).join('')}
        </tbody></table></div></div>`;
    }).join('') || '<div class="empty">目前沒有符合條件的料品申請</div>';
  }

  function renderContainerBatches(){
    if(!$('containerBatchList')) return;
    const keyword = ($('containerKeyword')?.value || '').trim().toLowerCase();
    const vendor = $('containerVendor')?.value || '';
    const status = $('containerStatus')?.value || '';
    let cases = visibleMainCases().filter(caseRow => caseRow.case_type === '貨櫃送修');
    if(vendor) cases = cases.filter(caseRow => caseRow.vendor_id === vendor);
    if(status) cases = cases.filter(caseRow => caseRow.status === status);
    if(keyword) cases = cases.filter(caseRow => [caseRow.case_no, caseRow.tracking_no, caseRow.title, caseRow.description].join(' ').toLowerCase().includes(keyword));
    const groups = groupBy(cases, caseRow => caseRow.tracking_no || caseRow.case_no || '未填批號');
    $('containerBatchList').innerHTML = Object.entries(groups).map(([batchNo, list]) => {
      const items = state.data.case_items.filter(item => list.some(caseRow => caseRow.id === item.case_id));
      const qty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
      const done = items.reduce((sum, item) => sum + Number(item.completed_qty || 0), 0);
      const pending = Math.max(qty - done, 0);
      const overdue = list.filter(caseRow => calcCase(caseRow).overdue).length;
      return `<div class="item-box"><div class="row" style="justify-content:space-between"><div><h3 style="margin:0">${safe(batchNo)}</h3><div class="small muted">案件 ${list.length} 件｜品項 ${items.length} 筆｜廠商：${safe([...new Set(list.map(caseRow => vendorName(caseRow.vendor_id)))].join('、'))}</div></div>${overdue ? '<span class="badge bad-b">有逾期</span>' : '<span class="badge good-b">批次正常</span>'}</div>
        <div class="kpi-row"><div class="item-box"><b>總數量</b><div class="num-mini">${qty}</div></div><div class="item-box"><b>已完成</b><div class="num-mini good">${done}</div></div><div class="item-box"><b>未完成</b><div class="num-mini ${pending ? 'warn' : ''}">${pending}</div></div></div>
        <div class="table-wrap"><table><thead><tr><th>案件</th><th>狀態</th><th>品項</th><th>預計完成</th><th>操作</th></tr></thead><tbody>${list.map(caseRow => { const its = state.data.case_items.filter(item => item.case_id === caseRow.id); return `<tr><td><b>${safe(caseRow.case_no)}</b><div>${safe(caseRow.title)}</div></td><td>${statusBadge(caseRow.status)}</td><td>${safe(its.map(item => `${item.item_name || '-'} ${item.qty || 0}`).join('、') || '-')}</td><td>${dateText(caseRow.due_date)}</td><td><button class="btn ghost small-btn" onclick="window.VCS.openCase('${caseRow.id}')">查看</button></td></tr>`; }).join('')}</tbody></table></div></div>`;
    }).join('') || '<div class="empty">目前沒有貨櫃送修批次</div>';
  }

  function followupCases(){
    let rows = visibleMainCases().map(caseRow => ({ c:caseRow, calc:calcCase(caseRow) })).filter(row => row.calc.urgentNeedReply || row.calc.overdue || row.calc.noReply || isWaitVendorReplyStatus(row.c.status));
    const filter = state.followupFilter;
    if(filter === 'urgent') rows = rows.filter(row => row.calc.urgentNeedReply || row.c.priority === '急件' || row.c.priority === '重大');
    if(filter === 'overdue') rows = rows.filter(row => row.calc.overdue);
    if(filter === 'noReply') rows = rows.filter(row => row.calc.noReply || isWaitVendorReplyStatus(row.c.status));
    return rows.sort((a, b) => (Number(b.calc.urgentNeedReply) - Number(a.calc.urgentNeedReply)) || (b.calc.overdueDays - a.calc.overdueDays) || (b.calc.noReplyDays - a.calc.noReplyDays));
  }

  function renderVendorFollowup(){
    if(!$('vendorFollowupList')) return;
    const rows = followupCases();
    $('vendorFollowupList').innerHTML = rows.length ? rows.map(({ c, calc }) => {
      const msg = followupMessage(c, calc);
      return `<div class="item-box ${priorityRowClass(c.priority, calc)}"><div class="row" style="justify-content:space-between"><div><b>${safe(c.case_no)}</b> ${typeBadge(c.case_type)} ${priorityBadge(c.priority)} ${urgentBadge(calc)}</div>${reminderBadge(calc)}</div>
        <h3 style="margin:10px 0 8px">${safe(c.title)}</h3>
        <div class="grid-3 small muted"><div>廠商：${safe(vendorName(c.vendor_id))}</div><div>負責人：${safe(c.owner_name || '-')}</div><div>最後回覆：${dateTimeText(c.last_reply_at)}</div><div>預計完成：${dateText(c.due_date)}</div><div>狀態：${safe(c.status)}</div><div>單號：${safe(c.tracking_no || '-')} ${sfTrackingButtonHtml(c, 'tracking_no')}</div></div>
        <div class="dropzone small" style="margin-top:10px;white-space:pre-wrap">${safe(msg)}</div>
        <div class="row" style="margin-top:10px"><button class="btn ghost small-btn" onclick="window.VCS.copyFollowup('${c.id}')">複製催覆訊息</button><button class="btn small-btn" onclick="window.VCS.markVendorFollowed('${c.id}')">寫入已催覆紀錄</button><button class="btn ghost small-btn" onclick="window.VCS.openCase('${c.id}','replies')">查看回覆</button></div>
      </div>`;
    }).join('') : '<div class="empty">目前沒有需要催覆的廠商案件</div>';
  }

  function followupMessage(caseRow, calc=calcCase(caseRow)){
    return `廠商您好，請協助回覆案件進度。\n案件編號：${caseRow.case_no}\n案件名稱：${caseRow.title}\n目前狀態：${caseRow.status}\n優先度：${caseRow.priority}\n預計完成日：${dateText(caseRow.due_date)}\n${calc.overdue ? `已逾期：${calc.overdueDays} 天\n` : ''}${calc.noReply ? `未更新：${calc.noReplyDays} 天\n` : ''}請盡快回覆目前處理進度、預計完成日與是否需要我司補充資料。`;
  }

  return {
    vendorPortalCases,
    renderVendorPortal,
    renderLocationReview,
    renderContainerBatches,
    followupCases,
    renderVendorFollowup,
    followupMessage
  };
}
