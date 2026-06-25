export function createDbApi({
  state,
  storageKey,
  uid,
  nowIso,
  isQuotaError,
  compactLocalDbForStorage,
  $,
  toast
}){
  function saveLocal(db=state.data){
    try{
      localStorage.setItem(storageKey, JSON.stringify(db));
    }catch(err){
      if(!isQuotaError(err)) throw err;
      try{
        const compacted = compactLocalDbForStorage(db, false);
        localStorage.setItem(storageKey, JSON.stringify(compacted));
        state.data = compacted;
        if($('toastWrap')) toast('本機儲存空間不足，已壓縮大型附件預覽。', 'warn');
      }catch(secondErr){
        if(!isQuotaError(secondErr)) throw secondErr;
        const compacted = compactLocalDbForStorage(db, true);
        localStorage.setItem(storageKey, JSON.stringify(compacted));
        state.data = compacted;
        if($('toastWrap')) toast('本機儲存空間不足，已改用附件佔位圖避免資料遺失。', 'warn');
      }
    }
  }

  async function dbInsert(table, row){
    if(state.online){
      const { data, error } = await state.client.from(table).insert(row).select('*').single();
      if(error) throw error;
      return data;
    }

    const newRow = { ...row, id: row.id || uid(), created_at: row.created_at || nowIso() };
    state.data[table].unshift(newRow);
    saveLocal();
    return newRow;
  }

  async function dbUpdate(table, id, patch){
    if(state.online){
      const { data, error } = await state.client.from(table).update(patch).eq('id', id).select('*').single();
      if(error) throw error;
      return data;
    }

    const list = state.data[table];
    const idx = list.findIndex(row => row.id === id);
    if(idx >= 0) list[idx] = { ...list[idx], ...patch };
    saveLocal();
    return list[idx];
  }

  async function dbDelete(table, id){
    if(state.online){
      const { error } = await state.client.from(table).delete().eq('id', id);
      if(error) throw error;
      return true;
    }

    state.data[table] = state.data[table].filter(row => row.id !== id);
    saveLocal();
    return true;
  }

  return {
    saveLocal,
    dbInsert,
    dbUpdate,
    dbDelete
  };
}
