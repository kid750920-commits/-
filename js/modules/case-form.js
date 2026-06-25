const NEW_CASE_DRAFT_FIELDS = [
  'caseType',
  'caseTitle',
  'priority',
  'locationId',
  'vendorId',
  'ownerName',
  'applicantName',
  'shipDate',
  'dueDate',
  'trackingNo',
  'returnTrackingNo',
  'returnLocationId',
  'reminderDays',
  'description'
];

export function createCaseFormApi({
  state,
  draftKey,
  $,
  onTypeChange,
  renderItemsDraftSummary,
  toast
}){
  function newCaseDraftFields(){
    return [...NEW_CASE_DRAFT_FIELDS];
  }

  function bindNewCaseDraft(){
    newCaseDraftFields().forEach(id => {
      const el = $(id);
      if(!el) return;
      el.addEventListener('input', saveNewCaseDraft);
      el.addEventListener('change', saveNewCaseDraft);
    });
  }

  function saveNewCaseDraft(){
    const draft = {};
    newCaseDraftFields().forEach(id => {
      const el = $(id);
      if(el) draft[id] = el.value;
    });
    sessionStorage.setItem(draftKey, JSON.stringify(draft));
  }

  function restoreNewCaseDraft(){
    if(state.draftRestored) return;
    try{
      const draft = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
      if(!draft) return;

      newCaseDraftFields().forEach(id => {
        const el = $(id);
        if(el && draft[id] != null) el.value = draft[id];
      });
      state.draftRestored = true;
      onTypeChange();
      renderItemsDraftSummary();
      toast('已還原尚未送出的新增案件草稿', 'warn');
    }catch(_){}
  }

  function clearNewCaseDraft(){
    sessionStorage.removeItem(draftKey);
    state.draftRestored = false;
  }

  return {
    newCaseDraftFields,
    bindNewCaseDraft,
    saveNewCaseDraft,
    restoreNewCaseDraft,
    clearNewCaseDraft
  };
}
