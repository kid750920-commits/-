export function createRealtimeSync({
  state,
  cloudTables,
  closeModal,
  hydrateSelectOptions,
  updateUserUi,
  renderAll,
  refreshAll,
  updateNotificationUi
}){
  function startRealtimeSync(){
    if(!state.online || !state.client) return;
    stopRealtimeSync();

    let channel = state.client.channel('vcs-shared-data');
    cloudTables.forEach(table => {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, handleRealtimeChange);
    });

    state.realtimeChannel = channel.subscribe(status => {
      if(status === 'SUBSCRIBED') console.info('Supabase realtime sync enabled');
      if(status === 'CHANNEL_ERROR') console.warn('Supabase realtime sync channel error');
    });
  }

  function stopRealtimeSync(){
    if(state.realtimeRefreshTimer){
      clearTimeout(state.realtimeRefreshTimer);
      state.realtimeRefreshTimer = null;
    }

    if(state.client && state.realtimeChannel){
      state.client.removeChannel(state.realtimeChannel);
    }

    state.realtimeChannel = null;
  }

  function handleRealtimeChange(payload){
    applyRealtimePayload(payload);
    scheduleRealtimeRefresh();
  }

  function applyRealtimePayload(payload){
    const table = payload?.table;
    const eventType = payload?.eventType;
    const row = eventType === 'DELETE' ? payload?.old : payload?.new;
    if(!table || !row?.id || !state.data[table]) return;

    if(eventType === 'DELETE'){
      state.data[table] = state.data[table].filter(item => item.id !== row.id);
      if(table === 'cases'){
        state.data.case_items = state.data.case_items.filter(item => item.case_id !== row.id);
        state.data.case_replies = state.data.case_replies.filter(item => item.case_id !== row.id);
        state.data.case_attachments = state.data.case_attachments.filter(item => item.case_id !== row.id);
        state.data.case_logs = state.data.case_logs.filter(item => item.case_id !== row.id);
        if(state.selectedCase?.id === row.id) closeModal();
      }
    }else{
      const index = state.data[table].findIndex(item => item.id === row.id);
      if(index >= 0) state.data[table][index] = { ...state.data[table][index], ...row };
      else state.data[table].unshift(row);
    }

    hydrateSelectOptions();
    updateUserUi();
    renderAll();
  }

  function scheduleRealtimeRefresh(){
    if(!state.online) return;
    if(state.realtimeRefreshTimer) clearTimeout(state.realtimeRefreshTimer);

    state.realtimeRefreshTimer = setTimeout(async () => {
      state.realtimeRefreshTimer = null;
      await refreshAll({ silent: true });
      updateNotificationUi();
    }, 500);
  }

  return {
    startRealtimeSync,
    stopRealtimeSync,
    handleRealtimeChange,
    applyRealtimePayload,
    scheduleRealtimeRefresh
  };
}
