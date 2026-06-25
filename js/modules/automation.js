export function createAutomationApi({
  state,
  uid,
  nowIso,
  toLocalDateInput,
  dateText,
  safe,
  dbInsert,
  dbUpdate,
  calcCase,
  isViewer,
  vendorName,
  reminderBadge
}){
  const AUTO_VENDOR_REMINDER_ACTION = '系統自動提醒廠商';

  function latestCaseActivityAt(c){
    const replies = state.data.case_replies
      .filter(reply => reply.case_id === c.id)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    const lastReply = replies[0]?.created_at;
    return lastReply || c.last_reply_at || c.vendor_received_date || c.ship_date || c.created_at || nowIso();
  }

  function autoReminderSentToday(c, todayKey=toLocalDateInput(new Date())){
    if(c.last_vendor_reminder_date === todayKey) return true;
    return state.data.case_logs.some(log =>
      log.case_id === c.id &&
      (log.action === AUTO_VENDOR_REMINDER_ACTION || String(log.action || '').includes('提醒廠商')) &&
      toLocalDateInput(log.created_at) === todayKey
    );
  }

  function isSchemaMissingError(err){
    const msg = String(err?.message || err || '').toLowerCase();
    return msg.includes('schema cache') ||
      msg.includes('column') ||
      msg.includes('overdue_status') ||
      msg.includes('vendor_reply_status') ||
      msg.includes('last_vendor_reminder_date') ||
      msg.includes('is_part_owner') ||
      msg.includes('is_sf_owner') ||
      msg.includes('is_container_owner') ||
      msg.includes('is_lcd_owner') ||
      msg.includes('is_bug_owner');
  }

  async function updateAutomationFields(c, patch){
    if(!Object.keys(patch).length) return false;
    if(!state.online){
      await dbUpdate('cases', c.id, patch);
      return true;
    }
    if(!state.automationFieldsAvailable) return false;

    try{
      await dbUpdate('cases', c.id, patch);
      return true;
    }catch(err){
      if(isSchemaMissingError(err)){
        state.automationFieldsAvailable = false;
        console.warn('自動檢查欄位尚未建立，請先執行 supabase_schema.sql', err);
        return false;
      }
      throw err;
    }
  }

  async function runDailyCaseAutomation(){
    if(isViewer()) return { changed:0, reminders:0 };
    const todayKey = toLocalDateInput(new Date());
    let changed = 0;
    let reminders = 0;
    const cases = [...state.data.cases];

    for(const c of cases){
      const calc = calcCase(c);
      const overdueStatus = !calc.open ? '已結案' : calc.overdue ? '已逾期' : calc.soon ? '快逾期' : '正常';
      const vendorReplyStatus = !calc.open ? '已結案' : calc.noReply ? '廠商未回覆' : '正常';
      const patch = {
        overdue_status: overdueStatus,
        overdue_days: calc.overdueDays || 0,
        vendor_reply_status: vendorReplyStatus,
        vendor_no_reply_days: calc.noReplyDays || 0,
        last_overdue_check_date: todayKey
      };

      Object.keys(patch).forEach(key => {
        const current = c[key];
        if(String(current ?? '') === String(patch[key] ?? '')) delete patch[key];
      });

      if(await updateAutomationFields(c, patch)) changed++;

      if(calc.noReply && !autoReminderSentToday(c, todayKey)){
        const reminderPatch = {
          last_vendor_reminder_date: todayKey,
          last_vendor_reminder_at: nowIso(),
          auto_reminder_count: Number(c.auto_reminder_count || 0) + 1,
          vendor_reply_status: '廠商未回覆',
          vendor_no_reply_days: calc.noReplyDays || 0
        };
        await updateAutomationFields(c, reminderPatch);
        await dbInsert('case_logs', {
          id:uid(),
          case_id:c.id,
          case_no:c.case_no,
          action:AUTO_VENDOR_REMINDER_ACTION,
          actor_name:'系統自動檢查',
          actor_role:'system',
          detail:`廠商 ${vendorName(c.vendor_id)} 已 ${calc.noReplyDays} 天未回覆 / 未更新進度，系統已產生提醒。`,
          created_at:nowIso()
        });
        reminders++;
      }
    }

    if(changed || reminders) console.info(`每日自動檢查完成：更新 ${changed} 件，提醒 ${reminders} 件`);
    return { changed: changed + reminders, reminders };
  }

  function automationStatusHtml(c){
    const calc = calcCase(c);
    const overdueStatus = !calc.open ? '已結案' : calc.overdue ? '已逾期' : calc.soon ? '快逾期' : '正常';
    const vendorReplyStatus = !calc.open ? '已結案' : calc.noReply ? '廠商未回覆' : '正常';
    return `<div class="item-box" style="margin-bottom:14px"><div class="row" style="justify-content:space-between"><div><b>每日自動檢查</b><div class="small muted">逾期狀態與廠商未回覆提醒每日開啟/重新整理時自動更新</div></div>${reminderBadge(calc)}</div><div class="grid-3 small muted" style="margin-top:10px"><div>逾期狀態：${safe(c.overdue_status || overdueStatus)}</div><div>逾期天數：${calc.overdueDays || 0} 天</div><div>檢查日期：${safe(c.last_overdue_check_date || toLocalDateInput(new Date()))}</div><div>廠商回覆狀態：${safe(c.vendor_reply_status || vendorReplyStatus)}</div><div>未回覆/未更新：${calc.noReplyDays || 0} 天</div><div>上次自動提醒：${dateText(c.last_vendor_reminder_date)}</div></div></div>`;
  }

  return {
    latestCaseActivityAt,
    autoReminderSentToday,
    isSchemaMissingError,
    updateAutomationFields,
    runDailyCaseAutomation,
    automationStatusHtml
  };
}
