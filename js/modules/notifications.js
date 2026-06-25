export function createNotificationStore({
  state,
  notifyKey,
  currentRole,
  nowIso
}){
  function notifyStoreKey(){
    return `${notifyKey}:${state.user?.id || state.profile?.display_name || currentRole()}`;
  }

  function readNotifications(){
    try{
      return JSON.parse(localStorage.getItem(notifyStoreKey()) || '{}');
    }catch(_){
      return {};
    }
  }

  function saveNotifications(map){
    localStorage.setItem(notifyStoreKey(), JSON.stringify(map || {}));
  }

  function isNoticeRead(id){
    return !!readNotifications()[id];
  }

  function markNoticeRead(id){
    const map = readNotifications();
    map[id] = nowIso();
    saveNotifications(map);
  }

  function markNoticeUnread(id){
    const map = readNotifications();
    delete map[id];
    saveNotifications(map);
  }

  function clearCaseNotifications(caseId){
    if(!caseId) return;
    const relatedNoticeIds = new Set();
    state.data.case_replies
      .filter(reply => reply.case_id === caseId)
      .forEach(reply => relatedNoticeIds.add(`reply-${reply.id}`));
    state.data.case_logs
      .filter(log => log.case_id === caseId)
      .forEach(log => relatedNoticeIds.add(`restock-${log.id}`));

    const map = readNotifications();
    let changed = false;
    Object.keys(map).forEach(id => {
      if(id.includes(caseId) || relatedNoticeIds.has(id)){
        delete map[id];
        changed = true;
      }
    });
    if(changed) saveNotifications(map);
  }

  return {
    notifyStoreKey,
    readNotifications,
    saveNotifications,
    isNoticeRead,
    markNoticeRead,
    markNoticeUnread,
    clearCaseNotifications
  };
}
