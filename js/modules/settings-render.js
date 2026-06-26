export function createSettingsRenderer({
  state,
  moduleOwnerFields,
  $,
  safe,
  isAdmin,
  currentName,
  currentRole,
  currentUserId,
  roleName,
  displayAccountValue,
  accountFromAuthEmail,
  profileSelectOptions,
  getConfig
}){
  function renderSettings(){
    if(!$('vendorsList')) return;
    $('vendorsList').innerHTML = state.data.vendors.map(vendor => `<div class="item-box"><div class="row" style="justify-content:space-between"><div><b>${safe(vendor.vendor_name)}</b><div class="small muted">聯絡人：${safe(vendor.contact_person || '-')}｜Email：${safe(vendor.email || '-')}｜提醒：${vendor.default_sla_days || '-'} 天</div></div>${vendor.is_active === false ? '<span class="badge bad-b">停用</span>' : '<span class="badge good-b">啟用</span>'}</div><div class="row" style="margin-top:10px"><button class="btn ghost small-btn" onclick="window.VCS.toggleVendor('${vendor.id}')">${vendor.is_active === false ? '啟用' : '停用'}</button>${isAdmin() ? `<button class="btn ghost small-btn" onclick="window.VCS.deleteVendor('${vendor.id}')">刪除</button>` : ''}</div></div>`).join('') || '<div class="empty">尚無廠商</div>';
    $('locationsList').innerHTML = state.data.locations.map(location => `<div class="item-box" data-location-id="${safe(location.id)}"><div class="row" style="justify-content:space-between"><div><b>${safe(location.location_name)}</b><div class="small muted">負責人：${safe(location.manager_name || '-')}</div></div>${location.is_active === false ? '<span class="badge bad-b">停用</span>' : '<span class="badge good-b">啟用</span>'}</div>
      <div class="grid-2" style="margin-top:10px">
        <div class="field"><label>地點名稱</label><input data-location-field="location_name" value="${safe(location.location_name || '')}"></div>
        <div class="field"><label>地點負責人</label><select data-location-field="manager_name">${profileSelectOptions(location.manager_name || '', '未指定')}</select></div>
      </div>
      <div class="row" style="margin-top:10px"><button class="btn small-btn" onclick="window.VCS.saveLocation('${safe(location.id)}')">儲存地點</button><button class="btn ghost small-btn" onclick="window.VCS.toggleLocation('${safe(location.id)}')">${location.is_active === false ? '啟用' : '停用'}</button>${isAdmin() ? `<button class="btn ghost small-btn" onclick="window.VCS.deleteLocation('${safe(location.id)}')">刪除</button>` : ''}</div></div>`).join('') || '<div class="empty">尚無地點</div>';
    $('profileInfo').innerHTML = `
      <div class="kpi-row">
        <div class="item-box"><b>登入名稱</b><div class="muted">${safe(currentName())}</div></div>
        <div class="item-box"><b>角色</b><div class="muted">${safe(roleName(currentRole()))}</div></div>
        <div class="item-box"><b>資料模式</b><div class="muted">${state.online ? 'Supabase 雲端模式' : '本機展示模式'}</div></div>
      </div>
      <div class="hint" style="margin-top:14px">角色權限：管理者可維護設定與刪除基本資料；作業員可新增與編輯案件；廠商只能查看分配給自己的案件並回覆進度；訪客只能檢視。</div>`;
    renderAdminCloudConfig();
    renderAccountAdminList();
  }

  function renderAdminCloudConfig(){
    const panel = $('adminCloudConfig');
    const body = $('adminCloudConfigInfo');
    if(!panel || !body) return;
    panel.classList.toggle('hidden', !isAdmin());
    if(!isAdmin()){
      body.innerHTML = '';
      return;
    }
    const cfg = getConfig();
    const maskedKey = cfg.key ? `${cfg.key.slice(0, 16)}...${cfg.key.slice(-8)}` : '未設定';
    body.innerHTML = `<div class="grid-2">
      <div class="item-box"><b>Supabase URL</b><div class="muted">${safe(cfg.url || '未設定')}</div></div>
      <div class="item-box"><b>Publishable / anon key</b><div class="muted">${safe(maskedKey)}</div></div>
    </div>
    <div class="hint" style="margin-top:12px">線上版已由 config.js 內建雲端設定；一般使用者登入頁不顯示 URL / key，避免誤操作。</div>`;
  }

  function moduleOwnerCheckboxes(profile){
    return moduleOwnerFields.map(item =>
      `<label class="small" style="display:block;margin:2px 0"><input type="checkbox" data-profile-field="${item.field}" ${profile[item.field] ? 'checked' : ''}> ${safe(item.label)}</label>`
    ).join('');
  }

  function renderAccountAdminList(){
    if(!$('accountAdminList')) return;
    if(!isAdmin()){
      $('accountAdminList').innerHTML = '<div class="hint">只有管理者可以調整帳號權限。</div>';
      return;
    }
    const profiles = state.data.profiles || [];
    if(!profiles.length){
      $('accountAdminList').innerHTML = '<div class="hint">尚無帳號。第一個註冊帳號會自動成為管理者，後續註冊預設為作業員。</div>';
      return;
    }
    const roleOptions = [
      ['admin','管理者'],
      ['operator','作業員'],
      ['vendor','廠商'],
      ['viewer','訪客']
    ];
    const vendorOptions = ['<option value="">未指定</option>'].concat(state.data.vendors.map(vendor => `<option value="${safe(vendor.id)}">${safe(vendor.vendor_name)}</option>`)).join('');
    const locationOptions = ['<option value="">未指定</option>'].concat(state.data.locations.map(location => `<option value="${safe(location.id)}">${safe(location.location_name)}</option>`)).join('');
    $('accountAdminList').innerHTML = `<div class="table-wrap account-admin-wrap"><table><thead><tr><th>帳號</th><th>名稱</th><th>角色</th><th>廠商</th><th>地點</th><th>模組主要負責人</th><th>狀態</th><th>操作</th></tr></thead><tbody>${profiles.map(profile => {
      const isSelf = profile.id === currentUserId();
      const roleSelect = `<select data-profile-field="role" ${isSelf ? 'disabled' : ''}>${roleOptions.map(([value, label]) => `<option value="${value}" ${profile.role === value ? 'selected' : ''}>${label}</option>`).join('')}</select>`;
      const vendorSelect = `<select data-profile-field="vendor_id">${vendorOptions.replace(`value="${safe(profile.vendor_id || '')}"`, `value="${safe(profile.vendor_id || '')}" selected`)}</select>`;
      const locationSelect = `<select data-profile-field="location_id">${locationOptions.replace(`value="${safe(profile.location_id || '')}"`, `value="${safe(profile.location_id || '')}" selected`)}</select>`;
      return `<tr data-profile-id="${safe(profile.id)}">
        <td><b>${safe(profile.username || accountFromAuthEmail(profile.email) || '-')}</b><div class="small muted">${safe(displayAccountValue(profile.email) || '')}</div></td>
        <td><input data-profile-field="display_name" value="${safe(profile.display_name || '')}" placeholder="顯示名稱"></td>
        <td>${roleSelect}${isSelf ? '<div class="small muted">不能調整自己角色</div>' : ''}</td>
        <td>${vendorSelect}</td>
        <td>${locationSelect}</td>
        <td>${moduleOwnerCheckboxes(profile)}</td>
        <td>${profile.is_active === false ? '<span class="badge bad-b">停用</span>' : '<span class="badge good-b">啟用</span>'}</td>
        <td><button class="btn small-btn" onclick="window.VCS.saveProfileRole('${safe(profile.id)}')">儲存</button><button class="btn ghost small-btn" onclick="window.VCS.toggleProfileActive('${safe(profile.id)}')" ${isSelf ? 'disabled title="不能停用自己"' : ''}>${profile.is_active === false ? '啟用' : '停用'}</button></td>
      </tr>`;
    }).join('')}</tbody></table></div><div class="hint" style="margin-top:12px">提醒：廠商帳號請將角色設為「廠商」，並選擇對應廠商；五大模組可分別指定主要負責人。設定後，建立或編輯該類案件時會自動帶入並鎖定內部負責人；維修料品申請仍會由維修料品主要負責人或管理者審核。</div>`;
  }

  return {
    renderSettings,
    renderAdminCloudConfig,
    renderAccountAdminList
  };
}
