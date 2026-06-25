export function createPermissionsApi({
  state,
  accountFromAuthEmail,
  byId
}){
  function currentAccountName(){
    return state.profile?.username || accountFromAuthEmail(state.user?.email) || '';
  }

  function displayAccountValue(value){
    return accountFromAuthEmail(value);
  }

  function currentName(){
    return state.profile?.display_name || currentAccountName() || '訪客';
  }

  function currentRole(){
    return state.profile?.role || state.user?.role || 'viewer';
  }

  function currentUserId(){
    return state.user?.id || state.profile?.id || null;
  }

  function roleName(role){
    return ({ admin:'管理者', operator:'作業員', vendor:'廠商', viewer:'訪客檢視' })[role] || role || '訪客檢視';
  }

  function isAdmin(){
    return currentRole() === 'admin';
  }

  function isVendor(){
    return currentRole() === 'vendor';
  }

  function isViewer(){
    return currentRole() === 'viewer';
  }

  function currentReplyRole(){
    return isVendor() ? '廠商' : '公司';
  }

  function currentAccountLabel(){
    const parts = [currentName(), roleName(currentRole())];
    const account = currentAccountName();
    if(account) parts.push('帳號：' + account);
    return parts.filter(Boolean).join('｜');
  }

  function canCreate(){
    return !isViewer() && !isVendor();
  }

  function canEditCase(c){
    return !isViewer() && (!isVendor() || c.vendor_id === state.profile?.vendor_id);
  }

  function canEditCore(){
    return !isViewer() && !isVendor();
  }

  function canDeleteCase(c){
    if(!c || isViewer() || isVendor()) return false;
    const userId = currentUserId();
    return isAdmin() || (!!userId && c.created_by === userId);
  }

  function identityText(value){
    return String(value || '').trim().toLowerCase();
  }

  function currentIdentitySet(){
    return new Set([
      currentName(),
      currentAccountName(),
      state.profile?.username,
      state.profile?.display_name,
      state.profile?.email,
      state.user?.email,
      accountFromAuthEmail(state.user?.email)
    ].map(identityText).filter(Boolean));
  }

  function caseReturnLocationBelongsToCurrentUser(c){
    const returnLocationId = c?.return_location_id;
    if(!returnLocationId) return false;
    if(state.profile?.location_id && state.profile.location_id === returnLocationId) return true;
    const loc = byId(state.data.locations, returnLocationId);
    if(!loc?.manager_name) return false;
    return currentIdentitySet().has(identityText(loc.manager_name));
  }

  function caseBelongsToCurrentUser(c){
    const userId = currentUserId();
    if(userId && c.created_by && c.created_by === userId) return true;
    const identities = currentIdentitySet();
    return [c.owner_name, c.applicant_name].some(value => identities.has(identityText(value))) ||
      caseReturnLocationBelongsToCurrentUser(c);
  }

  function shouldShowPersonalCaseNotice(c){
    if(isViewer()) return false;
    if(isVendor()) return true;
    return caseBelongsToCurrentUser(c);
  }

  return {
    currentAccountName,
    displayAccountValue,
    currentName,
    currentRole,
    currentUserId,
    currentReplyRole,
    currentAccountLabel,
    roleName,
    isAdmin,
    isVendor,
    isViewer,
    canCreate,
    canEditCase,
    canEditCore,
    canDeleteCase,
    identityText,
    currentIdentitySet,
    caseBelongsToCurrentUser,
    caseReturnLocationBelongsToCurrentUser,
    shouldShowPersonalCaseNotice
  };
}
