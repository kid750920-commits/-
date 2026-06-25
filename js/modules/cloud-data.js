export function createCloudDataApi({
  state,
  cloudPageSize,
  emptyData,
  $,
  renderCaseModal,
  errorBanner
}){
  async function loadCloudData(){
    const data = emptyData();
    const mainTables = ['vendors', 'locations', 'profiles', 'cases', 'case_items', 'case_replies'];
    const limitedTables = { case_attachments: 500, case_logs: 300 };

    for(const table of mainTables){
      const orderCol = table === 'cases' ? 'updated_at' : 'created_at';
      data[table] = await fetchCloudRows(table, { orderCol, ascending: false });
    }

    for(const [table, limit] of Object.entries(limitedTables)){
      data[table] = await fetchCloudRows(table, { orderCol: 'created_at', ascending: false, limit });
    }

    state.data = data;
    resetCaseDetailLoaded();
  }

  async function fetchCloudRows(table, options={}){
    const pageSize = Math.max(1, Number(options.pageSize || cloudPageSize));
    const limit = Number(options.limit || 0);
    const orderCol = options.orderCol || 'created_at';
    const ascending = !!options.ascending;
    const rows = [];
    let from = 0;

    while(true){
      const remaining = limit ? Math.max(limit - rows.length, 0) : pageSize;
      if(limit && remaining <= 0) break;

      const size = limit ? Math.min(pageSize, remaining) : pageSize;
      const to = from + size - 1;
      const { data: batch, error } = await state.client
        .from(table)
        .select('*')
        .order(orderCol, { ascending })
        .range(from, to);

      if(error) throw error;

      const chunk = batch || [];
      rows.push(...chunk);
      if(chunk.length < size) break;
      from += size;
    }

    return rows;
  }

  function resetCaseDetailLoaded(){
    state.caseDetailLoaded = { case_attachments: new Set(), case_logs: new Set() };
    state.caseDetailLoading = {};
  }

  function mergeCloudRows(table, rows){
    const byId = new Map((state.data[table] || []).map(row => [row.id, row]));
    (rows || []).forEach(row => byId.set(row.id, row));
    state.data[table] = [...byId.values()].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  async function ensureCaseDetailRows(caseId, table, tab){
    if(!state.online || !state.client || !caseId) return;
    if(!state.caseDetailLoaded[table]) state.caseDetailLoaded[table] = new Set();
    if(state.caseDetailLoaded[table].has(caseId)) return;

    const key = `${table}:${caseId}`;
    if(state.caseDetailLoading[key]) return;
    state.caseDetailLoading[key] = true;

    try{
      const { data: rows, error } = await state.client
        .from(table)
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if(error) throw error;

      mergeCloudRows(table, rows || []);
      state.caseDetailLoaded[table].add(caseId);
      if(state.selectedCase?.id === caseId && state.modalTab === tab) renderCaseModal(tab);
    }catch(err){
      console.error(err);
      errorBanner(err.message || '案件明細載入失敗', $('modalContent'));
    }finally{
      delete state.caseDetailLoading[key];
    }
  }

  return {
    loadCloudData,
    fetchCloudRows,
    resetCaseDetailLoaded,
    mergeCloudRows,
    ensureCaseDetailRows
  };
}
