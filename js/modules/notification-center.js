export function createNotificationCenter({
  state,
  notificationStore,
  $,
  safe,
  nowIso,
  toLocalDateInput,
  dateText,
  dateTimeText,
  visibleCases,
  normalizeCaseType,
  isVendor,
  isViewer,
  isPartCase,
  isLcdCase,
  needsReview,
  reviewRejected,
  canReviewCase,
  caseApplicantMatchesCurrentUser,
  caseCreatedByCurrentUser,
  shouldShowPersonalCaseNotice,
  partOwnerName,
  locationName,
  returnLocationName,
  displayAccountValue,
  currentName,
  calcCase,
  vendorName,
  latestCaseActivityAt,
  cardHtml,
  priorityBadge,
  toast
}){
  function getNotificationItems(){
    const cases = visibleCases();
    const caseMap = new Map(cases.map(caseRow => [caseRow.id, caseRow]));
    const items = [];
    const reads = notificationStore.readNotifications();
    const targetReplyRole = isVendor() ? '公司' : '廠商';

    cases.forEach(caseRow => {
      if(isVendor()){
        const id = `vendor-new-${caseRow.id}-${caseRow.created_at || ''}`;
        items.push({
          id,
          kind:'vendorNewCase',
          title:'新案件通知',
          case:caseRow,
          created_at:caseRow.created_at || caseRow.updated_at,
          message:`我司新增了案件「${caseRow.title}」，請確認案件內容、品項與預計處理時程。`,
          meta:`案件類型：${normalizeCaseType(caseRow.case_type)}｜送修地點：${locationName(caseRow.location_id)}｜回寄地點：${returnLocationName(caseRow)}｜${dateTimeText(caseRow.created_at)}`,
          read:!!reads[id]
        });
      }
      if(isViewer() || isVendor() || !isPartCase(caseRow)) return;
      if(needsReview(caseRow) && canReviewCase(caseRow)){
        const id = `review-request-${caseRow.id}-${caseRow.updated_at || caseRow.created_at || ''}`;
        items.push({
          id,
          kind:'reviewRequest',
          title:'維修料品申請待審核',
          case:caseRow,
          created_at:caseRow.updated_at || caseRow.created_at,
          message:`${caseRow.applicant_name || '申請人'} 建立了維修料品申請，請確認內容是否可送入正式總表。\n\n審核通過後會進入總表；若不通過，請填寫原因退回給申請人修正。`,
          meta:`申請人：${caseRow.applicant_name || '-'}｜負責人：${caseRow.owner_name || '-'}｜地點：${locationName(caseRow.location_id)}｜${dateTimeText(caseRow.created_at)}`,
          read:false
        });
      }
      if(needsReview(caseRow) && caseApplicantMatchesCurrentUser(caseRow) && !canReviewCase(caseRow)){
        const id = `review-pending-${caseRow.id}-${caseRow.updated_at || caseRow.created_at || ''}`;
        items.push({
          id,
          kind:'reviewPending',
          title:'維修料品申請等待審核',
          case:caseRow,
          created_at:caseRow.updated_at || caseRow.created_at,
          message:'你的維修料品申請已送出，正在等待維修料品負責人或管理者審核。審核通過後才會進入總表。',
          meta:`審核負責人：${caseRow.owner_name || partOwnerName() || '-'}｜地點：${locationName(caseRow.location_id)}｜${dateTimeText(caseRow.created_at)}`,
          read:false
        });
      }
      if(reviewRejected(caseRow) && caseApplicantMatchesCurrentUser(caseRow)){
        const id = `review-rejected-${caseRow.id}-${caseRow.reviewed_at || caseRow.updated_at || ''}`;
        items.push({
          id,
          kind:'reviewRejected',
          title:'維修料品申請審核退回',
          case:caseRow,
          created_at:caseRow.reviewed_at || caseRow.updated_at || caseRow.created_at,
          message:`你的維修料品申請未通過審核，請依退回原因修正後重新送審。\n\n退回原因：${caseRow.review_note || '未填寫原因'}`,
          meta:`審核人：${caseRow.reviewed_by || '-'}｜負責人：${caseRow.owner_name || '-'}｜地點：${locationName(caseRow.location_id)}｜${dateTimeText(caseRow.reviewed_at || caseRow.updated_at)}`,
          read:!!reads[id]
        });
      }
    });

    state.data.case_replies.forEach(reply => {
      const caseRow = caseMap.get(reply.case_id);
      if(!caseRow || isViewer()) return;
      if(!shouldShowPersonalCaseNotice(caseRow)) return;
      if((reply.reply_by || '') === currentName()) return;
      if(reply.reply_role !== targetReplyRole) return;
      const id = `reply-${reply.id}`;
      items.push({
        id,
        kind:'reply',
        title:`${reply.reply_role}有新回覆`,
        case:caseRow,
        created_at:reply.created_at,
        message:reply.message,
        meta:`回覆者：${reply.reply_by || '-'}${reply.reply_by_email ? '｜帳號：' + displayAccountValue(reply.reply_by_email) : ''}｜通知帳號：${currentName()}｜回寄地點：${returnLocationName(caseRow)}｜${dateTimeText(reply.created_at)}`,
        read:!!reads[id]
      });
    });

    cases.forEach(caseRow => {
      if(!shouldShowPersonalCaseNotice(caseRow)) return;
      const calc = calcCase(caseRow);
      if(!calc.urgentNeedReply) return;
      const id = `urgent-${caseRow.id}-${caseRow.updated_at || caseRow.last_reply_at || caseRow.status || ''}`;
      items.push({
        id,
        kind:'urgent',
        title:`${caseRow.priority}需盡快回覆`,
        case:caseRow,
        created_at:caseRow.updated_at || caseRow.created_at,
        message:`${caseRow.priority}案件已 ${calc.noReplyDays} 天未有有效回覆，建議立即催覆或更新進度。`,
        meta:`廠商：${vendorName(caseRow.vendor_id)}｜回寄地點：${returnLocationName(caseRow)}｜狀態：${caseRow.status}｜提醒門檻：${calc.urgentThreshold} 天`,
        read:!!reads[id]
      });
    });

    cases.forEach(caseRow => {
      if(!shouldShowPersonalCaseNotice(caseRow)) return;
      const calc = calcCase(caseRow);
      if(!calc.noReply) return;
      const todayKey = toLocalDateInput(new Date());
      const id = `vendor-reminder-${caseRow.id}-${caseRow.last_vendor_reminder_date || todayKey}`;
      items.push({
        id,
        kind:'vendorReminder',
        title:isVendor() ? '請回覆案件進度' : '廠商未回覆自動提醒',
        case:caseRow,
        created_at:caseRow.last_vendor_reminder_at || caseRow.updated_at || caseRow.created_at,
        message:isVendor()
          ? `此案件已 ${calc.noReplyDays} 天未更新進度，已超過提醒天數 ${caseRow.reminder_days || 7} 天。請回覆目前處理進度、預計完成日與是否需要我司補充資料。`
          : `廠商已 ${calc.noReplyDays} 天未回覆 / 未更新進度，已超過提醒天數 ${caseRow.reminder_days || 7} 天。請催覆廠商，或請廠商登入工作台回覆最新進度。`,
        meta:`廠商：${vendorName(caseRow.vendor_id)}｜回寄地點：${returnLocationName(caseRow)}｜預計完成：${dateText(caseRow.due_date)}｜最後活動：${dateTimeText(latestCaseActivityAt(caseRow))}`,
        read:!!reads[id]
      });
    });

    state.data.case_logs.forEach(log => {
      if(log.action !== '補料登記通知') return;
      const caseRow = caseMap.get(log.case_id);
      if(!caseRow || !isLcdCase(caseRow)) return;
      if(!shouldShowPersonalCaseNotice(caseRow)) return;
      if((log.actor_name || '') === currentName()) return;
      const id = `restock-${log.id}`;
      items.push({
        id,
        kind:'restock',
        title:'液晶面板補料通知',
        case:caseRow,
        created_at:log.created_at,
        message:log.detail || '液晶面板補料已登記，請確認本次補料對應的 SN 與貨櫃號碼。',
        meta:`操作人：${log.actor_name || '-'}｜通知帳號：${currentName()}｜回寄地點：${returnLocationName(caseRow)}｜${dateTimeText(log.created_at)}`,
        read:!!reads[id]
      });
    });

    return items.sort((a, b) =>
      Number(a.read) - Number(b.read)
      || notificationPriority(a) - notificationPriority(b)
      || new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
  }

  function notificationPriority(notice){
    const order = {
      reviewRequest:0,
      vendorNewCase:1,
      urgent:2,
      vendorReminder:3,
      reviewRejected:4,
      reviewPending:5,
      restock:6,
      reply:7
    };
    return order[notice.kind] ?? 9;
  }

  function updateNotificationUi(){
    if(!$('notificationCount')) return;
    const items = getNotificationItems();
    const unread = items.filter(notice => !notice.read).length;
    $('notificationCount').textContent = unread;
    $('notificationCount').classList.toggle('hidden', unread === 0);
    $('notificationBtn')?.classList.toggle('attention', unread > 0);
    const navBadge = $('navNotificationCount');
    if(navBadge){
      navBadge.textContent = unread;
      navBadge.classList.toggle('hidden', unread === 0);
    }
    const navNotificationBtn = document.querySelector('[data-section="notifications"]');
    if(navNotificationBtn){
      navNotificationBtn.classList.toggle('has-unread', unread > 0);
      navNotificationBtn.title = unread > 0 ? `有 ${unread} 則未讀通知` : '目前沒有未讀通知';
    }
  }

  function renderNotifications(){
    if(!$('notificationList')) return;
    let items = getNotificationItems();
    const filter = state.notificationFilter;
    if(filter === 'unread') items = items.filter(notice => !notice.read);
    if(filter === 'reply') items = items.filter(notice => notice.kind === 'reply');
    if(filter === 'review') items = items.filter(notice => notice.kind === 'reviewRequest' || notice.kind === 'reviewPending' || notice.kind === 'reviewRejected');
    if(filter === 'urgent') items = items.filter(notice => notice.kind === 'urgent');
    if(filter === 'restock') items = items.filter(notice => notice.kind === 'restock');
    if(filter === 'vendorNewCase') items = items.filter(notice => notice.kind === 'vendorNewCase');
    if(filter === 'vendorReminder') items = items.filter(notice => notice.kind === 'vendorReminder');

    const allItems = getNotificationItems();
    const unread = allItems.filter(notice => !notice.read).length;
    const replyUnread = allItems.filter(notice => notice.kind === 'reply' && !notice.read).length;
    const reviewUnread = allItems.filter(notice => (notice.kind === 'reviewRequest' || notice.kind === 'reviewPending' || notice.kind === 'reviewRejected') && !notice.read).length;
    const urgentUnread = allItems.filter(notice => notice.kind === 'urgent' && !notice.read).length;
    const vendorNewUnread = allItems.filter(notice => notice.kind === 'vendorNewCase' && !notice.read).length;
    const restockUnread = allItems.filter(notice => notice.kind === 'restock' && !notice.read).length;
    $('notificationSummary').innerHTML = [
      cardHtml('未讀通知', unread, '新回覆與急件催覆', unread ? 'warn' : 'good'),
      cardHtml('新回覆', replyUnread, isVendor() ? '公司回覆需要查看' : '廠商回覆需要查看', replyUnread ? 'warn' : 'good'),
      cardHtml('審核通知', reviewUnread, '待審核或退回修正', reviewUnread ? 'warn' : 'good'),
      cardHtml('急件催覆', urgentUnread, '急件/重大需盡快回覆', urgentUnread ? 'bad' : 'good'),
      cardHtml('廠商新案件', vendorNewUnread, '廠商需查看的新案件', vendorNewUnread ? 'warn' : 'good'),
      cardHtml('補料通知', restockUnread, '液晶面板補料對應', restockUnread ? 'warn' : 'good'),
      cardHtml('全部通知', allItems.length, '目前可查看通知', 'blue')
    ].join('');
    $('notificationList').innerHTML = items.length ? items.map(notificationRow).join('') : '<div class="empty">目前沒有通知</div>';
    updateNotificationUi();
  }

  function notificationRow(notice){
    const originalKind = notice.kind;
    if(notice.kind === 'reviewPending') notice = { ...notice, kind:'reviewRequest' };
    const canAcknowledge = canAcknowledgeNotification(notice);
    let badge = notice.kind === 'urgent' ? '<span class="badge bad-b">急件催覆</span>' : notice.kind === 'vendorNewCase' ? '<span class="badge blue-b">新案件</span>' : notice.kind === 'vendorReminder' ? '<span class="badge violet-b">廠商未回覆</span>' : notice.kind === 'restock' ? '<span class="badge blue-b">補料通知</span>' : notice.kind === 'reviewRequest' ? '<span class="badge warn-b">待審核</span>' : notice.kind === 'reviewRejected' ? '<span class="badge bad-b">審核退回</span>' : '<span class="badge warn-b">新回覆</span>';
    if(originalKind === 'reviewPending') badge = '<span class="badge warn-b">等待審核</span>';
    const read = notice.read ? '<span class="badge good-b">已讀/已知悉</span>' : '<span class="badge bad-b">未讀</span>';
    const targetTab = notice.kind === 'restock' ? 'items' : (notice.kind === 'reviewRequest' || notice.kind === 'reviewRejected' || notice.kind === 'vendorNewCase') ? 'basic' : 'replies';
    const targetText = notice.kind === 'restock' ? '查看補料對應' : (notice.kind === 'reviewRequest' || notice.kind === 'reviewRejected') ? '查看審核資料' : notice.kind === 'vendorNewCase' ? '查看新案件' : '查看案件回覆';
    return `<div class="item-box notice-box ${notice.read ? 'notice-read' : 'notice-unread'}">
      <div class="row" style="justify-content:space-between"><div><b>${safe(notice.title)}</b> ${badge} ${priorityBadge(notice.case.priority)}</div>${read}</div>
      <div style="margin:8px 0"><b>${safe(notice.case.case_no)}</b>｜${safe(notice.case.title)}</div>
      <div class="small muted">${safe(notice.meta)}</div>
      <p style="white-space:pre-wrap;line-height:1.7">${safe(notice.message)}</p>
      <div class="row"><button class="btn ghost small-btn" onclick="window.VCS.openNotification('${notice.id}','${notice.case.id}','${targetTab}')">${targetText}</button>${canAcknowledge ? (!notice.read ? `<button class="btn small-btn" onclick="window.VCS.markNotificationRead('${notice.id}')">標記已讀/知悉</button>` : `<button class="btn ghost small-btn" onclick="window.VCS.markNotificationUnread('${notice.id}')">改為未讀</button>`) : `<span class="small muted">${safe(notificationLockedText(notice))}</span>`}</div>
    </div>`;
  }

  function canAcknowledgeNotification(notice){
    if(notice?.kind === 'reply') return true;
    if(notice?.kind === 'reviewRequest' || notice?.kind === 'reviewPending') return false;
    return !caseCreatedByCurrentUser(notice?.case);
  }

  function notificationLockedText(notice){
    if(notice?.kind === 'reviewRequest' || notice?.kind === 'reviewPending') return '審核通過/退回後才會扣除通知';
    return '自己建立的案件不可標記已讀/知悉';
  }

  async function acknowledgeNotification(notice){
    if(!notice || !canAcknowledgeNotification(notice)) return;
    notificationStore.markNoticeRead(notice.id);
  }

  function markCaseRepliesRead(caseId){
    const items = getNotificationItems().filter(notice => notice.kind === 'reply' && notice.case.id === caseId && canAcknowledgeNotification(notice));
    if(!items.length) return;
    const map = notificationStore.readNotifications();
    items.forEach(notice => { map[notice.id] = nowIso(); });
    notificationStore.saveNotifications(map);
    updateNotificationUi();
  }

  async function markAllNotificationsRead(){
    const map = notificationStore.readNotifications();
    const items = getNotificationItems().filter(canAcknowledgeNotification);
    for(const notice of items){
      map[notice.id] = nowIso();
    }
    notificationStore.saveNotifications(map);
    renderNotifications();
    toast('通知已全部標記已讀/知悉');
  }

  function clearCaseNotifications(caseId){
    return notificationStore.clearCaseNotifications(caseId);
  }

  return {
    getNotificationItems,
    updateNotificationUi,
    renderNotifications,
    canAcknowledgeNotification,
    acknowledgeNotification,
    markCaseRepliesRead,
    markAllNotificationsRead,
    clearCaseNotifications
  };
}
