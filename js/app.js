import { getRuntimeConfig } from './modules/runtime-config.js';
import { APP_KEYS, CASE_TYPES, CLOSED_STATUS, CLOUD_TABLES, INTERNAL_AUTH_DOMAIN, LCD_CASE_TYPE, MODULE_OWNER_FIELDS, PAGE_SIZES, PART_CASE_TYPE, REVIEW_STATUS, STATUS, VENDOR_STATUS } from './modules/app-constants.js';
import { createInitialState, emptyData } from './modules/state.js';
import { $, qsa } from './modules/dom.js';
import { addDaysInput, compactDate, dateText, dateTimeText, daysBetween, nowIso, toDateInput, toLocalDateInput, todayStart } from './modules/date-utils.js';
import { safe } from './modules/html.js';
import { byId, groupBy } from './modules/data-utils.js';
import { createCloudDataApi } from './modules/cloud-data.js';
import { createRealtimeSync } from './modules/realtime.js';
import { createAccountAuthHelpers } from './modules/auth.js';
import { createDbApi } from './modules/db.js';
import { createAutomationApi } from './modules/automation.js';
import { createCaseFormApi } from './modules/case-form.js';
import { createPermissionsApi } from './modules/permissions.js';
import { createNotificationStore } from './modules/notifications.js';
import { compactAttachmentUrl, fileToLocalPreviewUrl, isQuotaError, safeStorageFileName } from './modules/file-utils.js';
import { beginButtonBusy, endButtonBusy } from './modules/ui-state.js';
import { buildRestockText, normalizedTitle, parseRestockInfo } from './modules/lcd-utils.js';
import { csvEscape, downloadText, downloadXlsx, parseCsv, statRows } from './modules/export-utils.js';
import { createBadgeHelpers } from './modules/badges.js';
import { createReportHelpers } from './modules/report-utils.js';

(() => {
  'use strict';

  const RUNTIME_CONFIG = getRuntimeConfig();
  const DEFAULT_SUPABASE_URL = RUNTIME_CONFIG.supabaseUrl || '';
  const DEFAULT_SUPABASE_ANON_KEY = RUNTIME_CONFIG.supabaseAnonKey || '';
  const LOCK_SUPABASE_CONFIG = !!RUNTIME_CONFIG.lockConfig;
  const STORAGE_KEY = APP_KEYS.storage;
  const CONFIG_KEY = APP_KEYS.config;
  const NOTIFY_KEY = APP_KEYS.notificationsRead;
  const DRAFT_KEY = APP_KEYS.newCaseDraft;
  const CASE_LIST_PAGE_SIZE = PAGE_SIZES.caseList;
  const CLOUD_PAGE_SIZE = PAGE_SIZES.cloudFetch;
  const { accountFromAuthEmail, accountToAuthEmail, normalizeAccount } = createAccountAuthHelpers(INTERNAL_AUTH_DOMAIN);
  const state = createInitialState(CASE_LIST_PAGE_SIZE);
  const permissionsApi = createPermissionsApi({
    state,
    accountFromAuthEmail,
    byId
  });
  const notificationStore = createNotificationStore({
    state,
    notifyKey: NOTIFY_KEY,
    currentRole,
    nowIso
  });
  const {
    loadCloudData,
    resetCaseDetailLoaded,
    ensureCaseDetailRows
  } = createCloudDataApi({
    state,
    cloudPageSize: CLOUD_PAGE_SIZE,
    emptyData,
    $,
    renderCaseModal,
    errorBanner
  });
  const {
    startRealtimeSync,
    stopRealtimeSync
  } = createRealtimeSync({
    state,
    cloudTables: CLOUD_TABLES,
    closeModal,
    hydrateSelectOptions,
    updateUserUi,
    renderAll,
    refreshAll,
    updateNotificationUi
  });
  const dbApi = createDbApi({
    state,
    storageKey: STORAGE_KEY,
    uid,
    nowIso,
    isQuotaError,
    compactLocalDbForStorage,
    $,
    toast
  });
  const {
    typeBadge,
    statusBadge,
    reviewBadge,
    reminderBadge,
    priorityBadge,
    urgentBadge,
    priorityRowClass
  } = createBadgeHelpers({
    safe,
    closedStatus: CLOSED_STATUS,
    reviewStatusValues: REVIEW_STATUS,
    normalizeCaseType,
    isPartCase,
    reviewStatus
  });
  const automationApi = createAutomationApi({
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
  });
  const {
    groupStats,
    statTable
  } = createReportHelpers({
    safe,
    closedStatus: CLOSED_STATUS,
    calcCase,
    groupBy
  });
  const caseFormApi = createCaseFormApi({
    state,
    draftKey: DRAFT_KEY,
    $,
    onTypeChange,
    renderItemsDraftSummary,
    toast
  });

  function seedData(){
    const now = new Date();
    const date = toDateInput(now);
    const vendor1 = { id:uid(), vendor_name:'YS 廠商', contact_person:'窗口', phone:'', email:'', default_sla_days:14, is_active:true, created_at:nowIso() };
    const vendor2 = { id:uid(), vendor_name:'順豐 / 貨運窗口', contact_person:'', phone:'', email:'', default_sla_days:7, is_active:true, created_at:nowIso() };
    const loc1 = { id:uid(), location_name:'總公司', manager_name:'白駿森', remark:'', is_active:true, created_at:nowIso() };
    const loc2 = { id:uid(), location_name:'廠房 A', manager_name:'地點負責人', remark:'', is_active:true, created_at:nowIso() };
    const c1 = { id:uid(), case_no:'SF-' + compactDate(now) + '-001', case_type:'順豐送修', title:'模組返修 10 片', status:'已送出廠商', priority:'一般', location_id:loc1.id, vendor_id:vendor1.id, applicant_name:'白駿森', owner_name:'白駿森', tracking_no:'SF123456789', return_tracking_no:'', ship_date:date, vendor_received_date:'', due_date:addDaysInput(now,14), reminder_days:14, description:'測試展示案件：模組顯示異常，已由順豐寄出。', last_reply_at:'', closed_at:'', created_by:'demo-admin', updated_by:'demo-admin', created_at:nowIso(), updated_at:nowIso(), overdue_status:'正常', overdue_days:0, vendor_reply_status:'正常', vendor_no_reply_days:0, last_overdue_check_date:toLocalDateInput(new Date()), last_vendor_reminder_date:null, last_vendor_reminder_at:null, auto_reminder_count:0 };
    const c2 = { id:uid(), case_no:'PART-' + compactDate(now) + '-001', case_type:'維修料品申請', title:'廠房 A 申請電源維修料品', status:'廠商處理中', priority:'急件', location_id:loc2.id, vendor_id:vendor1.id, applicant_name:'地點負責人', owner_name:'白駿森', tracking_no:'', return_tracking_no:'', ship_date:'', vendor_received_date:'', due_date:addDaysInput(now,7), reminder_days:7, description:'申請維修電源 5 顆，廠商需回覆是否有貨。', review_status:REVIEW_STATUS.approved, review_note:'', reviewed_by:'demo-admin', reviewed_at:nowIso(), last_reply_at:addDaysInput(now,-2) + 'T09:00:00.000Z', closed_at:'', created_by:'demo-admin', updated_by:'demo-admin', created_at:nowIso(), updated_at:nowIso(), overdue_status:'正常', overdue_days:0, vendor_reply_status:'正常', vendor_no_reply_days:0, last_overdue_check_date:toLocalDateInput(new Date()), last_vendor_reminder_date:null, last_vendor_reminder_at:null, auto_reminder_count:0 };
    return {
      vendors:[vendor1,vendor2],
      locations:[loc1,loc2],
      profiles:[],
      cases:[c1,c2],
      case_items:[
        { id:uid(), case_id:c1.id, item_name:'LED 模組', spec:'320x160', sn:'', qty:10, problem_desc:'顯示異常', vendor_result:'', completed_qty:0, pending_qty:10, created_at:nowIso() },
        { id:uid(), case_id:c2.id, item_name:'電源', spec:'百納', sn:'', qty:5, problem_desc:'維修備料申請', vendor_result:'', completed_qty:0, pending_qty:5, created_at:nowIso() }
      ],
      case_replies:[
        { id:uid(), case_id:c2.id, reply_by:'YS 廠商', reply_role:'廠商', message:'已收到申請，正在確認庫存。', next_follow_date:addDaysInput(now,3), created_at:addDaysInput(now,-2) + 'T09:00:00.000Z' }
      ],
      case_attachments:[],
      case_logs:[
        { id:uid(), case_id:c1.id, case_no:c1.case_no, action:'新增案件', actor_name:'展示管理者', detail:'建立順豐送修展示案件', created_at:nowIso() },
        { id:uid(), case_id:c2.id, case_no:c2.case_no, action:'新增案件', actor_name:'展示管理者', detail:'建立料品申請展示案件', created_at:nowIso() }
      ]
    };
  }

  function uid(){ return (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now()); }
  function normalizeCaseType(type){
    return type === '電視大屏申請' ? LCD_CASE_TYPE : type;
  }
  function isLcdCase(c){
    return normalizeCaseType(c?.case_type) === LCD_CASE_TYPE;
  }
  function isPartCase(cOrType){
    const type = typeof cOrType === 'string' ? cOrType : cOrType?.case_type;
    return normalizeCaseType(type) === PART_CASE_TYPE;
  }
  function reviewStatus(c){
    if(!isPartCase(c)) return REVIEW_STATUS.approved;
    if(c?.review_status) return c.review_status;
    if(c?.status === '待負責人審核') return REVIEW_STATUS.pending;
    if(c?.status === '審核退回') return REVIEW_STATUS.rejected;
    return REVIEW_STATUS.approved;
  }
  function needsReview(c){
    return isPartCase(c) && reviewStatus(c) === REVIEW_STATUS.pending;
  }
  function reviewRejected(c){
    return isPartCase(c) && reviewStatus(c) === REVIEW_STATUS.rejected;
  }
  function isMainTableCase(c){
    return !isPartCase(c) || reviewStatus(c) === REVIEW_STATUS.approved;
  }
  function caseOwnerMatchesCurrentUser(c){
    return currentIdentitySet().has(identityText(c?.owner_name));
  }
  function caseApplicantMatchesCurrentUser(c){
    const userId = currentUserId();
    if(userId && c?.created_by && c.created_by === userId) return true;
    const identities = currentIdentitySet();
    return [c?.applicant_name].some(v => identities.has(identityText(v)));
  }
  function caseCreatedByCurrentUser(c){
    const userId = currentUserId();
    return !!(userId && c?.created_by && c.created_by === userId);
  }
  function partReviewerMatchesCurrentUser(){
    const reviewer = partOwnerProfile();
    if(!reviewer) return false;
    const userId = currentUserId();
    if(userId && reviewer.id === userId) return true;
    const identities = currentIdentitySet();
    return [reviewer.display_name, reviewer.username, reviewer.email, accountFromAuthEmail(reviewer.email)]
      .some(v => identities.has(identityText(v)));
  }
  function canReviewCase(c){
    if(!needsReview(c) || isViewer() || isVendor()) return false;
    return isAdmin() || partReviewerMatchesCurrentUser() || caseOwnerMatchesCurrentUser(c);
  }
  function canResubmitReview(c){
    if(!reviewRejected(c) || isViewer() || isVendor()) return false;
    return isAdmin() || caseApplicantMatchesCurrentUser(c) || partReviewerMatchesCurrentUser();
  }
  function findExistingLcdCaseByTitle(title){
    const key = normalizedTitle(title);
    if(!key) return null;
    return state.data.cases.find(c => isLcdCase(c) && normalizedTitle(c.title) === key) || null;
  }
  function findExistingItemBySn(caseId, sn){
    const key = String(sn || '').trim().toLowerCase();
    if(!key) return null;
    return state.data.case_items.find(i => i.case_id === caseId && String(i.sn || '').trim().toLowerCase() === key) || null;
  }
  function itemPhotos(itemId, caseId){
    return state.data.case_attachments.filter(a => a.item_id === itemId || (!itemId && a.case_id === caseId));
  }
  function itemThumbHtml(item, c){
    const photos = itemPhotos(item.id, c?.id).filter(f => String(f.file_type||'').startsWith('image/') || String(f.file_url||'').startsWith('data:image'));
    if(!photos.length) return '<div class="lcd-thumb empty-thumb">無照片</div>';
    const f = photos[0];
    return `<a href="${f.file_url}" target="_blank" rel="noopener" class="lcd-thumb"><img src="${f.file_url}" alt="${safe(f.file_name || item.sn || '設備照片')}"></a>`;
  }
  function compactLocalDbForStorage(db=state.data, aggressive=false){
    const copy = JSON.parse(JSON.stringify(db || emptyData()));
    copy.case_attachments = (copy.case_attachments || []).map((a, idx) => {
      const url = String(a.file_url || '');
      if(!url.startsWith('data:')) return a;
      if(url.length <= 140000 && !aggressive) return a;
      return { ...a, file_url:compactAttachmentUrl(a.file_name || `附件 ${idx + 1}`), storage_path:'local-compacted', compacted:true };
    });
    return copy;
  }
  function currentAccountName(){ return permissionsApi.currentAccountName(); }
  function displayAccountValue(v){ return permissionsApi.displayAccountValue(v); }
  function currentName(){ return permissionsApi.currentName(); }
  function currentRole(){ return permissionsApi.currentRole(); }
  function currentUserId(){ return permissionsApi.currentUserId(); }
  function currentReplyRole(){ return permissionsApi.currentReplyRole(); }
  function currentAccountLabel(){ return permissionsApi.currentAccountLabel(); }
  function notifyStoreKey(){ return notificationStore.notifyStoreKey(); }
  function readNotifications(){ return notificationStore.readNotifications(); }
  function saveNotifications(map){ return notificationStore.saveNotifications(map); }
  function isNoticeRead(id){ return notificationStore.isNoticeRead(id); }
  function markNoticeRead(id){ return notificationStore.markNoticeRead(id); }
  function markNoticeUnread(id){ return notificationStore.markNoticeUnread(id); }
  function roleName(role){ return permissionsApi.roleName(role); }
  function isAdmin(){ return permissionsApi.isAdmin(); }
  function isVendor(){ return permissionsApi.isVendor(); }
  function isViewer(){ return permissionsApi.isViewer(); }
  function canCreate(){ return permissionsApi.canCreate(); }
  function canEditCase(c){ return permissionsApi.canEditCase(c); }
  function canEditCore(){ return permissionsApi.canEditCore(); }
  function canDeleteCase(c){ return permissionsApi.canDeleteCase(c); }
  function identityText(v){ return permissionsApi.identityText(v); }
  function currentIdentitySet(){ return permissionsApi.currentIdentitySet(); }
  function caseBelongsToCurrentUser(c){ return permissionsApi.caseBelongsToCurrentUser(c); }
  function caseReturnLocationBelongsToCurrentUser(c){ return permissionsApi.caseReturnLocationBelongsToCurrentUser(c); }
  function shouldShowPersonalCaseNotice(c){ return permissionsApi.shouldShowPersonalCaseNotice(c); }

  async function boot(){
    loadConfigToInputs();
    bindLoginEvents();
    bindAppEvents();
    hydrateSelectOptions();
    const cfg = getConfig();
    if(cfg.url && cfg.key){
      initSupabase(cfg.url, cfg.key);
      const { data } = await state.client.auth.getSession();
      if(data?.session){
        state.user = data.session.user;
        await loadProfile();
        await enterApp(true);
      }
    }
  }

  function getConfig(){
    if(LOCK_SUPABASE_CONFIG){
      return { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_ANON_KEY };
    }
    const saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
    return { url: saved.url || DEFAULT_SUPABASE_URL, key: saved.key || DEFAULT_SUPABASE_ANON_KEY };
  }
  function loadConfigToInputs(){
    const cfg = getConfig();
    $('supabaseUrl').value = cfg.url || '';
    $('supabaseKey').value = cfg.key || '';
    if(LOCK_SUPABASE_CONFIG){
      $('supabaseUrl').readOnly = true;
      $('supabaseKey').readOnly = true;
      qsa('.cloud-config-field').forEach(el => el.classList.add('hidden'));
      $('cloudConfigActions')?.classList.add('hidden');
      $('cloudConfigDivider')?.classList.add('hidden');
      $('setupHint')?.classList.add('hidden');
      $('demoPanel')?.classList.add('hidden');
    }else{
      $('supabaseUrl').readOnly = false;
      $('supabaseKey').readOnly = false;
      qsa('.cloud-config-field').forEach(el => el.classList.remove('hidden'));
      $('cloudConfigActions')?.classList.remove('hidden');
      $('cloudConfigDivider')?.classList.remove('hidden');
      $('setupHint')?.classList.remove('hidden');
      $('demoPanel')?.classList.remove('hidden');
    }
  }
  function initSupabase(url, key){
    if(!window.supabase) throw new Error('Supabase SDK 載入失敗，請確認網路可連線。');
    stopRealtimeSync();
    state.client = window.supabase.createClient(url, key);
  }

  function bindLoginEvents(){
    $('saveConfigBtn').addEventListener('click', () => {
      const url = $('supabaseUrl').value.trim();
      const key = $('supabaseKey').value.trim();
      if(!url || !key) return toast('請輸入 Supabase URL 與 anon key', 'bad');
      localStorage.setItem(CONFIG_KEY, JSON.stringify({url,key}));
      initSupabase(url, key);
      toast('雲端設定已儲存');
    });
    $('clearConfigBtn').addEventListener('click', () => {
      localStorage.removeItem(CONFIG_KEY);
      $('supabaseUrl').value = '';
      $('supabaseKey').value = '';
      state.client = null;
      toast('已清除雲端設定');
    });
    $('loginBtn').addEventListener('click', login);
    $('signupBtn').addEventListener('click', signup);
    $('demoAdminBtn').addEventListener('click', () => demoLogin('admin'));
    $('demoOperatorBtn').addEventListener('click', () => demoLogin('operator'));
    $('demoVendorBtn').addEventListener('click', () => demoLogin('vendor'));
    $('demoViewerBtn').addEventListener('click', () => demoLogin('viewer'));
  }

  async function login(){
    try{
      const cfg = getConfig();
      if(!cfg.url || !cfg.key) return toast('請先儲存 Supabase 設定，或使用本機展示模式', 'bad');
      if(!state.client) initSupabase(cfg.url, cfg.key);
      const account = normalizeAccount($('email').value);
      const password = $('password').value;
      if(!account || !password) return toast('請輸入帳號與密碼', 'bad');
      const email = accountToAuthEmail(account);
      const { data, error } = await state.client.auth.signInWithPassword({ email, password });
      if(error) throw error;
      state.user = data.user;
      await loadProfile();
      await enterApp(true);
    }catch(err){ toast(err.message || '登入失敗', 'bad'); }
  }

  async function signup(){
    try{
      const cfg = getConfig();
      if(!cfg.url || !cfg.key) return toast('請先儲存 Supabase 設定', 'bad');
      if(!state.client) initSupabase(cfg.url, cfg.key);
      const account = normalizeAccount($('email').value);
      const password = $('password').value;
      const displayName = $('displayName').value.trim() || account;
      if(!account || !password) return toast('請輸入帳號與密碼', 'bad');
      if(password.length < 6) return toast('密碼至少 6 碼', 'bad');
      const email = accountToAuthEmail(account);
      const { data, error } = await state.client.auth.signUp({
        email,
        password,
        options: { data: { username: account, display_name: displayName } }
      });
      if(error) throw error;
      if(data?.session?.user){
        state.user = data.session.user;
        await loadProfile();
        toast('帳號已建立，已自動登入，預設權限為作業員。');
        await enterApp(true);
        return;
      }
      const signedIn = await state.client.auth.signInWithPassword({ email, password });
      if(signedIn.error) throw signedIn.error;
      state.user = signedIn.data.user;
      await loadProfile();
      toast('帳號已建立，已自動登入。');
      await enterApp(true);
    }catch(err){ toast(err.message || '註冊失敗', 'bad'); }
  }

  async function demoLogin(role){
    stopRealtimeSync();
    state.online = false;
    state.client = null;
    let db = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if(!db){ db = seedData(); saveLocal(db); }
    state.data = db;
    const vendor = db.vendors[0];
    state.user = { id:'demo-' + role, email: role + '@demo.local', role };
    state.profile = { id:'demo-' + role, username:'demo-' + role, display_name: role==='admin'?'展示管理者':role==='operator'?'展示作業員':role==='vendor'?'YS 廠商帳號':'展示訪客', role, vendor_id: role==='vendor' ? vendor?.id : null, location_id:null, is_active:true };
    await enterApp(false);
  }

  async function enterApp(online){
    state.online = online;
    $('loginPage').classList.add('hidden');
    $('app').classList.remove('hidden');
    $('modeLabel').textContent = online ? 'Supabase 雲端模式' : '本機展示模式';
    await refreshAll();
    if(online) startRealtimeSync();
  }

  async function loadProfile(){
    if(!state.client || !state.user) return;
    const { data, error } = await state.client.from('profiles').select('*').eq('id', state.user.id).maybeSingle();
    if(error) throw error;
    if(data){
      state.profile = data;
      if(data.is_active === false){
        await state.client.auth.signOut();
        state.user = null;
        state.profile = null;
        throw new Error('此帳號已停用，請聯絡管理者');
      }
    }else{
      const account = state.user?.user_metadata?.username || accountFromAuthEmail(state.user?.email);
      state.profile = { id:state.user.id, email:state.user.email, username:account, display_name:account, role:'viewer', is_active:false };
      toast('找不到帳號權限資料，請確認 Supabase SQL 已執行，或請管理者到 profiles 啟用帳號。', 'bad');
    }
  }

  function bindAppEvents(){
    qsa('#nav button').forEach(btn => btn.addEventListener('click', () => showSection(btn.dataset.section)));
    qsa('[data-go]').forEach(btn => btn.addEventListener('click', () => showSection(btn.dataset.go)));
    $('logoutBtn').addEventListener('click', logout);
    $('refreshBtn').addEventListener('click', refreshAll);
    $('notificationBtn')?.addEventListener('click', () => showSection('notifications'));
    $('markAllNotificationsBtn')?.addEventListener('click', markAllNotificationsRead);
    $('caseType').addEventListener('change', onTypeChange);
    $('addItemBtn').addEventListener('click', () => addItemEditor());
    $('caseForm').addEventListener('submit', createCase);
    bindNewCaseDraft();
    $('resetCaseBtn').addEventListener('click', () => {
      clearNewCaseDraft();
      setTimeout(resetItemsEditor,0);
    });
    ['filterKeyword','filterType','filterStatus','filterVendor','filterLocation','filterOverdue'].forEach(id => $(id).addEventListener('input', () => {
      resetCaseListLimit();
      renderCaseList();
    }));
    $('exportCsvBtn').addEventListener('click', exportCsv);
    $('addVendorBtn').addEventListener('click', addVendor);
    $('addLocationBtn').addEventListener('click', addLocation);
    $('closeModalBtn').addEventListener('click', closeModal);
    $('printCaseBtn').addEventListener('click', () => window.print());
    $('caseModal').addEventListener('click', e => { if(e.target.id === 'caseModal') closeModal(); });
    $('notificationTabs')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-notification]');
      if(!btn) return;
      state.notificationFilter = btn.dataset.notification;
      qsa('#notificationTabs .tab').forEach(b => b.classList.toggle('active', b===btn));
      renderNotifications();
    });

    ['vendorPortalVendor','vendorPortalStatus','vendorPortalNeed'].forEach(id => $(id)?.addEventListener('input', renderVendorPortal));
    ['locationReviewLocation','locationReviewStatus','locationReviewKeyword'].forEach(id => $(id)?.addEventListener('input', renderLocationReview));
    ['containerKeyword','containerVendor','containerStatus'].forEach(id => $(id)?.addEventListener('input', renderContainerBatches));
    $('newContainerCaseBtn')?.addEventListener('click', () => setNewCaseType('貨櫃送修'));
    $('exportExcelBtn')?.addEventListener('click', () => exportCasesExcel());
    $('exportTemplateBtn')?.addEventListener('click', exportImportTemplate);
    $('exportReportBtn')?.addEventListener('click', () => exportReportsExcel());
    $('importCsvBtn')?.addEventListener('click', importCsvCases);
    $('followupTabs')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-followup]');
      if(!btn) return;
      state.followupFilter = btn.dataset.followup;
      qsa('#followupTabs .tab').forEach(b => b.classList.toggle('active', b===btn));
      renderVendorFollowup();
    });
    $('reminderTabs').addEventListener('click', e => {
      const btn = e.target.closest('[data-reminder]');
      if(!btn) return;
      state.reminderFilter = btn.dataset.reminder;
      qsa('#reminderTabs .tab').forEach(b => b.classList.toggle('active', b===btn));
      renderReminders();
    });
  }

  function newCaseDraftFields(){ return caseFormApi.newCaseDraftFields(); }
  function bindNewCaseDraft(){ return caseFormApi.bindNewCaseDraft(); }
  function saveNewCaseDraft(){ return caseFormApi.saveNewCaseDraft(); }
  function restoreNewCaseDraft(){ return caseFormApi.restoreNewCaseDraft(); }
  function clearNewCaseDraft(){ return caseFormApi.clearNewCaseDraft(); }

  async function logout(){
    stopRealtimeSync();
    if(state.client && state.online){ await state.client.auth.signOut(); }
    state.user = null; state.profile = null; state.online = false; state.data = emptyData();
    $('app').classList.add('hidden');
    $('loginPage').classList.remove('hidden');
  }

  function showSection(section){
    state.section = section;
    qsa('.section').forEach(s => s.classList.toggle('active', s.id === section));
    qsa('#nav button').forEach(b => b.classList.toggle('active', b.dataset.section === section));
    const titles = {
      dashboard:['儀表板','案件狀態、逾期與廠商未回覆快速總覽'],
      newCase:['新增案件','建立順豐送修、貨櫃送修、料品申請、液晶面板保固申請與 BUG 回報'],
      caseList:['案件總表','集中查詢、篩選、追蹤與編輯案件'],
      reminders:['時效提醒','快逾期、已逾期、廠商未回覆與收件未確認'],
      notifications:['回覆通知','新回覆、急件催覆與需盡快回覆案件'],
      vendorPortal:['廠商工作台','廠商專屬案件、待回覆與處理進度'],
      locationReview:['地點申請統整','各辦公地點維修料品申請彙整'],
      containerBatches:['貨櫃批次管理','貨櫃送修批次與品項完成度追蹤'],
      vendorFollowup:['催廠商清單','急件、逾期與長時間未回覆案件催覆'],
      reports:['統計報表','依廠商、類型、地點與負責人分析'],
      importExport:['匯入 / 匯出','案件 Excel 匯出與 CSV 匯入'],
      settings:['基本資料設定','廠商與辦公地點維護'],
      logs:['操作紀錄','追蹤每次新增、修改與回覆']
    };
    $('pageTitle').textContent = titles[section]?.[0] || '';
    $('pageSubtitle').textContent = titles[section]?.[1] || '';
    renderAll();
    if(section === 'newCase') setTimeout(restoreNewCaseDraft, 0);
  }

  async function refreshAll(options={}){
    const silent = !!options.silent;
    try{
      if(state.online){ await loadCloudData(); }
      else { state.data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || seedData(); saveLocal(state.data); }
      if(!silent){
        const autoResult = await runDailyCaseAutomation();
        if(autoResult?.changed && state.online) await loadCloudData();
      }
      hydrateSelectOptions();
      updateUserUi();
      if(!silent) resetItemsEditor(false);
      renderAll();
      if(silent) return;
      toast('資料已更新');
    }catch(err){ console.error(err); toast(err.message || '資料載入失敗', 'bad'); }
  }

  function saveLocal(db=state.data){ return dbApi.saveLocal(db); }
  async function dbInsert(table, row){ return dbApi.dbInsert(table, row); }
  async function dbUpdate(table, id, patch){ return dbApi.dbUpdate(table, id, patch); }
  async function dbDelete(table, id){ return dbApi.dbDelete(table, id); }

  function hydrateSelectOptions(){
    const typeOptions = CASE_TYPES.map(t => `<option value="${safe(t.value)}">${safe(t.value)}</option>`).join('');
    ['caseType'].forEach(id => { if($(id)) $(id).innerHTML = typeOptions; });
    if($('filterType')) $('filterType').innerHTML = '<option value="">全部</option>' + typeOptions;
    if($('filterStatus')) $('filterStatus').innerHTML = '<option value="">全部</option>' + STATUS.map(s => `<option value="${safe(s)}">${safe(s)}</option>`).join('');
    ['vendorPortalStatus','locationReviewStatus','containerStatus'].forEach(id => { if($(id)) $(id).innerHTML = '<option value="">全部</option>' + STATUS.map(s => `<option value="${safe(s)}">${safe(s)}</option>`).join(''); });
    renderRefSelects();
    onTypeChange();
  }
  function profileOptionRows(){
    const profiles = [...(state.data.profiles || [])];
    if(state.profile && !profiles.some(p => p.id === state.profile.id)){
      profiles.unshift(state.profile);
    }
    return profiles
      .filter(p => p && p.is_active !== false && p.role !== 'vendor')
      .map(p => {
        const name = p.display_name || p.username || accountFromAuthEmail(p.email) || p.id;
        const account = p.username || accountFromAuthEmail(p.email) || '';
        const label = account && account !== name ? `${name}（${account}）` : name;
        return { value:name, label };
      })
      .filter((p, idx, arr) => p.value && arr.findIndex(x => x.value === p.value) === idx);
  }
  function profileSelectOptions(selected='', placeholder='未指定'){
    const rows = profileOptionRows().map(p => `<option value="${safe(p.value)}" ${p.value===selected?'selected':''}>${safe(p.label)}</option>`);
    if(selected && !profileOptionRows().some(p => p.value === selected)) rows.unshift(`<option value="${safe(selected)}" selected>${safe(selected)}（未在帳號清單）</option>`);
    return [`<option value="" ${selected?'':'selected'}>${placeholder}</option>`, ...rows].join('');
  }
  function profileDisplayName(p){
    return p?.display_name || p?.username || accountFromAuthEmail(p?.email) || '';
  }
  function moduleOwnerConfig(type){
    const normalized = normalizeCaseType(type);
    return MODULE_OWNER_FIELDS.find(item => item.type === normalized) || null;
  }
  function moduleOwnerProfile(type){
    const cfg = moduleOwnerConfig(type);
    if(!cfg) return null;
    return (state.data.profiles || []).find(p => p && p.is_active !== false && p[cfg.field] === true && !['vendor','viewer'].includes(p.role)) || null;
  }
  function moduleOwnerName(type){
    return profileDisplayName(moduleOwnerProfile(type));
  }
  function moduleOwnerLabel(type){
    return moduleOwnerConfig(type)?.label || normalizeCaseType(type) || '此模組';
  }
  function partOwnerProfile(){
    return moduleOwnerProfile(PART_CASE_TYPE);
  }
  function partOwnerName(){
    return moduleOwnerName(PART_CASE_TYPE);
  }
  function applyModuleOwnerLock(){
    const caseType = $('caseType')?.value || '';
    const owner = moduleOwnerName(caseType);
    const label = moduleOwnerLabel(caseType);
    const input = $('ownerName');
    if(!input) return;
    if(owner){
      input.value = owner;
      input.disabled = true;
      input.title = `${label}主要負責人由帳號權限設定指定`;
    }else{
      input.disabled = false;
      input.title = '';
    }
  }
  function applyPartOwnerLock(){ applyModuleOwnerLock(); }

  function renderRefSelects(){
    const vendorOptions = ['<option value="">未指定</option>'].concat(state.data.vendors.filter(v => v.is_active !== false).map(v => `<option value="${v.id}">${safe(v.vendor_name)}</option>`)).join('');
    const locOptions = ['<option value="">未指定</option>'].concat(state.data.locations.filter(l => l.is_active !== false).map(l => `<option value="${l.id}">${safe(l.location_name)}</option>`)).join('');
    const profileOptions = profileSelectOptions('', '未指定');
    ['vendorId'].forEach(id => { if($(id)) $(id).innerHTML = vendorOptions; });
    ['locationId','returnLocationId'].forEach(id => { if($(id)) $(id).innerHTML = locOptions; });
    if($('newLocationManager')) $('newLocationManager').innerHTML = profileOptions;
    if($('filterVendor')) $('filterVendor').innerHTML = '<option value="">全部</option>' + state.data.vendors.map(v => `<option value="${v.id}">${safe(v.vendor_name)}</option>`).join('');
    if($('filterLocation')) $('filterLocation').innerHTML = '<option value="">全部</option>' + state.data.locations.map(l => `<option value="${l.id}">${safe(l.location_name)}</option>`).join('');
    ['vendorPortalVendor','containerVendor'].forEach(id => { if($(id)) $(id).innerHTML = '<option value="">全部 / 依登入廠商</option>' + state.data.vendors.map(v => `<option value="${v.id}">${safe(v.vendor_name)}</option>`).join(''); });
    if($('locationReviewLocation')) $('locationReviewLocation').innerHTML = '<option value="">全部地點</option>' + state.data.locations.map(l => `<option value="${l.id}">${safe(l.location_name)}</option>`).join('');
    applyPartOwnerLock();
  }
  function locationSelectOptions(selected='', placeholder='未指定'){
    const rows = state.data.locations
      .filter(l => l.is_active !== false)
      .map(l => `<option value="${safe(l.id)}" ${l.id===selected?'selected':''}>${safe(l.location_name)}</option>`);
    return [`<option value="" ${selected?'':'selected'}>${placeholder}</option>`, ...rows].join('');
  }
  function returnLocationId(c){
    return c?.return_location_id || '';
  }
  function returnLocationName(c){
    return returnLocationId(c) ? locationName(returnLocationId(c)) : '-';
  }

  function onTypeChange(){
    const type = CASE_TYPES.find(t => t.value === $('caseType')?.value) || CASE_TYPES[0];
    if($('reminderDays') && (!$('reminderDays').value || Number($('reminderDays').value) === 14)) $('reminderDays').value = type.defaultDays;
    const due = $('dueDate');
    if(due && !due.value) due.value = addDaysInput(new Date(), type.defaultDays);
    if($('caseTitle')) $('caseTitle').placeholder = type.value === LCD_CASE_TYPE ? '例如：液晶面板保固申請 3 台' : '例如：YS 模組返修 10 片';
    const isLcd = type.value === LCD_CASE_TYPE;
    if($('description')) $('description').placeholder = isLcd ? '可填寫此批液晶申請的共通說明；每筆 SN 的損壞狀況與照片請在下方品項細項填寫。' : '填寫故障狀況、料品需求原因、BUG 發生步驟或其他說明';
    if($('problemSectionTitle')) $('problemSectionTitle').textContent = isLcd ? '共通說明' : '問題與附件';
    if($('caseAttachmentField')){
      $('caseAttachmentField').classList.toggle('hidden', isLcd);
      if(isLcd && $('attachments')) $('attachments').value = '';
    }
    applyPartOwnerLock();
    renderItemsDraftSummary();
  }

  function resetItemsEditor(addDefault=true){
    if(!$('itemsEditor')) return;
    $('itemsEditor').innerHTML = '';
    if(addDefault !== false) addItemEditor();
    renderItemsDraftSummary();
  }
  function addItemEditor(item={}){
    const id = uid();
    const div = document.createElement('div');
    div.className = 'item-box item-editor';
    div.dataset.row = id;
    div.innerHTML = `
      <div class="row" style="justify-content:space-between"><h4>品項明細</h4><button type="button" class="btn ghost small-btn remove-item">移除</button></div>
      <div class="grid-3">
        <div class="field"><label>品項 / 設備名稱</label><input data-field="item_name" value="${safe(item.item_name)}" placeholder="例如：液晶面板 / 控制板 / 電源 / 程式版本"></div>
        <div class="field"><label>規格 / 型號 / 設備資訊</label><input data-field="spec" value="${safe(item.spec)}" placeholder="例如：面板尺寸 / 型號 / 安裝位置 / 保固資訊"></div>
        <div class="field"><label>SN / 序號</label><input data-field="sn" value="${safe(item.sn)}" placeholder="請填寫設備 SN 號碼"></div>
      </div>
      <div class="grid-3">
        <div class="field"><label>數量</label><input data-field="qty" type="number" min="0" value="${item.qty ?? 1}"></div>
        <div class="field"><label>已完成數量</label><input data-field="completed_qty" type="number" min="0" value="${item.completed_qty ?? 0}"></div>
        <div class="field"><label>廠商判斷 / 回覆結果</label><input data-field="vendor_result" value="${safe(item.vendor_result)}"></div>
      </div>
      <div class="field"><label>問題描述 / 損壞狀況 / BUG 步驟</label><textarea data-field="problem_desc" placeholder="逐項描述設備損壞狀況、保固內申請原因或其他需求">${safe(item.problem_desc)}</textarea></div>
      <div class="field"><label>設備損壞照片</label><input data-field="item_files" type="file" multiple accept="image/*"></div>
    `;
    div.querySelector('.remove-item').addEventListener('click', () => { div.remove(); renderItemsDraftSummary(); });
    div.addEventListener('input', renderItemsDraftSummary);
    div.addEventListener('change', renderItemsDraftSummary);
    $('itemsEditor').appendChild(div);
    renderItemsDraftSummary();
  }
  function collectDraftItems(){
    return qsa('.item-editor', $('itemsEditor')).map((div, idx) => {
      const get = f => div.querySelector(`[data-field="${f}"]`)?.value?.trim() || '';
      const files = div.querySelector('[data-field="item_files"]')?.files || [];
      const qty = Number(get('qty') || 0);
      const completed = Number(get('completed_qty') || 0);
      const hasData = get('item_name') || get('spec') || get('sn') || get('problem_desc') || get('vendor_result') || files.length || qty;
      return {
        index:idx + 1,
        item_name:get('item_name'),
        spec:get('spec'),
        sn:get('sn'),
        qty:qty || (hasData ? 1 : 0),
        completed_qty:completed,
        pending_qty:Math.max((qty || (hasData ? 1 : 0)) - completed, 0),
        vendor_result:get('vendor_result'),
        problem_desc:get('problem_desc'),
        photo_count:files.length,
        hasData
      };
    }).filter(i => i.hasData);
  }
  function renderItemsDraftSummary(){
    const wrap = $('itemsDraftSummary');
    if(!wrap) return;
    const isLcd = $('caseType')?.value === LCD_CASE_TYPE;
    if(!isLcd){ wrap.innerHTML = ''; return; }
    const items = collectDraftItems();
    const withPhoto = items.filter(i => i.photo_count).length;
    const withSn = items.filter(i => i.sn).length;
    wrap.innerHTML = `<div class="lcd-draft-summary">
      <div class="panel-title"><div><h2>累計項目統計清單</h2><p>填寫中的液晶資料會先在此彙整，建立後同標題案件會自動累計到同一筆。</p></div></div>
      <div class="cards compact-cards">
        ${cardHtml('填寫筆數', items.length, '目前準備送出的面板資料', 'blue')}
        ${cardHtml('已有 SN', withSn, '已填序號的項目', withSn === items.length && items.length ? 'good' : 'warn')}
        ${cardHtml('已有照片', withPhoto, '已選設備照片的項目', withPhoto ? 'good' : 'warn')}
        ${cardHtml('總數量', items.reduce((n,i)=>n+Number(i.qty||0),0), '此次申請累計數量', 'blue')}
      </div>
      <div class="table-wrap lcd-table-wrap"><table class="lcd-table"><thead><tr><th>#</th><th>照片</th><th>SN</th><th>設備資訊</th><th>問題確認</th><th>數量</th><th>完成</th><th>廠商判斷</th></tr></thead><tbody>
        ${items.map(i => `<tr>
          <td>${i.index}</td>
          <td><div class="lcd-thumb ${i.photo_count ? '' : 'empty-thumb'}">${i.photo_count ? `${i.photo_count} 張` : '無照片'}</div></td>
          <td><b>${safe(i.sn || '-')}</b><div class="small muted">${safe(i.item_name || '液晶面板')}</div></td>
          <td>${safe(i.spec || '-')}</td>
          <td>${safe(i.problem_desc || '-')}</td>
          <td>${safe(i.qty || 0)}</td>
          <td>${safe(i.completed_qty || 0)} / ${safe(i.pending_qty || 0)}</td>
          <td>${safe(i.vendor_result || '-')}</td>
        </tr>`).join('') || '<tr><td colspan="8" class="empty">尚未填寫液晶面板資料</td></tr>'}
      </tbody></table></div>
    </div>`;
  }

  async function createCase(e){
    e.preventDefault();
    if(!canCreate()) return toast('目前角色不能新增案件', 'bad');
    const busyButton = e.submitter || $('caseForm')?.querySelector('button[type="submit"]');
    if(!beginButtonBusy(busyButton, '建立中...')) return;
    toast('正在建立案件，請稍候...', 'warn');
    try{
      const case_type = $('caseType').value;
      const type = CASE_TYPES.find(t => t.value === case_type) || CASE_TYPES[0];
      const partReviewRequired = isPartCase(case_type);
      const fixedModuleOwner = moduleOwnerName(case_type);
      if(partReviewRequired && !fixedModuleOwner) return toast('請先到「帳號 / 廠商權限管理」設定維修料品主要負責人，再建立維修料品申請', 'bad');
      const reminderDays = Number($('reminderDays').value || type.defaultDays);
      const shipDate = $('shipDate').value;
      const due = $('dueDate').value || addDaysInput(shipDate ? new Date(shipDate) : new Date(), reminderDays);
      const row = {
        id: uid(),
        case_no: await nextCaseNo(type.prefix),
        case_type,
        title: $('caseTitle').value.trim(),
        status: partReviewRequired ? '待負責人審核' : '待整理',
        priority: $('priority').value,
        location_id: $('locationId').value || null,
        vendor_id: $('vendorId').value || null,
        applicant_name: $('applicantName').value.trim() || currentName(),
        owner_name: fixedModuleOwner || $('ownerName').value.trim() || currentName(),
        tracking_no: $('trackingNo').value.trim(),
        return_tracking_no: $('returnTrackingNo').value.trim(),
        return_location_id: $('returnLocationId').value || null,
        ship_date: shipDate || null,
        vendor_received_date: null,
        due_date: due,
        reminder_days: reminderDays,
        description: $('description').value.trim(),
        review_status: partReviewRequired ? REVIEW_STATUS.pending : REVIEW_STATUS.approved,
        review_note: '',
        reviewed_by: null,
        reviewed_at: null,
        last_reply_at: null,
        closed_at: null,
        created_by: state.user?.id || null,
        updated_by: state.user?.id || null,
        created_at: nowIso(),
        updated_at: nowIso()
      };
      if(!row.title) return toast('請輸入案件標題', 'bad');
      const existingLcdCase = normalizeCaseType(case_type) === LCD_CASE_TYPE ? findExistingLcdCaseByTitle(row.title) : null;
      if(existingLcdCase){
        const existingCount = state.data.case_items.filter(i => i.case_id === existingLcdCase.id).length;
        const confirmed = window.confirm(
          `已找到同標題液晶案件：${existingLcdCase.case_no}\n\n` +
          `標題：${row.title}\n目前已有 ${existingCount} 筆液晶資料。\n\n` +
          `按「確定」會併入同一筆案件；按「取消」則停止建立，請改標題後再新增。`
        );
        if(!confirmed) return;
      }
      const created = existingLcdCase || await dbInsert('cases', row);
      if(existingLcdCase){
        await dbUpdate('cases', existingLcdCase.id, {
          vendor_id: row.vendor_id || existingLcdCase.vendor_id,
          location_id: row.location_id || existingLcdCase.location_id,
          return_location_id: row.return_location_id || existingLcdCase.return_location_id || null,
          owner_name: row.owner_name || existingLcdCase.owner_name,
          applicant_name: row.applicant_name || existingLcdCase.applicant_name,
          description: row.description ? [existingLcdCase.description, row.description].filter(Boolean).join('\n---\n') : existingLcdCase.description,
          updated_by:state.user?.id || null,
          updated_at:nowIso()
        });
      }
      let insertedItems = 0;
      let updatedItems = 0;
      for(const item of collectItems()){
        const { _files, ...itemRow } = item;
        const existingItem = existingLcdCase ? findExistingItemBySn(existingLcdCase.id, itemRow.sn) : null;
        if(existingItem){
          const qty = Number(itemRow.qty || existingItem.qty || 1);
          const completed = Number(existingItem.completed_qty || 0);
          await dbUpdate('case_items', existingItem.id, {
            item_name:itemRow.item_name || existingItem.item_name,
            spec:itemRow.spec || existingItem.spec,
            problem_desc:itemRow.problem_desc || existingItem.problem_desc,
            qty,
            pending_qty:Math.max(qty-completed,0),
            vendor_result:itemRow.vendor_result || existingItem.vendor_result
          });
          await uploadFiles(existingLcdCase.id, _files, existingItem.id);
          updatedItems++;
        }else{
          const itemId = itemRow.id || uid();
          await dbInsert('case_items', { ...itemRow, id:itemId, case_id: created.id, created_at:nowIso() });
          await uploadFiles(created.id, _files, itemId);
          insertedItems++;
        }
      }
      if(normalizeCaseType(case_type) !== LCD_CASE_TYPE) await uploadFiles(created.id, $('attachments').files);
      await addLog(created, existingLcdCase ? '液晶同標題追加/更新' : '新增案件', existingLcdCase ? `同標題「${row.title}」追加 ${insertedItems} 筆、更新 ${updatedItems} 筆液晶資料` : `建立 ${created.case_type}：${created.title}`);
      clearNewCaseDraft();
      $('caseForm').reset();
      $('shipDate').value = '';
      $('dueDate').value = '';
      resetItemsEditor();
      await refreshAll();
      showSection('caseList');
      toast(existingLcdCase ? '已併入同標題液晶案件' : partReviewRequired ? '申請單已建立，會通知負責人審核' : '案件已建立');
    }catch(err){
      console.error(err);
      errorBanner(err.message || '建立案件失敗', $('caseForm'));
      toast(err.message || '建立案件失敗', 'bad');
    }
    finally{ endButtonBusy(busyButton); }
  }

  function collectItems(){
    return qsa('.item-editor', $('itemsEditor')).map(div => {
      const get = f => div.querySelector(`[data-field="${f}"]`)?.value?.trim() || '';
      const qty = Number(get('qty') || 0);
      const completed = Number(get('completed_qty') || 0);
      const files = div.querySelector('[data-field="item_files"]')?.files || [];
      return {
        id:uid(), item_name:get('item_name'), spec:get('spec'), sn:get('sn'), qty,
        problem_desc:get('problem_desc'), vendor_result:get('vendor_result'), completed_qty:completed,
        pending_qty:Math.max(qty-completed,0), created_at:nowIso(), _files:files
      };
    }).filter(i => i.item_name || i.problem_desc || i.sn || i.qty);
  }

  async function nextCaseNo(prefix){
    if(state.online && state.client){
      const { data, error } = await state.client.rpc('generate_case_no', { p_prefix: prefix });
      if(error) throw new Error('案件編號產生失敗：' + error.message);
      return data;
    }
    const today = compactDate(new Date());
    const same = state.data.cases.filter(c => String(c.case_no || '').startsWith(prefix + '-' + today));
    const num = String(same.length + 1).padStart(3,'0');
    return `${prefix}-${today}-${num}`;
  }


  async function uploadFiles(caseId, fileList, itemId=null){
    if(!fileList || !fileList.length) return;
    for(const file of [...fileList]){
      const baseRow = { id:uid(), case_id:caseId, item_id:itemId, file_name:file.name, file_type:file.type || 'file', uploaded_by:state.user?.id || null, uploaded_by_name:currentName(), created_at:nowIso() };
      if(state.online){
        let row;
        try{
          const path = `${caseId}/${Date.now()}-${uid()}-${safeStorageFileName(file.name)}`;
          const { error } = await state.client.storage.from('case-attachments').upload(path, file, { upsert:false });
          if(error) throw error;
          const { data } = state.client.storage.from('case-attachments').getPublicUrl(path);
          row = { ...baseRow, file_url:data.publicUrl, storage_path:path };
        }catch(storageErr){
          console.warn('Storage upload failed, saving compact preview instead.', storageErr);
          const dataUrl = await fileToLocalPreviewUrl(file);
          row = { ...baseRow, file_url:dataUrl, storage_path:'storage-fallback' };
          toast('Storage 上傳失敗，已先用壓縮預覽方式保存附件；請管理者檢查 Supabase Storage 權限。', 'warn');
        }
        await insertAttachmentRow(row);
      }else{
        const dataUrl = await fileToLocalPreviewUrl(file);
        await insertAttachmentRow({ ...baseRow, file_url:dataUrl, storage_path:'local-preview' });
      }
    }
  }

  async function insertAttachmentRow(row){
    try{
      return await dbInsert('case_attachments', row);
    }catch(err){
      const m = String(err?.message || '');
      const schemaMismatch = m.includes('schema cache') || m.includes('column') || m.includes('Could not find');
      if(!schemaMismatch) throw err;
      const compatibleRow = { ...row };
      ['item_id', 'uploaded_by', 'uploaded_by_name'].forEach(key => delete compatibleRow[key]);
      await dbInsert('case_attachments', compatibleRow);
      toast('附件已保存；提醒：Supabase 附件欄位尚未更新，部分欄位暫時以相容模式儲存。', 'warn');
      return compatibleRow;
    }
  }

  async function deleteCaseStorageFiles(caseId){
    const files = state.data.case_attachments.filter(a => a.case_id === caseId);
    const localPaths = new Set(['local-preview', 'storage-fallback', 'local-compacted']);
    const paths = [...new Set(files.map(a => a.storage_path).filter(p => p && !localPaths.has(p)))];
    if(state.online && paths.length){
      const { error } = await state.client.storage.from('case-attachments').remove(paths);
      if(error) throw new Error('刪除 Storage 照片失敗：' + error.message);
    }
    for(const file of files){
      await dbDelete('case_attachments', file.id);
    }
    return { total:files.length, storage:paths.length };
  }

  async function addLog(caseRow, action, detail){
    await dbInsert('case_logs', { id:uid(), case_id:caseRow?.id || null, case_no:caseRow?.case_no || '', action, actor_name:currentName(), actor_role:currentRole(), detail, created_at:nowIso() });
  }

  function latestCaseActivityAt(c){ return automationApi.latestCaseActivityAt(c); }
  function autoReminderSentToday(c, todayKey=toLocalDateInput(new Date())){ return automationApi.autoReminderSentToday(c, todayKey); }
  function isSchemaMissingError(err){ return automationApi.isSchemaMissingError(err); }
  async function updateAutomationFields(c, patch){ return automationApi.updateAutomationFields(c, patch); }
  async function runDailyCaseAutomation(){ return automationApi.runDailyCaseAutomation(); }
  function automationStatusHtml(c){ return automationApi.automationStatusHtml(c); }

  function visibleCases(){
    let cases = [...state.data.cases];
    if(isVendor() && state.profile?.vendor_id) cases = cases.filter(c => c.vendor_id === state.profile.vendor_id && isMainTableCase(c));
    if(currentRole() === 'viewer' && state.profile?.location_id) cases = cases.filter(c => c.location_id === state.profile.location_id || c.return_location_id === state.profile.location_id);
    return cases.sort((a,b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
  }
  function visibleMainCases(){
    return visibleCases().filter(isMainTableCase);
  }
  function isLocationReviewCase(c){
    return isPartCase(c)
      || String(c?.case_no || '').startsWith('PART-')
      || Object.values(REVIEW_STATUS).includes(c?.review_status);
  }

  function calcCase(c){
    const due = c.due_date ? new Date(c.due_date) : null;
    const today = todayStart();
    const open = !CLOSED_STATUS.includes(c.status);
    const daysToDue = due ? daysBetween(today, due) : null;
    const overdueDays = due && open && daysToDue < 0 ? Math.abs(daysToDue) : 0;
    const soon = due && open && daysToDue >= 0 && daysToDue <= 3;
    const last = new Date(latestCaseActivityAt(c));
    const noReplyDays = Math.max(0, daysBetween(last, new Date()));
    const noReply = open && c.vendor_id && noReplyDays >= Number(c.reminder_days || 7) && !['已完成','已退回/已到貨','結案','取消'].includes(c.status);
    const notReceived = open && c.ship_date && !c.vendor_received_date && daysBetween(new Date(c.ship_date), new Date()) >= 3;
    const urgentThreshold = c.priority === '重大' ? 1 : c.priority === '急件' ? 2 : null;
    const urgentNeedReply = open && !!urgentThreshold && c.vendor_id && (c.status === '待廠商回覆' || noReplyDays >= urgentThreshold);
    return { open, daysToDue, overdueDays, soon, overdue:overdueDays>0, noReplyDays, noReply, notReceived, urgentThreshold, urgentNeedReply };
  }

  function renderAll(){
    const section = state.section;
    if(section === 'dashboard') renderDashboard();
    if(section === 'caseList') renderCaseList();
    if(section === 'reminders') renderReminders();
    if(section === 'notifications') renderNotifications();
    if(section === 'vendorPortal') renderVendorPortal();
    if(section === 'locationReview') renderLocationReview();
    if(section === 'containerBatches') renderContainerBatches();
    if(section === 'vendorFollowup') renderVendorFollowup();
    if(section === 'reports') renderReports();
    if(section === 'settings') renderSettings();
    if(section === 'logs') renderLogs();
  }

  function updateUserUi(){
    $('sideUser').textContent = currentName();
    $('sideRole').textContent = roleName(currentRole());
    $('userName').textContent = currentName();
    $('userRole').textContent = roleName(currentRole());
    $('avatarText').textContent = currentName().trim().slice(0,1) || 'U';
    updateNotificationUi();
    const newCaseBtn = document.querySelector('[data-section="newCase"]');
    if(newCaseBtn) newCaseBtn.classList.toggle('hidden', !canCreate());
    ['settings','logs','importExport'].forEach(sec => {
      const b = document.querySelector(`[data-section="${sec}"]`);
      if(b) b.classList.toggle('hidden', !isAdmin());
    });
    ['reports','locationReview','containerBatches','vendorFollowup'].forEach(sec => {
      const b = document.querySelector(`[data-section="${sec}"]`);
      if(b) b.classList.toggle('hidden', isVendor() && sec !== 'vendorFollowup');
    });
    if(!isAdmin() && ['settings','logs','importExport'].includes(state.section)) showSection('dashboard');
  }

  function renderDashboard(){
    if(!$('dashboardCards')) return;
    const cases = visibleMainCases();
    const open = cases.filter(c => !CLOSED_STATUS.includes(c.status));
    const overdue = cases.filter(c => calcCase(c).overdue);
    const soon = cases.filter(c => calcCase(c).soon);
    const noReply = cases.filter(c => calcCase(c).noReply);
    const notificationStats = getNotificationItems();
    const unreadReplies = notificationStats.filter(n => n.kind === 'reply' && !n.read).length;
    const vendorReminders = notificationStats.filter(n => n.kind === 'vendorReminder' && !n.read).length;
    const urgentNeedReply = cases.filter(c => calcCase(c).urgentNeedReply);
    $('dashboardCards').innerHTML = [
      cardHtml('未結案', open.length, '所有尚未結案與取消的案件', 'blue'),
      cardHtml('新回覆通知', unreadReplies, '尚未查看的公司/廠商回覆', unreadReplies ? 'warn' : 'good'),
      cardHtml('廠商未回覆提醒', vendorReminders, '每日自動產生提醒', vendorReminders ? 'bad' : 'good'),
      cardHtml('已逾期', overdue.length, '超過預計完成日', 'bad')
    ].join('');
    const urgent = [...urgentNeedReply, ...overdue, ...soon, ...noReply].filter(uniqueById).slice(0,8);
    $('dashboardUrgent').innerHTML = urgent.length ? urgent.map(quickCaseRow).join('') : '<div class="empty">目前沒有需要追蹤的案件</div>';
    const typeStats = CASE_TYPES.map(t => {
      const n = cases.filter(c => normalizeCaseType(c.case_type) === t.value && !CLOSED_STATUS.includes(c.status)).length;
      return `<div class="item-box"><div class="row" style="justify-content:space-between"><b>${safe(t.value)}</b><span class="badge blue-b">${n} 件未結</span></div><div class="small muted">${safe(t.hint)}</div></div>`;
    }).join('');
    $('typeStats').innerHTML = typeStats;
    $('recentCasesBody').innerHTML = cases.slice(0,10).map(c => `
      <tr><td><b>${safe(c.case_no)}</b></td><td>${typeBadge(c.case_type)}</td><td>${safe(c.title)}</td><td>${safe(vendorName(c.vendor_id))}</td><td>${statusBadge(c.status)}</td><td>${dateText(c.due_date)}</td><td>${dateTimeText(c.last_reply_at)}</td><td><button class="btn ghost small-btn" onclick="window.VCS.openCase('${c.id}')">查看</button></td></tr>`).join('') || '<tr><td colspan="8" class="empty">尚無案件</td></tr>';
  }
  function uniqueById(value, index, self){ return self.findIndex(v => v.id === value.id) === index; }
  function cardHtml(title,num,note,type){ return `<div class="card"><h3>${title}</h3><div class="num ${type==='bad'?'danger':type==='warn'?'warn':type==='good'?'good':''}">${num}</div><div class="note">${note}</div></div>`; }
  function quickCaseRow(c){ const calc = calcCase(c); return `<div class="item-box"><div class="row" style="justify-content:space-between"><div><b>${safe(c.case_no)}</b> ${typeBadge(c.case_type)} ${priorityBadge(c.priority)} ${urgentBadge(calc)}</div>${reminderBadge(calc)}</div><div style="margin:8px 0">${safe(c.title)}</div><div class="small muted">廠商：${safe(vendorName(c.vendor_id))}｜預計完成：${dateText(c.due_date)}｜最後回覆：${dateTimeText(c.last_reply_at)}</div><button class="btn ghost small-btn" style="margin-top:10px" onclick="window.VCS.openCase('${c.id}')">查看案件</button></div>`; }

  function renderCaseList(){
    if(!$('caseTableBody')) return;
    const kw = $('filterKeyword').value.trim().toLowerCase();
    const type = $('filterType').value;
    const status = $('filterStatus').value;
    const vendor = $('filterVendor').value;
    const location = $('filterLocation').value;
    const overdue = $('filterOverdue').value;
    let cases = visibleMainCases();
    if(kw){
      const itemCases = state.data.case_items.filter(i => [i.item_name,i.spec,i.sn,i.problem_desc].join(' ').toLowerCase().includes(kw)).map(i => i.case_id);
      cases = cases.filter(c => [c.case_no,c.case_type,c.title,c.status,c.tracking_no,c.return_tracking_no,returnLocationName(c),c.description,c.owner_name,c.applicant_name].join(' ').toLowerCase().includes(kw) || itemCases.includes(c.id));
    }
    if(type) cases = cases.filter(c => normalizeCaseType(c.case_type) === type);
    if(status) cases = cases.filter(c => c.status === status);
    if(vendor) cases = cases.filter(c => c.vendor_id === vendor);
    if(location) cases = cases.filter(c => c.location_id === location);
    if(overdue){
      cases = cases.filter(c => {
        const calc = calcCase(c);
        if(overdue === 'soon') return calc.soon;
        if(overdue === 'overdue') return calc.overdue;
        if(overdue === 'normal') return !calc.soon && !calc.overdue;
        return true;
      });
    }
    renderCaseListStats(cases);
    const visibleRows = cases.slice(0, state.caseListLimit);
    $('caseTableBody').innerHTML = visibleRows.map(c => {
      const calc = calcCase(c);
      return `<tr class="${priorityRowClass(c.priority, calc)}">
        <td><b>${safe(c.case_no)}</b><div class="small muted">${dateText(c.created_at)}</div></td>
        <td>${typeBadge(c.case_type)}</td>
        <td><b>${safe(c.title)}</b><div style="margin-top:6px">${priorityBadge(c.priority)} ${reviewBadge(c)} ${urgentBadge(calc)}</div><div class="small muted">${safe((c.description||'').slice(0,70))}${(c.description||'').length>70?'…':''}</div></td>
        <td>${safe(locationName(c.location_id))}</td>
        <td>${safe(vendorName(c.vendor_id))}</td>
        <td>${statusBadge(c.status)}</td>
        <td>${safe(c.tracking_no || '-')}<div class="small muted">回寄：${safe(c.return_tracking_no || '-')}</div><div class="small muted">回寄地點：${safe(returnLocationName(c))}</div></td>
        <td>${dateText(c.due_date)}</td>
        <td>${reminderBadge(calc)}</td>
        <td>${safe(c.owner_name || '-')}</td>
        <td><button class="btn ghost small-btn" onclick="window.VCS.openCase('${c.id}')">查看/編輯</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="11" class="empty">沒有符合條件的案件</td></tr>';

    renderCaseListPager(cases.length, visibleRows.length);
  }

  function resetCaseListLimit(){
    state.caseListLimit = CASE_LIST_PAGE_SIZE;
  }

  function loadMoreCases(){
    state.caseListLimit += CASE_LIST_PAGE_SIZE;
    renderCaseList();
  }

  function renderCaseListPager(total, shown){
    const el = $('caseListPager');
    if(!el) return;
    if(total <= shown){
      el.innerHTML = total ? `<span class="small muted">已顯示全部 ${total} 筆</span>` : '';
      return;
    }
    el.innerHTML = `<span class="small muted">目前顯示 ${shown} / ${total} 筆</span><button class="btn ghost small-btn" id="loadMoreCasesBtn">載入更多</button>`;
    $('loadMoreCasesBtn')?.addEventListener('click', loadMoreCases);
  }

  function renderCaseListStats(cases){
    if(!$('caseListStats')) return;
    const open = cases.filter(c => !CLOSED_STATUS.includes(c.status));
    const overdue = cases.filter(c => calcCase(c).overdue);
    const urgent = cases.filter(c => calcCase(c).urgentNeedReply || c.priority === '重大' || c.priority === '急件');
    const pendingVendor = cases.filter(c => c.status === '待廠商回覆' || calcCase(c).noReply);
    $('caseListStats').innerHTML = [
      cardHtml('符合條件', cases.length, '目前篩選結果', 'blue'),
      cardHtml('未結案', open.length, '未結案與未取消', 'blue'),
      cardHtml('逾期', overdue.length, '超過預計完成日', overdue.length?'bad':'good'),
      cardHtml('待廠商回覆', pendingVendor.length, '需要廠商回覆/更新', pendingVendor.length?'warn':'good'),
      cardHtml('急件/重大', urgent.length, '優先處理案件', urgent.length?'bad':'good')
    ].join('');
  }

  function renderReminders(){
    if(!$('reminderList')) return;
    let cases = visibleMainCases().map(c => ({ c, calc:calcCase(c) })).filter(x => x.calc.overdue || x.calc.soon || x.calc.noReply || x.calc.notReceived);
    const f = state.reminderFilter;
    if(f === 'overdue') cases = cases.filter(x => x.calc.overdue);
    if(f === 'soon') cases = cases.filter(x => x.calc.soon);
    if(f === 'noReply') cases = cases.filter(x => x.calc.noReply);
    if(f === 'notReceived') cases = cases.filter(x => x.calc.notReceived);
    if(f === 'urgentReply') cases = cases.filter(x => x.calc.urgentNeedReply);
    cases.sort((a,b) => (b.calc.overdueDays - a.calc.overdueDays) || (a.calc.daysToDue ?? 99) - (b.calc.daysToDue ?? 99));
    $('reminderList').innerHTML = cases.length ? cases.map(({c,calc}) => `
      <div class="item-box">
        <div class="row" style="justify-content:space-between"><div><b>${safe(c.case_no)}</b> ${typeBadge(c.case_type)} ${statusBadge(c.status)}</div>${reminderBadge(calc)} ${urgentBadge(calc)}</div>
        <h3 style="margin:10px 0 8px">${safe(c.title)}</h3>
        <div class="grid-3 small muted">
          <div>廠商：${safe(vendorName(c.vendor_id))}</div><div>預計完成：${dateText(c.due_date)}</div><div>最後回覆：${dateTimeText(c.last_reply_at)}</div>
          <div>送出日期：${dateText(c.ship_date)}</div><div>廠商收件：${dateText(c.vendor_received_date)}</div><div>提醒天數：${c.reminder_days || '-'} 天</div>
        </div>
        <button class="btn ghost small-btn" style="margin-top:12px" onclick="window.VCS.openCase('${c.id}')">查看案件</button>
      </div>`).join('') : '<div class="empty">目前沒有提醒案件</div>';
  }


  function getNotificationItems(){
    const cases = visibleCases();
    const caseMap = new Map(cases.map(c => [c.id, c]));
    const items = [];
    const reads = readNotifications();
    const targetReplyRole = isVendor() ? '公司' : '廠商';
    cases.forEach(c => {
      if(isVendor()){
        const id = `vendor-new-${c.id}-${c.created_at || ''}`;
        items.push({
          id, kind:'vendorNewCase', title:'新案件通知', case:c, created_at:c.created_at || c.updated_at,
          message:`我司新增了案件「${c.title}」，請確認案件內容、品項與預計處理時程。`,
          meta:`案件類型：${normalizeCaseType(c.case_type)}｜送修地點：${locationName(c.location_id)}｜回寄地點：${returnLocationName(c)}｜${dateTimeText(c.created_at)}`,
          read:!!reads[id]
        });
      }
      if(isViewer() || isVendor() || !isPartCase(c)) return;
      if(needsReview(c) && canReviewCase(c)){
        const id = `review-request-${c.id}-${c.updated_at || c.created_at || ''}`;
        items.push({
          id, kind:'reviewRequest', title:'維修料品申請待審核', case:c, created_at:c.updated_at || c.created_at,
          message:`${c.applicant_name || '申請人'} 建立了維修料品申請，請確認內容是否可送入正式總表。\n\n審核通過後會進入總表；若不通過，請填寫原因退回給申請人修正。`,
          meta:`申請人：${c.applicant_name || '-'}｜負責人：${c.owner_name || '-'}｜地點：${locationName(c.location_id)}｜${dateTimeText(c.created_at)}`,
          read:false
        });
      }
      if(needsReview(c) && caseApplicantMatchesCurrentUser(c) && !canReviewCase(c)){
        const id = `review-pending-${c.id}-${c.updated_at || c.created_at || ''}`;
        items.push({
          id, kind:'reviewPending', title:'維修料品申請等待審核', case:c, created_at:c.updated_at || c.created_at,
          message:'你的維修料品申請已送出，正在等待維修料品負責人或管理者審核。審核通過後才會進入總表。',
          meta:`審核負責人：${c.owner_name || partOwnerName() || '-'}｜地點：${locationName(c.location_id)}｜${dateTimeText(c.created_at)}`,
          read:false
        });
      }
      if(reviewRejected(c) && caseApplicantMatchesCurrentUser(c)){
        const id = `review-rejected-${c.id}-${c.reviewed_at || c.updated_at || ''}`;
        items.push({
          id, kind:'reviewRejected', title:'維修料品申請審核退回', case:c, created_at:c.reviewed_at || c.updated_at || c.created_at,
          message:`你的維修料品申請未通過審核，請依退回原因修正後重新送審。\n\n退回原因：${c.review_note || '未填寫原因'}`,
          meta:`審核人：${c.reviewed_by || '-'}｜負責人：${c.owner_name || '-'}｜地點：${locationName(c.location_id)}｜${dateTimeText(c.reviewed_at || c.updated_at)}`,
          read:!!reads[id]
        });
      }
    });
    state.data.case_replies.forEach(r => {
      const c = caseMap.get(r.case_id);
      if(!c) return;
      if(isViewer()) return;
      if(!shouldShowPersonalCaseNotice(c)) return;
      if((r.reply_by || '') === currentName()) return;
      if(r.reply_role !== targetReplyRole) return;
      const id = `reply-${r.id}`;
      items.push({
        id, kind:'reply', title:`${r.reply_role}有新回覆`, case:c, created_at:r.created_at,
        message:r.message, meta:`回覆者：${r.reply_by || '-'}${r.reply_by_email ? '｜帳號：' + displayAccountValue(r.reply_by_email) : ''}｜通知帳號：${currentName()}｜回寄地點：${returnLocationName(c)}｜${dateTimeText(r.created_at)}`,
        read:!!reads[id]
      });
    });
    cases.forEach(c => {
      if(!shouldShowPersonalCaseNotice(c)) return;
      const calc = calcCase(c);
      if(!calc.urgentNeedReply) return;
      const id = `urgent-${c.id}-${c.updated_at || c.last_reply_at || c.status || ''}`;
      items.push({
        id, kind:'urgent', title:`${c.priority}需盡快回覆`, case:c, created_at:c.updated_at || c.created_at,
        message:`${c.priority}案件已 ${calc.noReplyDays} 天未有有效回覆，建議立即催覆或更新進度。`,
        meta:`廠商：${vendorName(c.vendor_id)}｜回寄地點：${returnLocationName(c)}｜狀態：${c.status}｜提醒門檻：${calc.urgentThreshold} 天`,
        read:!!reads[id]
      });
    });
    cases.forEach(c => {
      if(!shouldShowPersonalCaseNotice(c)) return;
      const calc = calcCase(c);
      if(!calc.noReply) return;
      const todayKey = toLocalDateInput(new Date());
      const id = `vendor-reminder-${c.id}-${c.last_vendor_reminder_date || todayKey}`;
      items.push({
        id, kind:'vendorReminder', title:isVendor() ? '請回覆案件進度' : '廠商未回覆自動提醒', case:c, created_at:c.last_vendor_reminder_at || c.updated_at || c.created_at,
        message:isVendor()
          ? `此案件已 ${calc.noReplyDays} 天未更新進度，已超過提醒天數 ${c.reminder_days || 7} 天。請回覆目前處理進度、預計完成日與是否需要我司補充資料。`
          : `廠商已 ${calc.noReplyDays} 天未回覆 / 未更新進度，已超過提醒天數 ${c.reminder_days || 7} 天。請催覆廠商，或請廠商登入工作台回覆最新進度。`,
        meta:`廠商：${vendorName(c.vendor_id)}｜回寄地點：${returnLocationName(c)}｜預計完成：${dateText(c.due_date)}｜最後活動：${dateTimeText(latestCaseActivityAt(c))}`,
        read:!!reads[id]
      });
    });
    state.data.case_logs.forEach(l => {
      if(l.action !== '補料登記通知') return;
      const c = caseMap.get(l.case_id);
      if(!c || !isLcdCase(c)) return;
      if(!shouldShowPersonalCaseNotice(c)) return;
      if((l.actor_name || '') === currentName()) return;
      const id = `restock-${l.id}`;
      items.push({
        id, kind:'restock', title:'液晶面板補料通知', case:c, created_at:l.created_at,
        message:l.detail || '液晶面板補料已登記，請確認本次補料對應的 SN 與貨櫃號碼。',
        meta:`操作人：${l.actor_name || '-'}｜通知帳號：${currentName()}｜回寄地點：${returnLocationName(c)}｜${dateTimeText(l.created_at)}`,
        read:!!reads[id]
      });
    });
    return items.sort((a,b) =>
      Number(a.read) - Number(b.read)
      || notificationPriority(a) - notificationPriority(b)
      || new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
  }

  function notificationPriority(n){
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
    return order[n.kind] ?? 9;
  }

  function updateNotificationUi(){
    if(!$('notificationCount')) return;
    const items = getNotificationItems();
    const unread = items.filter(n => !n.read).length;
    $('notificationCount').textContent = unread;
    $('notificationCount').classList.toggle('hidden', unread === 0);
    $('notificationBtn')?.classList.toggle('attention', unread > 0);
    const navBadge = $('navNotificationCount');
    if(navBadge){ navBadge.textContent = unread; navBadge.classList.toggle('hidden', unread === 0); }
    const navNotificationBtn = document.querySelector('[data-section="notifications"]');
    if(navNotificationBtn){
      navNotificationBtn.classList.toggle('has-unread', unread > 0);
      navNotificationBtn.title = unread > 0 ? `有 ${unread} 則未讀通知` : '目前沒有未讀通知';
    }
  }

  function renderNotifications(){
    if(!$('notificationList')) return;
    let items = getNotificationItems();
    const f = state.notificationFilter;
    if(f === 'unread') items = items.filter(n => !n.read);
    if(f === 'reply') items = items.filter(n => n.kind === 'reply');
    if(f === 'review') items = items.filter(n => n.kind === 'reviewRequest' || n.kind === 'reviewPending' || n.kind === 'reviewRejected');
    if(f === 'urgent') items = items.filter(n => n.kind === 'urgent');
    if(f === 'restock') items = items.filter(n => n.kind === 'restock');
    if(f === 'vendorNewCase') items = items.filter(n => n.kind === 'vendorNewCase');
    if(f === 'vendorReminder') items = items.filter(n => n.kind === 'vendorReminder');
    const allItems = getNotificationItems();
    const unread = allItems.filter(n => !n.read).length;
    const replyUnread = allItems.filter(n => n.kind === 'reply' && !n.read).length;
    const reviewUnread = allItems.filter(n => (n.kind === 'reviewRequest' || n.kind === 'reviewPending' || n.kind === 'reviewRejected') && !n.read).length;
    const urgentUnread = allItems.filter(n => n.kind === 'urgent' && !n.read).length;
    const vendorNewUnread = allItems.filter(n => n.kind === 'vendorNewCase' && !n.read).length;
    const vendorReminderUnread = allItems.filter(n => n.kind === 'vendorReminder' && !n.read).length;
    const restockUnread = allItems.filter(n => n.kind === 'restock' && !n.read).length;
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

  function notificationRow(n){
    const originalKind = n.kind;
    if(n.kind === 'reviewPending') n = {...n, kind:'reviewRequest'};
    const canAcknowledge = canAcknowledgeNotification(n);
    let badge = n.kind === 'urgent' ? '<span class="badge bad-b">急件催覆</span>' : n.kind === 'vendorNewCase' ? '<span class="badge blue-b">新案件</span>' : n.kind === 'vendorReminder' ? '<span class="badge violet-b">廠商未回覆</span>' : n.kind === 'restock' ? '<span class="badge blue-b">補料通知</span>' : n.kind === 'reviewRequest' ? '<span class="badge warn-b">待審核</span>' : n.kind === 'reviewRejected' ? '<span class="badge bad-b">審核退回</span>' : '<span class="badge warn-b">新回覆</span>';
    if(originalKind === 'reviewPending') badge = '<span class="badge warn-b">等待審核</span>';
    const read = n.read ? '<span class="badge good-b">已讀/已知悉</span>' : '<span class="badge bad-b">未讀</span>';
    const targetTab = n.kind === 'restock' ? 'items' : (n.kind === 'reviewRequest' || n.kind === 'reviewRejected' || n.kind === 'vendorNewCase') ? 'basic' : 'replies';
    const targetText = n.kind === 'restock' ? '查看補料對應' : (n.kind === 'reviewRequest' || n.kind === 'reviewRejected') ? '查看審核資料' : n.kind === 'vendorNewCase' ? '查看新案件' : '查看案件回覆';
    return `<div class="item-box notice-box ${n.read?'notice-read':'notice-unread'}">
      <div class="row" style="justify-content:space-between"><div><b>${safe(n.title)}</b> ${badge} ${priorityBadge(n.case.priority)}</div>${read}</div>
      <div style="margin:8px 0"><b>${safe(n.case.case_no)}</b>｜${safe(n.case.title)}</div>
      <div class="small muted">${safe(n.meta)}</div>
      <p style="white-space:pre-wrap;line-height:1.7">${safe(n.message)}</p>
      <div class="row"><button class="btn ghost small-btn" onclick="window.VCS.openNotification('${n.id}','${n.case.id}','${targetTab}')">${targetText}</button>${canAcknowledge ? (!n.read?`<button class="btn small-btn" onclick="window.VCS.markNotificationRead('${n.id}')">標記已讀/知悉</button>`:`<button class="btn ghost small-btn" onclick="window.VCS.markNotificationUnread('${n.id}')">改為未讀</button>`) : `<span class="small muted">${safe(notificationLockedText(n))}</span>`}</div>
    </div>`;
  }

  function canAcknowledgeNotification(n){
    if(n?.kind === 'reply') return true;
    if(n?.kind === 'reviewRequest' || n?.kind === 'reviewPending') return false;
    return !caseCreatedByCurrentUser(n?.case);
  }

  function notificationLockedText(n){
    if(n?.kind === 'reviewRequest' || n?.kind === 'reviewPending') return '審核通過/退回後才會扣除通知';
    return '自己建立的案件不可標記已讀/知悉';
  }

  async function acknowledgeNotification(n){
    if(!n || !canAcknowledgeNotification(n)) return;
    markNoticeRead(n.id);
  }

  function markCaseRepliesRead(caseId){
    const items = getNotificationItems().filter(n => n.kind === 'reply' && n.case.id === caseId && canAcknowledgeNotification(n));
    if(!items.length) return;
    const map = readNotifications();
    items.forEach(n => { map[n.id] = nowIso(); });
    saveNotifications(map);
    updateNotificationUi();
  }

  async function markAllNotificationsRead(){
    const map = readNotifications();
    const items = getNotificationItems().filter(canAcknowledgeNotification);
    for(const n of items){
      map[n.id] = nowIso();
    }
    saveNotifications(map);
    renderNotifications();
    toast('通知已全部標記已讀/知悉');
  }


  function clearCaseNotifications(caseId){
    return notificationStore.clearCaseNotifications(caseId);
  }

  function setNewCaseType(typeName){
    showSection('newCase');
    const type = CASE_TYPES.find(t => t.value === typeName);
    if(type && $('caseType')){
      $('caseType').value = type.value;
      $('reminderDays').value = type.defaultDays;
      $('dueDate').value = addDaysInput(new Date(), type.defaultDays);
      onTypeChange();
      if(typeName === '貨櫃送修') $('trackingNo').placeholder = '請填貨櫃批號，例如 CONT-202606-01';
      toast(`已切換到${typeName}表單`);
    }
  }

  function vendorPortalCases(){
    let cases = visibleMainCases();
    const vendor = $('vendorPortalVendor')?.value || '';
    const status = $('vendorPortalStatus')?.value || '';
    const need = $('vendorPortalNeed')?.value || '';
    if(isVendor() && state.profile?.vendor_id) cases = cases.filter(c => c.vendor_id === state.profile.vendor_id);
    else if(vendor) cases = cases.filter(c => c.vendor_id === vendor);
    if(status) cases = cases.filter(c => c.status === status);
    if(need) cases = cases.filter(c => { const x = calcCase(c); return x.urgentNeedReply || x.overdue || x.noReply || c.status === '待廠商回覆'; });
    return cases;
  }

  function renderVendorPortal(){
    if(!$('vendorPortalList')) return;
    const cases = vendorPortalCases();
    const open = cases.filter(c => !CLOSED_STATUS.includes(c.status));
    const need = cases.filter(c => { const x = calcCase(c); return x.urgentNeedReply || x.overdue || x.noReply || c.status === '待廠商回覆'; });
    const done = cases.filter(c => ['已完成','已退回/已到貨','結案'].includes(c.status));
    $('vendorPortalStats').innerHTML = [
      cardHtml('廠商案件', cases.length, '目前可查看案件', 'blue'),
      cardHtml('未結案', open.length, '尚未完成', 'blue'),
      cardHtml('需回覆', need.length, '逾期/急件/待回覆', need.length?'bad':'good'),
      cardHtml('完成/結案', done.length, '已處理完成', 'good')
    ].join('');
    $('vendorPortalList').innerHTML = cases.length ? cases.map(c => {
      const calc = calcCase(c);
      const items = state.data.case_items.filter(i => i.case_id === c.id);
      const lcdSummary = isLcdCase(c) ? lcdVendorSummaryHtml(c, items) : '';
      return `<div class="item-box ${priorityRowClass(c.priority, calc)}">
        <div class="row" style="justify-content:space-between"><div><b>${safe(c.case_no)}</b> ${typeBadge(c.case_type)} ${priorityBadge(c.priority)} ${urgentBadge(calc)}</div>${statusBadge(c.status)}</div>
        <h3 style="margin:10px 0 8px">${safe(c.title)}</h3>
        <div class="grid-3 small muted"><div>廠商：${safe(vendorName(c.vendor_id))}</div><div>預計完成：${dateText(c.due_date)}</div><div>最後回覆：${dateTimeText(c.last_reply_at)}</div><div>單號/批號：${safe(c.tracking_no||'-')}</div><div>回寄：${safe(c.return_tracking_no||'-')}</div><div>回寄地點：${safe(returnLocationName(c))}</div><div>品項：${items.length} 筆</div></div>
        ${lcdSummary}
        <p class="small muted" style="line-height:1.7">${safe((c.description||'').slice(0,120))}${(c.description||'').length>120?'…':''}</p>
        <div class="row"><button class="btn ghost small-btn" onclick="window.VCS.openCase('${c.id}')">查看案件</button><button class="btn small-btn" onclick="window.VCS.openCase('${c.id}','replies')">回覆進度</button></div>
      </div>`;
    }).join('') : '<div class="empty">目前沒有廠商案件</div>';
  }
  function lcdVendorSummaryHtml(c, items){
    const pending = items.filter(i => !parseRestockInfo(i.vendor_result).container);
    const supplied = items.length - pending.length;
    const preview = items.slice(0,5).map(i => {
      const r = parseRestockInfo(i.vendor_result);
      return `<tr><td>${itemThumbHtml(i, c)}</td><td><b>${safe(i.sn || '-')}</b><div class="small muted">${safe(i.spec || '-')}</div></td><td>${safe((i.problem_desc || '').slice(0,60))}</td><td>${safe(r.container || '待補料')}</td></tr>`;
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
    const kw = ($('locationReviewKeyword')?.value || '').trim().toLowerCase();
    let cases = visibleCases().filter(isLocationReviewCase);
    if(loc) cases = cases.filter(c => c.location_id === loc);
    if(status) cases = cases.filter(c => c.status === status);
    if(kw){
      const itemCases = state.data.case_items.filter(i => [i.item_name,i.spec,i.sn,i.problem_desc].join(' ').toLowerCase().includes(kw)).map(i => i.case_id);
      cases = cases.filter(c => [c.case_no,c.title,c.applicant_name,c.owner_name,c.description].join(' ').toLowerCase().includes(kw) || itemCases.includes(c.id));
    }
    const totalQty = state.data.case_items.filter(i => cases.some(c => c.id === i.case_id)).reduce((n,i)=>n+Number(i.qty||0),0);
    const overdue = cases.filter(c => calcCase(c).overdue);
    const pending = cases.filter(c => !CLOSED_STATUS.includes(c.status));
    const pendingReview = cases.filter(needsReview);
    const rejectedReview = cases.filter(reviewRejected);
    $('locationReviewStats').innerHTML = [
      cardHtml('料品申請', cases.length, '目前篩選案件', 'blue'),
      cardHtml('待審核', pendingReview.length, '等待負責人確認', pendingReview.length?'warn':'good'),
      cardHtml('審核退回', rejectedReview.length, '等待申請人修正', rejectedReview.length?'bad':'good'),
      cardHtml('未結案', pending.length, '待處理申請', 'blue'),
      cardHtml('申請數量', totalQty, '品項需求總數', 'good'),
      cardHtml('逾期', overdue.length, '需追蹤', overdue.length?'bad':'good')
    ].join('');
    const groups = groupBy(cases, c => c.location_id || '未指定');
    $('locationReviewList').innerHTML = Object.entries(groups).map(([locationId, list]) => {
      const items = state.data.case_items.filter(i => list.some(c => c.id === i.case_id));
      return `<div class="item-box"><div class="row" style="justify-content:space-between"><h3 style="margin:0">${safe(locationName(locationId))}</h3><span class="badge blue-b">${list.length} 件 / ${items.length} 筆品項</span></div>
        <div class="table-wrap"><table><thead><tr><th>案件</th><th>申請人</th><th>負責人</th><th>審核</th><th>廠商</th><th>狀態</th><th>品項摘要</th><th>預計完成</th><th>操作</th></tr></thead><tbody>
        ${list.map(c => { const its = state.data.case_items.filter(i => i.case_id === c.id); return `<tr><td><b>${safe(c.case_no)}</b><div>${safe(c.title)}</div></td><td>${safe(c.applicant_name||'-')}</td><td>${safe(c.owner_name||'-')}</td><td>${reviewBadge(c)}${c.review_note?`<div class="small muted">${safe(c.review_note.slice(0,40))}${c.review_note.length>40?'…':''}</div>`:''}</td><td>${safe(vendorName(c.vendor_id))}</td><td>${statusBadge(c.status)}</td><td>${safe(its.map(i=>`${i.item_name||'-'} x ${i.qty||0}`).join('、') || '-')}</td><td>${dateText(c.due_date)}</td><td><button class="btn ghost small-btn" onclick="window.VCS.openCase('${c.id}')">查看</button></td></tr>`; }).join('')}
        </tbody></table></div></div>`;
    }).join('') || '<div class="empty">目前沒有符合條件的料品申請</div>';
  }

  function renderContainerBatches(){
    if(!$('containerBatchList')) return;
    const kw = ($('containerKeyword')?.value || '').trim().toLowerCase();
    const vendor = $('containerVendor')?.value || '';
    const status = $('containerStatus')?.value || '';
    let cases = visibleMainCases().filter(c => c.case_type === '貨櫃送修');
    if(vendor) cases = cases.filter(c => c.vendor_id === vendor);
    if(status) cases = cases.filter(c => c.status === status);
    if(kw) cases = cases.filter(c => [c.case_no,c.tracking_no,c.title,c.description].join(' ').toLowerCase().includes(kw));
    const groups = groupBy(cases, c => c.tracking_no || c.case_no || '未填批號');
    $('containerBatchList').innerHTML = Object.entries(groups).map(([batchNo, list]) => {
      const items = state.data.case_items.filter(i => list.some(c => c.id === i.case_id));
      const qty = items.reduce((n,i)=>n+Number(i.qty||0),0);
      const done = items.reduce((n,i)=>n+Number(i.completed_qty||0),0);
      const pending = Math.max(qty-done,0);
      const overdue = list.filter(c => calcCase(c).overdue).length;
      return `<div class="item-box"><div class="row" style="justify-content:space-between"><div><h3 style="margin:0">${safe(batchNo)}</h3><div class="small muted">案件 ${list.length} 件｜品項 ${items.length} 筆｜廠商：${safe([...new Set(list.map(c=>vendorName(c.vendor_id)))].join('、'))}</div></div>${overdue?'<span class="badge bad-b">有逾期</span>':'<span class="badge good-b">批次正常</span>'}</div>
        <div class="kpi-row"><div class="item-box"><b>總數量</b><div class="num-mini">${qty}</div></div><div class="item-box"><b>已完成</b><div class="num-mini good">${done}</div></div><div class="item-box"><b>未完成</b><div class="num-mini ${pending?'warn':''}">${pending}</div></div></div>
        <div class="table-wrap"><table><thead><tr><th>案件</th><th>狀態</th><th>品項</th><th>預計完成</th><th>操作</th></tr></thead><tbody>${list.map(c => { const its = state.data.case_items.filter(i => i.case_id === c.id); return `<tr><td><b>${safe(c.case_no)}</b><div>${safe(c.title)}</div></td><td>${statusBadge(c.status)}</td><td>${safe(its.map(i=>`${i.item_name||'-'} ${i.qty||0}`).join('、') || '-')}</td><td>${dateText(c.due_date)}</td><td><button class="btn ghost small-btn" onclick="window.VCS.openCase('${c.id}')">查看</button></td></tr>`; }).join('')}</tbody></table></div></div>`;
    }).join('') || '<div class="empty">目前沒有貨櫃送修批次</div>';
  }

  function followupCases(){
    let arr = visibleMainCases().map(c => ({c, calc:calcCase(c)})).filter(x => x.calc.urgentNeedReply || x.calc.overdue || x.calc.noReply || x.c.status === '待廠商回覆');
    const f = state.followupFilter;
    if(f === 'urgent') arr = arr.filter(x => x.calc.urgentNeedReply || x.c.priority === '急件' || x.c.priority === '重大');
    if(f === 'overdue') arr = arr.filter(x => x.calc.overdue);
    if(f === 'noReply') arr = arr.filter(x => x.calc.noReply || x.c.status === '待廠商回覆');
    return arr.sort((a,b)=> (Number(b.calc.urgentNeedReply)-Number(a.calc.urgentNeedReply)) || (b.calc.overdueDays-a.calc.overdueDays) || (b.calc.noReplyDays-a.calc.noReplyDays));
  }

  function renderVendorFollowup(){
    if(!$('vendorFollowupList')) return;
    const arr = followupCases();
    $('vendorFollowupList').innerHTML = arr.length ? arr.map(({c,calc}) => {
      const msg = followupMessage(c, calc);
      return `<div class="item-box ${priorityRowClass(c.priority, calc)}"><div class="row" style="justify-content:space-between"><div><b>${safe(c.case_no)}</b> ${typeBadge(c.case_type)} ${priorityBadge(c.priority)} ${urgentBadge(calc)}</div>${reminderBadge(calc)}</div>
        <h3 style="margin:10px 0 8px">${safe(c.title)}</h3>
        <div class="grid-3 small muted"><div>廠商：${safe(vendorName(c.vendor_id))}</div><div>負責人：${safe(c.owner_name||'-')}</div><div>最後回覆：${dateTimeText(c.last_reply_at)}</div><div>預計完成：${dateText(c.due_date)}</div><div>狀態：${safe(c.status)}</div><div>單號：${safe(c.tracking_no||'-')}</div></div>
        <div class="dropzone small" style="margin-top:10px;white-space:pre-wrap">${safe(msg)}</div>
        <div class="row" style="margin-top:10px"><button class="btn ghost small-btn" onclick="window.VCS.copyFollowup('${c.id}')">複製催覆訊息</button><button class="btn small-btn" onclick="window.VCS.markVendorFollowed('${c.id}')">寫入已催覆紀錄</button><button class="btn ghost small-btn" onclick="window.VCS.openCase('${c.id}','replies')">查看回覆</button></div>
      </div>`;
    }).join('') : '<div class="empty">目前沒有需要催覆的廠商案件</div>';
  }

  function followupMessage(c, calc=calcCase(c)){
    return `廠商您好，請協助回覆案件進度。\n案件編號：${c.case_no}\n案件名稱：${c.title}\n目前狀態：${c.status}\n優先度：${c.priority}\n預計完成日：${dateText(c.due_date)}\n${calc.overdue?`已逾期：${calc.overdueDays} 天\n`:''}${calc.noReply?`未更新：${calc.noReplyDays} 天\n`:''}請盡快回覆目前處理進度、預計完成日與是否需要我司補充資料。`;
  }

  async function copyFollowup(id){
    const c = state.data.cases.find(x => x.id === id); if(!c) return;
    const msg = followupMessage(c);
    try{ await navigator.clipboard.writeText(msg); toast('已複製催覆訊息'); }
    catch(_){ prompt('請複製催覆訊息', msg); }
  }

  async function markVendorFollowed(id){
    const c = state.data.cases.find(x => x.id === id); if(!c) return;
    await addLog(c, '催覆廠商', `已催覆 ${vendorName(c.vendor_id)}：${c.title}`);
    await dbUpdate('cases', c.id, { updated_at:nowIso(), updated_by:state.user?.id || null });
    await refreshAll(); toast('已寫入催覆紀錄');
  }

  function renderReports(){
    if(!$('reportSummary')) return;
    const cases = visibleMainCases();
    const open = cases.filter(c => !CLOSED_STATUS.includes(c.status));
    const overdue = cases.filter(c => calcCase(c).overdue);
    const urgent = cases.filter(c => calcCase(c).urgentNeedReply);
    const replies = state.data.case_replies.filter(r => cases.some(c => c.id === r.case_id));
    $('reportSummary').innerHTML = [
      cardHtml('全部案件', cases.length, '可查看案件總量', 'blue'),
      cardHtml('未結案', open.length, '尚在處理', 'blue'),
      cardHtml('已逾期', overdue.length, '超過預計完成日', overdue.length?'bad':'good'),
      cardHtml('急件需回覆', urgent.length, '重大/急件超過門檻', urgent.length?'bad':'good'),
      cardHtml('回覆紀錄', replies.length, '公司與廠商回覆數', 'good')
    ].join('');
    $('reportVendorTable').innerHTML = statTable(groupStats(cases, c => vendorName(c.vendor_id)), '廠商');
    $('reportTypeTable').innerHTML = statTable(groupStats(cases, c => normalizeCaseType(c.case_type) || '未分類'), '案件類型');
    $('reportLocationTable').innerHTML = statTable(groupStats(cases, c => locationName(c.location_id)), '地點');
    $('reportOwnerTable').innerHTML = statTable(groupStats(cases, c => c.owner_name || '未指定'), '負責人');
  }

  function renderSettings(){
    if(!$('vendorsList')) return;
    $('vendorsList').innerHTML = state.data.vendors.map(v => `<div class="item-box"><div class="row" style="justify-content:space-between"><div><b>${safe(v.vendor_name)}</b><div class="small muted">聯絡人：${safe(v.contact_person||'-')}｜Email：${safe(v.email||'-')}｜提醒：${v.default_sla_days||'-'} 天</div></div>${v.is_active===false?'<span class="badge bad-b">停用</span>':'<span class="badge good-b">啟用</span>'}</div><div class="row" style="margin-top:10px"><button class="btn ghost small-btn" onclick="window.VCS.toggleVendor('${v.id}')">${v.is_active===false?'啟用':'停用'}</button>${isAdmin()?`<button class="btn ghost small-btn" onclick="window.VCS.deleteVendor('${v.id}')">刪除</button>`:''}</div></div>`).join('') || '<div class="empty">尚無廠商</div>';
    $('locationsList').innerHTML = state.data.locations.map(l => `<div class="item-box" data-location-id="${safe(l.id)}"><div class="row" style="justify-content:space-between"><div><b>${safe(l.location_name)}</b><div class="small muted">負責人：${safe(l.manager_name||'-')}</div></div>${l.is_active===false?'<span class="badge bad-b">停用</span>':'<span class="badge good-b">啟用</span>'}</div>
      <div class="grid-2" style="margin-top:10px">
        <div class="field"><label>地點名稱</label><input data-location-field="location_name" value="${safe(l.location_name || '')}"></div>
        <div class="field"><label>地點負責人</label><select data-location-field="manager_name">${profileSelectOptions(l.manager_name || '', '未指定')}</select></div>
      </div>
      <div class="row" style="margin-top:10px"><button class="btn small-btn" onclick="window.VCS.saveLocation('${safe(l.id)}')">儲存地點</button><button class="btn ghost small-btn" onclick="window.VCS.toggleLocation('${safe(l.id)}')">${l.is_active===false?'啟用':'停用'}</button>${isAdmin()?`<button class="btn ghost small-btn" onclick="window.VCS.deleteLocation('${safe(l.id)}')">刪除</button>`:''}</div></div>`).join('') || '<div class="empty">尚無地點</div>';
    $('profileInfo').innerHTML = `
      <div class="kpi-row">
        <div class="item-box"><b>登入名稱</b><div class="muted">${safe(currentName())}</div></div>
        <div class="item-box"><b>角色</b><div class="muted">${safe(roleName(currentRole()))}</div></div>
        <div class="item-box"><b>資料模式</b><div class="muted">${state.online?'Supabase 雲端模式':'本機展示模式'}</div></div>
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
    if(!isAdmin()){ body.innerHTML = ''; return; }
    const cfg = getConfig();
    const maskedKey = cfg.key ? `${cfg.key.slice(0, 16)}...${cfg.key.slice(-8)}` : '未設定';
    body.innerHTML = `<div class="grid-2">
      <div class="item-box"><b>Supabase URL</b><div class="muted">${safe(cfg.url || '未設定')}</div></div>
      <div class="item-box"><b>Publishable / anon key</b><div class="muted">${safe(maskedKey)}</div></div>
    </div>
    <div class="hint" style="margin-top:12px">線上版已由 config.js 內建雲端設定；一般使用者登入頁不顯示 URL / key，避免誤操作。</div>`;
  }

  function moduleOwnerCheckboxes(p){
    return MODULE_OWNER_FIELDS.map(item =>
      `<label class="small" style="display:block;margin:2px 0"><input type="checkbox" data-profile-field="${item.field}" ${p[item.field]?'checked':''}> ${safe(item.label)}</label>`
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
    const vendorOptions = ['<option value="">未指定</option>'].concat(state.data.vendors.map(v => `<option value="${safe(v.id)}">${safe(v.vendor_name)}</option>`)).join('');
    const locationOptions = ['<option value="">未指定</option>'].concat(state.data.locations.map(l => `<option value="${safe(l.id)}">${safe(l.location_name)}</option>`)).join('');
    $('accountAdminList').innerHTML = `<div class="table-wrap account-admin-wrap"><table><thead><tr><th>帳號</th><th>名稱</th><th>角色</th><th>廠商</th><th>地點</th><th>模組主要負責人</th><th>狀態</th><th>操作</th></tr></thead><tbody>${profiles.map(p => {
      const isSelf = p.id === currentUserId();
      const roleSelect = `<select data-profile-field="role" ${isSelf?'disabled':''}>${roleOptions.map(([value,label]) => `<option value="${value}" ${p.role===value?'selected':''}>${label}</option>`).join('')}</select>`;
      const vendorSelect = `<select data-profile-field="vendor_id">${vendorOptions.replace(`value="${safe(p.vendor_id || '')}"`, `value="${safe(p.vendor_id || '')}" selected`)}</select>`;
      const locationSelect = `<select data-profile-field="location_id">${locationOptions.replace(`value="${safe(p.location_id || '')}"`, `value="${safe(p.location_id || '')}" selected`)}</select>`;
      return `<tr data-profile-id="${safe(p.id)}">
        <td><b>${safe(p.username || accountFromAuthEmail(p.email) || '-')}</b><div class="small muted">${safe(displayAccountValue(p.email) || '')}</div></td>
        <td><input data-profile-field="display_name" value="${safe(p.display_name || '')}" placeholder="顯示名稱"></td>
        <td>${roleSelect}${isSelf?'<div class="small muted">不能調整自己角色</div>':''}</td>
        <td>${vendorSelect}</td>
        <td>${locationSelect}</td>
        <td>${moduleOwnerCheckboxes(p)}</td>
        <td>${p.is_active===false?'<span class="badge bad-b">停用</span>':'<span class="badge good-b">啟用</span>'}</td>
        <td><button class="btn small-btn" onclick="window.VCS.saveProfileRole('${safe(p.id)}')">儲存</button><button class="btn ghost small-btn" onclick="window.VCS.toggleProfileActive('${safe(p.id)}')" ${isSelf?'disabled title="不能停用自己"':''}>${p.is_active===false?'啟用':'停用'}</button></td>
      </tr>`;
    }).join('')}</tbody></table></div><div class="hint" style="margin-top:12px">提醒：廠商帳號請將角色設為「廠商」，並選擇對應廠商；五大模組可分別指定主要負責人。設定後，建立或編輯該類案件時會自動帶入並鎖定內部負責人；維修料品申請仍會由維修料品主要負責人或管理者審核。</div>`;
  }

  async function saveProfileRole(id){
    if(!isAdmin()) return toast('只有管理者可以調整帳號權限', 'bad');
    const row = qsa('[data-profile-id]').find(el => el.dataset.profileId === id);
    const profile = state.data.profiles.find(p => p.id === id);
    if(!row || !profile) return toast('找不到帳號資料', 'bad');
    const field = name => row.querySelector(`[data-profile-field="${name}"]`);
    const patch = {
      display_name:field('display_name')?.value?.trim() || profile.display_name || profile.username || '',
      role:field('role')?.value || profile.role || 'operator',
      vendor_id:field('vendor_id')?.value || null,
      location_id:field('location_id')?.value || null,
      updated_at:nowIso()
    };
    MODULE_OWNER_FIELDS.forEach(item => { patch[item.field] = !!field(item.field)?.checked; });
    if(id === currentUserId()) patch.role = profile.role;
    const selectedOwnerModules = MODULE_OWNER_FIELDS.filter(item => patch[item.field]);
    if(selectedOwnerModules.length && ['vendor','viewer'].includes(patch.role)) return toast('模組主要負責人需為管理者或作業員', 'bad');
    try{
      for(const item of selectedOwnerModules){
        const others = state.data.profiles.filter(p => p.id !== id && p[item.field]);
        for(const other of others){
          await dbUpdate('profiles', other.id, { [item.field]:false, updated_at:nowIso() });
        }
      }
      await dbUpdate('profiles', id, patch);
    }catch(err){
      const ownerFieldMissing = MODULE_OWNER_FIELDS.some(item => String(err?.message || err).includes(item.field));
      if(isSchemaMissingError(err) && ownerFieldMissing){
        const fallbackPatch = { ...patch };
        MODULE_OWNER_FIELDS.forEach(item => { delete fallbackPatch[item.field]; });
        await dbUpdate('profiles', id, fallbackPatch);
        await refreshAll();
        return toast('帳號權限已更新；模組主要負責人欄位尚未建立，請先套用 database/patches/2026-06-25-add-module-owner-flags.sql', 'warn');
      }
      throw err;
    }
    const moduleOwnerText = selectedOwnerModules.length ? ' / 模組負責：' + selectedOwnerModules.map(item => item.label).join('、') : '';
    await addLog(null, '調整帳號權限', `${profile.username || profile.email || id} → ${roleName(patch.role)}${patch.vendor_id ? ' / 廠商：' + vendorName(patch.vendor_id) : ''}${moduleOwnerText}`);
    await refreshAll();
    toast('帳號權限已更新');
  }

  async function toggleProfileActive(id){
    if(!isAdmin()) return toast('只有管理者可以停用/啟用帳號', 'bad');
    if(id === currentUserId()) return toast('不能停用自己的帳號', 'bad');
    const profile = state.data.profiles.find(p => p.id === id);
    if(!profile) return toast('找不到帳號資料', 'bad');
    const next = profile.is_active === false;
    await dbUpdate('profiles', id, { is_active:next, updated_at:nowIso() });
    await addLog(null, next ? '啟用帳號' : '停用帳號', profile.username || profile.email || id);
    await refreshAll();
    toast(next ? '帳號已啟用' : '帳號已停用');
  }

  function renderLogs(){
    if(!$('logsBody')) return;
    const visibleIds = new Set(visibleCases().map(c => c.id));
    const logs = state.data.case_logs.filter(l => !l.case_id || visibleIds.has(l.case_id)).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0,200);
    $('logsBody').innerHTML = logs.map(l => `<tr><td>${dateTimeText(l.created_at)}</td><td>${safe(l.case_no || '-')}</td><td>${safe(l.action)}</td><td>${safe(l.actor_name || '-')}</td><td>${safe(l.detail || '-')}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">尚無操作紀錄</td></tr>';
  }

  async function addVendor(){
    if(!canEditCore()) return toast('目前角色不能維護基本資料', 'bad');
    const name = $('newVendorName').value.trim();
    if(!name) return toast('請輸入廠商名稱', 'bad');
    const row = { id:uid(), vendor_name:name, contact_person:$('newVendorContact').value.trim(), email:$('newVendorEmail').value.trim(), phone:'', default_sla_days:Number($('newVendorSla').value || 14), is_active:true, created_at:nowIso() };
    await dbInsert('vendors', row);
    await addLog(null, '新增廠商', name);
    $('newVendorName').value = ''; $('newVendorContact').value = ''; $('newVendorEmail').value = '';
    await refreshAll(); toast('廠商已新增');
  }
  async function addLocation(){
    if(!canEditCore()) return toast('目前角色不能維護基本資料', 'bad');
    try{
      const name = $('newLocationName').value.trim();
      if(!name) return toast('請輸入地點名稱', 'bad');
      const row = { id:uid(), location_name:name, manager_name:$('newLocationManager').value.trim(), address:'', is_active:true, created_at:nowIso() };
      await dbInsert('locations', row);
      await addLog(null, '新增地點', name);
      $('newLocationName').value = ''; $('newLocationManager').value = '';
      await refreshAll(); toast('地點已新增');
    }catch(err){
      console.error(err);
      toast(err.message || '新增地點失敗，請確認權限或資料庫欄位', 'bad');
    }
  }

  async function toggleVendor(id){
    if(!canEditCore()) return toast('目前角色不能維護基本資料', 'bad');
    const v = byId(state.data.vendors,id); if(!v) return;
    await dbUpdate('vendors', id, { is_active: v.is_active === false });
    await addLog(null, '更新廠商', `${v.vendor_name} ${v.is_active===false?'啟用':'停用'}`);
    await refreshAll();
  }
  async function toggleLocation(id){
    if(!canEditCore()) return toast('目前角色不能維護基本資料', 'bad');
    const l = byId(state.data.locations,id); if(!l) return;
    await dbUpdate('locations', id, { is_active: l.is_active === false });
    await addLog(null, '更新地點', `${l.location_name} ${l.is_active===false?'啟用':'停用'}`);
    await refreshAll();
  }
  async function saveLocation(id){
    if(!isAdmin()) return toast('只有管理者可以編輯地點', 'bad');
    const row = qsa('[data-location-id]').find(el => el.dataset.locationId === id);
    const loc = byId(state.data.locations, id);
    if(!row || !loc) return toast('找不到地點資料', 'bad');
    const name = row.querySelector('[data-location-field="location_name"]')?.value.trim() || '';
    const manager = row.querySelector('[data-location-field="manager_name"]')?.value.trim() || '';
    if(!name) return toast('請輸入地點名稱', 'bad');
    await dbUpdate('locations', id, { location_name:name, manager_name:manager });
    await addLog(null, '編輯地點', `${loc.location_name} → ${name} / 負責人：${manager || '未指定'}`);
    await refreshAll();
    toast('地點已更新');
  }
  async function deleteVendor(id){
    if(!isAdmin()) return toast('只有管理者可以刪除', 'bad');
    if(!confirm('確定刪除此廠商？已存在案件建議改停用即可。')) return;
    await dbDelete('vendors', id); await refreshAll();
  }
  async function deleteLocation(id){
    if(!isAdmin()) return toast('只有管理者可以刪除', 'bad');
    if(!confirm('確定刪除此地點？已存在案件建議改停用即可。')) return;
    await dbDelete('locations', id); await refreshAll();
  }

  function openCase(id, tab='basic'){
    const c = state.data.cases.find(x => x.id === id);
    if(!c) return;
    state.selectedCase = c;
    if(tab === 'replies') markCaseRepliesRead(id);
    $('modalTitle').textContent = `${c.case_no}｜${c.title}`;
    $('modalSub').innerHTML = `${typeBadge(c.case_type)} ${statusBadge(c.status)} ${priorityBadge(c.priority)} ${reviewBadge(c)} <span class="muted">廠商：${safe(vendorName(c.vendor_id))}｜送修地點：${safe(locationName(c.location_id))}｜回寄地點：${safe(returnLocationName(c))}</span>`;
    $('caseModal').classList.remove('hidden');
    renderCaseModal(tab);
  }
  function closeModal(){ $('caseModal').classList.add('hidden'); state.selectedCase = null; }

  function renderCaseModal(activeTab='basic'){
    const c = state.selectedCase; if(!c) return;
    state.modalTab = activeTab;
    qsa('.modal-tabs .tab').forEach(b => {
      b.classList.toggle('active', b.dataset.modalTab === activeTab);
      b.onclick = () => renderCaseModal(b.dataset.modalTab);
    });
    const content = $('modalContent');
    if(activeTab === 'basic') content.innerHTML = modalBasic(c);
    if(activeTab === 'items') content.innerHTML = modalItems(c);
    if(activeTab === 'attachmentsTab') content.innerHTML = modalAttachments(c);
    if(activeTab === 'replies') content.innerHTML = modalReplies(c);
    if(activeTab === 'caseLogs') content.innerHTML = modalLogs(c);
    if(activeTab === 'attachmentsTab') ensureCaseDetailRows(c.id, 'case_attachments', activeTab);
    if(activeTab === 'caseLogs') ensureCaseDetailRows(c.id, 'case_logs', activeTab);
    renderModalHeaderActions(c);
    bindModalEvents(activeTab, c);
  }

  function renderModalHeaderActions(c){
    const headerActions = $('modalHeaderActions');
    if(!headerActions) return;
    headerActions.querySelectorAll('.header-action-btn').forEach(btn => btn.remove());
    const actions = [];
    if(canEditCase(c)) actions.push(['儲存', 'btn small-btn header-action-btn', 'headerSaveCaseBtn']);
    if(canEditCore()) actions.push(['結案', 'btn good-bg small-btn header-action-btn', 'headerCloseCaseBtn']);
    if(canDeleteCase(c)) actions.push(['刪除', 'btn danger-bg small-btn header-action-btn', 'headerDeleteCaseBtn']);
    actions.reverse().forEach(([text, cls, id]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = text;
      btn.className = cls;
      btn.id = id;
      headerActions.insertBefore(btn, headerActions.firstChild);
    });
    $('headerSaveCaseBtn')?.addEventListener('click', () => {
      if(!$('mStatus')){
        renderCaseModal('basic');
        toast('已切換到基本資料，請確認後再儲存', 'warn');
        return;
      }
      saveCaseBasic(c);
    });
    $('headerCloseCaseBtn')?.addEventListener('click', () => closeCase(c));
    $('headerDeleteCaseBtn')?.addEventListener('click', () => deleteCase(c));
  }

  function modalBasic(c){
    const editCore = canEditCore();
    const editAny = canEditCase(c);
    const statusOptions = STATUS.filter(s => editCore || VENDOR_STATUS.includes(s) || s === c.status).map(s => `<option ${s===c.status?'selected':''}>${safe(s)}</option>`).join('');
    const returnLocationOptions = locationSelectOptions(returnLocationId(c), '未指定 / 同送修地點');
    const lockedModuleOwner = moduleOwnerName(c.case_type);
    const ownerValue = lockedModuleOwner || c.owner_name || '';
    const ownerLocked = !!lockedModuleOwner;
    const ownerHint = `${moduleOwnerLabel(c.case_type)}主要負責人由帳號權限設定指定。`;
    return `<div class="modal-tab-content active">
      ${automationStatusHtml(c)}
      <div class="grid-3">
        <div class="field"><label>案件狀態</label><select id="mStatus" ${editAny?'':'disabled'}>${statusOptions}</select></div>
        <div class="field"><label>優先度</label><select id="mPriority" ${editCore?'':'disabled'}><option ${c.priority==='一般'?'selected':''}>一般</option><option ${c.priority==='急件'?'selected':''}>急件</option><option ${c.priority==='重大'?'selected':''}>重大</option></select></div>
        <div class="field"><label>預計完成日</label><input id="mDueDate" type="date" value="${safe(c.due_date||'')}" ${editAny?'':'disabled'}></div>
      </div>
      <div class="grid-3">
        <div class="field"><label>送出日期</label><input id="mShipDate" type="date" value="${safe(c.ship_date||'')}" ${editCore?'':'disabled'}></div>
        <div class="field"><label>廠商收件日</label><input id="mVendorReceived" type="date" value="${safe(c.vendor_received_date||'')}" ${editAny?'':'disabled'}></div>
        <div class="field"><label>提醒天數</label><input id="mReminderDays" type="number" min="1" value="${safe(c.reminder_days||14)}" ${editAny?'':'disabled'}></div>
      </div>
      <div class="grid-3">
        <div class="field"><label>追蹤單號 / 貨櫃批號</label><input id="mTrackingNo" value="${safe(c.tracking_no||'')}" ${editCore?'':'disabled'}></div>
        <div class="field"><label>回寄單號</label><input id="mReturnTrackingNo" value="${safe(c.return_tracking_no||'')}" ${editAny?'':'disabled'}></div>
        <div class="field"><label>回寄地點</label><select id="mReturnLocationId" ${editAny?'':'disabled'}>${returnLocationOptions}</select></div>
      </div>
      <div class="grid-3">
        <div class="field"><label>內部負責人</label><input id="mOwnerName" value="${safe(ownerValue)}" ${editCore && !ownerLocked?'':'disabled'}>${ownerLocked?`<div class="hint">${safe(ownerHint)}</div>`:''}</div>
      </div>
      ${reviewPanelHtml(c)}
      <div class="field"><label>問題描述 / 需求說明</label><textarea id="mDescription" ${editCore?'':'disabled'}>${safe(c.description||'')}</textarea></div>
      <div class="row" style="display:none">
        ${editAny?'<button class="btn" id="saveCaseBtn">儲存修改</button>':''}
        ${editCore?'<button class="btn good-bg" id="closeCaseBtn">結案</button>':''}
        ${canDeleteCase(c)?'<button class="btn danger-bg" id="deleteCaseBtn">刪除案件</button>':''}
      </div>
      <div class="hint" style="margin-top:14px">${caseHealthText(c)}</div>
    </div>`;
  }
  function reviewPanelHtml(c){
    if(!isPartCase(c)) return '';
    const status = reviewStatus(c);
    const statusText = status === REVIEW_STATUS.pending ? '待負責人審核' : status === REVIEW_STATUS.rejected ? '審核退回' : '審核通過';
    const note = c.review_note || '';
    const reviewer = c.reviewed_by ? `審核人：${safe(c.reviewed_by)}｜時間：${dateTimeText(c.reviewed_at)}` : '尚未審核';
    const rejectBox = canReviewCase(c) ? `
      <div class="field"><label>退回原因</label><textarea id="reviewRejectNote" placeholder="請填寫需要申請人修正的原因"></textarea></div>
      <div class="row"><button class="btn good-bg" id="approveReviewBtn">審核通過，進入總表</button><button class="btn danger-bg" id="rejectReviewBtn">審核不通過，退回修正</button></div>` : '';
    const resubmitBox = canResubmitReview(c) ? `
      <div class="row"><button class="btn" id="resubmitReviewBtn">已修正，重新送審</button></div>` : '';
    return `<div class="item-box">
      <div class="row" style="justify-content:space-between"><b>維修料品審核</b>${reviewBadge(c)}</div>
      <div class="grid-3 small muted" style="margin-top:10px"><div>審核狀態：${safe(statusText)}</div><div>指定負責人：${safe(c.owner_name || '-')}</div><div>${reviewer}</div></div>
      ${note ? `<div class="hint" style="margin-top:10px">退回/審核說明：${safe(note)}</div>` : ''}
      ${rejectBox}
      ${resubmitBox}
    </div>`;
  }

  function modalItems(c){
    const items = state.data.case_items.filter(i => i.case_id === c.id);
    const editCore = canEditCore();
    if(isLcdCase(c)) return modalLcdItems(c, items);
    return `<div class="modal-tab-content active">
      <div id="modalItemsList">${items.map(itemViewHtml).join('') || '<div class="empty">尚無品項明細</div>'}</div>
      ${editCore?`<div class="panel"><div class="panel-title"><div><h2>新增品項</h2><p>可補登送修品項、料品、SN 或 BUG 設備</p></div></div><div id="modalItemEditor"></div><button class="btn ghost small-btn" id="modalAddItemRow">新增一列</button><button class="btn" id="modalSaveItems" style="margin-left:8px">儲存新增品項</button></div>`:''}
    </div>`;
  }
  function modalLcdItems(c, items){
    const canEdit = canEditCase(c);
    const pending = items.filter(i => !parseRestockInfo(i.vendor_result).container && Number(i.pending_qty ?? Math.max((i.qty||0)-(i.completed_qty||0),0)) > 0);
    const supplied = items.filter(i => parseRestockInfo(i.vendor_result).container || Number(i.completed_qty||0) >= Number(i.qty||0));
    const pendingRows = lcdItemRowsHtml(c, pending, canEdit, 0, true);
    const suppliedRows = lcdItemRowsHtml(c, supplied, false, pending.length, false);
    return `<div class="modal-tab-content active">
      <div class="cards compact-cards">
        ${cardHtml('累計筆數', items.length, '目前此案件登錄的面板資料', 'blue')}
        ${cardHtml('待補料', pending.length, '尚未對應補料貨櫃', pending.length?'warn':'good')}
        ${cardHtml('已對應補料', supplied.length, '已登記補料/貨櫃', supplied.length?'good':'blue')}
        ${cardHtml('照片', state.data.case_attachments.filter(a => a.case_id === c.id).length, '已上傳附件數', 'blue')}
      </div>
      <div class="panel-title lcd-list-title"><div><h2>累計項目統計清單</h2><p>此案件已累計的液晶面板 SN、照片、問題確認與補料對應。</p></div></div>
      <div class="lcd-subtitle"><b>待補料清單</b><span class="badge warn-b">${pending.length} 筆</span></div>
      <div class="table-wrap lcd-table-wrap"><table class="lcd-table"><thead><tr><th>補料</th><th>照片</th><th>SN</th><th>設備資訊</th><th>問題確認</th><th>申請日期</th><th>補料狀態</th><th>補料日期</th><th>貨櫃號碼</th><th>批次</th></tr></thead><tbody>
        ${pendingRows || '<tr><td colspan="10" class="empty">目前沒有待補料資料</td></tr>'}
      </tbody></table></div>
      <details class="lcd-supplied-details">
        <summary><span>已補料清單</span><span class="badge good-b">${supplied.length} 筆</span></summary>
        <div class="table-wrap lcd-table-wrap"><table class="lcd-table"><thead><tr><th>#</th><th>照片</th><th>SN</th><th>設備資訊</th><th>問題確認</th><th>申請日期</th><th>補料狀態</th><th>補料日期</th><th>貨櫃號碼</th><th>批次</th></tr></thead><tbody>
          ${suppliedRows || '<tr><td colspan="10" class="empty">尚無已補料資料</td></tr>'}
        </tbody></table></div>
      </details>
      ${canEdit?`<div class="panel inner-panel">
        <div class="panel-title"><div><h2>本次補料登記</h2><p>勾選本次補料對應的 SN，填入補料批次與送來的貨櫃號碼。儲存後會通知案件負責人。</p></div></div>
        <div class="grid-3">
          <div class="field"><label>補料批次 / 單號</label><input id="lcdRestockBatch" placeholder="例如：LCD-RMA-202606-01"></div>
          <div class="field"><label>送來貨櫃號碼</label><input id="lcdRestockContainer" placeholder="例如：CONT-202606-A"></div>
          <div class="field"><label>補料日期</label><input id="lcdRestockDate" type="date" value="${toLocalDateInput(new Date())}"></div>
        </div>
        <div class="field"><label>補料備註 / 廠商判斷</label><textarea id="lcdRestockNote" placeholder="例如：本次先補 SN001-SN015，其餘待下批。"></textarea></div>
        <div class="row"><button class="btn" id="saveLcdRestockBtn">儲存補料對應並通知負責人</button></div>
      </div>`:''}
      ${canEditCore()?`<div class="panel"><div class="panel-title"><div><h2>新增液晶面板資料</h2><p>可持續累計登錄多筆 SN、設備資訊、問題與照片。</p></div></div><div id="modalItemEditor"></div><button class="btn ghost small-btn" id="modalAddItemRow">新增一列</button><button class="btn" id="modalSaveItems" style="margin-left:8px">儲存新增資料</button></div>`:''}
    </div>`;
  }
  function lcdItemRowsHtml(c, items, canEdit, offset=0, allowCheck=true){
    return items.map((i, idx) => {
      const r = parseRestockInfo(i.vendor_result);
      const status = r.status || (Number(i.completed_qty||0) >= Number(i.qty||0) ? '已補料' : '待補料');
      const num = offset + idx + 1;
      return `<tr>
        <td>${canEdit && allowCheck ? `<label class="check-cell"><input type="checkbox" class="lcd-restock-check" value="${safe(i.id)}"><span>${num}</span></label>` : num}</td>
        <td>${itemThumbHtml(i, c)}</td>
        <td><b>${safe(i.sn || '-')}</b><div class="small muted">${safe(i.item_name || '液晶面板')}</div></td>
        <td>${safe(i.spec || '-')}</td>
        <td>${safe(i.problem_desc || '-')}</td>
        <td>${dateText(i.created_at || c.created_at)}</td>
        <td>${statusBadge(status)}</td>
        <td>${dateText(r.date)}</td>
        <td>${safe(r.container || '-')}</td>
        <td>${safe(r.batch || '-')}</td>
      </tr>`;
    }).join('');
  }
  function itemViewHtml(i){ return `<div class="item-box"><div class="row" style="justify-content:space-between"><b>${safe(i.item_name || '-')}</b><span class="badge blue-b">數量 ${i.qty ?? 0}</span></div><div class="grid-3 small muted"><div>規格：${safe(i.spec||'-')}</div><div>SN：${safe(i.sn||'-')}</div><div>完成：${i.completed_qty||0} / 未完成：${i.pending_qty ?? Math.max((i.qty||0)-(i.completed_qty||0),0)}</div></div><p style="white-space:pre-wrap;line-height:1.7">${safe(i.problem_desc||'')}</p><div class="small muted">廠商判斷：${safe(i.vendor_result||'-')}</div></div>`; }

  function modalAttachments(c){
    const files = state.data.case_attachments.filter(a => a.case_id === c.id);
    const loading = state.online && !state.caseDetailLoaded.case_attachments?.has(c.id) ? '<div class="hint">正在載入此案件的完整附件...</div>' : '';
    return `<div class="modal-tab-content active">
      ${automationStatusHtml(c)}
      ${loading}
      <div class="grid-3">${files.map(fileCard).join('') || '<div class="empty">尚無附件</div>'}</div>
      ${canEditCase(c)?`<div class="panel"><div class="field"><label>新增附件</label><input type="file" id="mFiles" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.mp4,.mov"></div><button class="btn" id="uploadMoreBtn">上傳附件</button></div>`:''}
    </div>`;
  }
  function fileCard(f){
    const isImg = String(f.file_type||'').startsWith('image/') || String(f.file_url||'').startsWith('data:image');
    const item = f.item_id ? state.data.case_items.find(i => i.id === f.item_id) : null;
    return `<div class="item-box">${isImg?`<img src="${f.file_url}" alt="${safe(f.file_name)}" style="width:100%;max-height:220px;object-fit:cover;border-radius:12px;border:1px solid rgba(148,163,184,.18)">`:'<div class="dropzone">文件附件</div>'}<div style="margin-top:10px"><b>${safe(f.file_name||'附件')}</b>${item?`<div class="badge blue-b" style="margin-top:8px">對應 SN：${safe(item.sn || item.item_name || '-')}</div>`:''}<div class="small muted">上傳者：${safe(f.uploaded_by_name||'-')}｜${dateTimeText(f.created_at)}</div><a href="${f.file_url}" target="_blank" rel="noopener">開啟附件</a></div></div>`;
  }

  function modalReplies(c){
    const replies = state.data.case_replies.filter(r => r.case_id === c.id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    return `<div class="modal-tab-content active">
      <div class="timeline">${replies.map(r => `<div class="reply"><div class="meta"><span class="badge ${r.reply_role==='廠商'?'violet-b':'blue-b'}">${safe(r.reply_role||'-')}</span><span>${safe(r.reply_by||'-')}</span>${r.reply_by_email?`<span>帳號：${safe(displayAccountValue(r.reply_by_email))}</span>`:''}<span>${dateTimeText(r.created_at)}</span>${r.next_follow_date?`<span>下次追蹤：${dateText(r.next_follow_date)}</span>`:''}</div><p>${safe(r.message)}</p></div>`).join('') || '<div class="empty">尚無回覆</div>'}</div>
      ${canEditCase(c)?`<div class="panel"><div class="grid-2"><div class="field"><label>回覆身分｜系統依登入帳戶自動判斷</label><input id="replyRoleDisplay" value="${safe(currentReplyRole() + '｜' + currentName())}" disabled><div class="hint">回覆送出後會記錄目前登入帳戶，通知未讀/已讀也會依這個帳戶分開計算。</div></div><div class="field"><label>下次追蹤日</label><input id="nextFollowDate" type="date"></div></div><div class="field"><label>回覆內容</label><textarea id="replyMessage" placeholder="填寫廠商進度、公司追蹤內容或處理結果"></textarea></div><button class="btn" id="addReplyBtn">新增回覆</button></div>`:''}
    </div>`;
  }

  function modalLogs(c){
    const logs = state.data.case_logs.filter(l => l.case_id === c.id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    return `<div class="modal-tab-content active"><div class="table-wrap"><table><thead><tr><th>時間</th><th>動作</th><th>操作人</th><th>內容</th></tr></thead><tbody>${logs.map(l => `<tr><td>${dateTimeText(l.created_at)}</td><td>${safe(l.action)}</td><td>${safe(l.actor_name||'-')}</td><td>${safe(l.detail||'-')}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">尚無操作紀錄</td></tr>'}</tbody></table></div></div>`;
  }

  function bindModalEvents(tab, c){
    if(tab === 'basic'){
      $('saveCaseBtn')?.addEventListener('click', () => saveCaseBasic(c));
      $('closeCaseBtn')?.addEventListener('click', () => closeCase(c));
      $('deleteCaseBtn')?.addEventListener('click', () => deleteCase(c));
      $('approveReviewBtn')?.addEventListener('click', () => approvePartReview(c));
      $('rejectReviewBtn')?.addEventListener('click', () => rejectPartReview(c));
      $('resubmitReviewBtn')?.addEventListener('click', () => resubmitPartReview(c));
    }
    if(tab === 'items' && canEditCase(c)){
      $('saveLcdRestockBtn')?.addEventListener('click', () => saveLcdRestock(c));
    }
    if(tab === 'items' && canEditCore()){
      const editor = $('modalItemEditor');
      const addRow = () => {
        const div = document.createElement('div'); div.className = 'item-box mini-item-editor';
        div.innerHTML = `<div class="grid-3"><div class="field"><label>品項 / 設備</label><input data-field="item_name" placeholder="液晶面板"></div><div class="field"><label>規格 / 設備資訊</label><input data-field="spec"></div><div class="field"><label>SN</label><input data-field="sn"></div></div><div class="grid-3"><div class="field"><label>數量</label><input type="number" min="0" data-field="qty" value="1"></div><div class="field"><label>完成</label><input type="number" min="0" data-field="completed_qty" value="0"></div><div class="field"><label>廠商判斷</label><input data-field="vendor_result"></div></div><div class="field"><label>問題/需求</label><textarea data-field="problem_desc"></textarea></div><div class="field"><label>設備照片</label><input type="file" multiple accept="image/*" data-field="item_files"></div>`;
        editor.appendChild(div);
      };
      $('modalAddItemRow')?.addEventListener('click', addRow);
      $('modalSaveItems')?.addEventListener('click', () => saveModalItems(c));
      addRow();
    }
    if(tab === 'attachmentsTab') $('uploadMoreBtn')?.addEventListener('click', () => uploadMore(c));
    if(tab === 'replies') $('addReplyBtn')?.addEventListener('click', () => addReply(c));
  }

  async function saveCaseBasic(c){
    if(!canEditCase(c)) return toast('目前角色不能編輯此案件', 'bad');
    const busyButton = $('headerSaveCaseBtn') || $('saveCaseBtn');
    if(!beginButtonBusy(busyButton, '儲存中...')) return;
    toast('正在儲存案件...', 'warn');
    try{
      const status = $('mStatus').value;
      const patch = {
        status,
        priority:$('mPriority')?.value || c.priority,
        due_date:$('mDueDate').value || null,
        ship_date:$('mShipDate')?.value || null,
        vendor_received_date:$('mVendorReceived').value || null,
        reminder_days:Number($('mReminderDays').value || 14),
        tracking_no:$('mTrackingNo')?.value?.trim() || c.tracking_no,
        return_tracking_no:$('mReturnTrackingNo').value.trim(),
        return_location_id:$('mReturnLocationId')?.value || null,
        owner_name:moduleOwnerName(c.case_type) || $('mOwnerName')?.value?.trim() || c.owner_name,
        description:$('mDescription')?.value?.trim() || c.description,
        closed_at: CLOSED_STATUS.includes(status) ? (c.closed_at || nowIso()) : null,
        updated_by:state.user?.id || null,
        updated_at:nowIso()
      };
      const updated = await dbUpdate('cases', c.id, patch);
      await addLog(updated || c, '修改案件', `更新狀態/時效資料：${status}`);
      await refreshAll();
      state.selectedCase = state.data.cases.find(x => x.id === c.id);
      openCase(c.id);
      toast('案件已更新');
    }catch(err){
      console.error(err);
      errorBanner(err.message || '儲存案件失敗，請稍後再試', $('headerSaveCaseBtn') || $('saveCaseBtn'));
      toast(err.message || '儲存失敗','bad');
    }
    finally{ endButtonBusy(busyButton); }
  }
  async function closeCase(c){
    if(!canEditCore()) return;
    await dbUpdate('cases', c.id, { status:'結案', closed_at:nowIso(), updated_at:nowIso(), updated_by:state.user?.id || null });
    await addLog(c, '結案', '案件已結案');
    await refreshAll(); closeModal(); toast('案件已結案');
  }
  async function approvePartReview(c){
    if(!canReviewCase(c)) return toast('只有指定負責人或管理者可以審核', 'bad');
    const patch = {
      review_status:REVIEW_STATUS.approved,
      review_note:'',
      reviewed_by:currentName(),
      reviewed_at:nowIso(),
      status:'待整理',
      updated_by:state.user?.id || null,
      updated_at:nowIso()
    };
    const updated = await dbUpdate('cases', c.id, patch);
    await addLog(updated || c, '維修料品審核通過', `負責人 ${currentName()} 核准，案件進入總表`);
    await refreshAll();
    state.selectedCase = state.data.cases.find(x => x.id === c.id);
    renderCaseModal('basic');
    updateNotificationUi();
    toast('審核通過，已進入總表');
  }
  async function rejectPartReview(c){
    if(!canReviewCase(c)) return toast('只有指定負責人或管理者可以審核', 'bad');
    const note = $('reviewRejectNote')?.value.trim() || '';
    if(!note) return toast('請填寫審核不通過原因', 'bad');
    const patch = {
      review_status:REVIEW_STATUS.rejected,
      review_note:note,
      reviewed_by:currentName(),
      reviewed_at:nowIso(),
      status:'審核退回',
      updated_by:state.user?.id || null,
      updated_at:nowIso()
    };
    const updated = await dbUpdate('cases', c.id, patch);
    await addLog(updated || c, '維修料品審核退回', `退回給 ${c.applicant_name || '申請人'}：${note}`);
    await refreshAll();
    state.selectedCase = state.data.cases.find(x => x.id === c.id);
    renderCaseModal('basic');
    updateNotificationUi();
    toast('已退回申請人修正');
  }
  async function resubmitPartReview(c){
    if(!canResubmitReview(c)) return toast('只有申請人、負責人或管理者可以重新送審', 'bad');
    const patch = {
      review_status:REVIEW_STATUS.pending,
      status:'待負責人審核',
      reviewed_by:null,
      reviewed_at:null,
      updated_by:state.user?.id || null,
      updated_at:nowIso()
    };
    const updated = await dbUpdate('cases', c.id, patch);
    await addLog(updated || c, '維修料品重新送審', `${currentName()} 已修正並重新送審`);
    await refreshAll();
    state.selectedCase = state.data.cases.find(x => x.id === c.id);
    renderCaseModal('basic');
    updateNotificationUi();
    toast('已重新送審，負責人會看到通知');
  }
  async function deleteCase(c){
    if(!canDeleteCase(c)) return toast('只有案件建立者或管理者可以刪除案件', 'bad');
    if(!confirm('確定刪除此案件？此動作會一併刪除已上傳照片，無法還原。')) return;
    const busyButton = $('headerDeleteCaseBtn') || $('deleteCaseBtn');
    if(!beginButtonBusy(busyButton, '刪除中...')) return;
    toast('正在刪除案件與照片...', 'warn');
    try{
      clearCaseNotifications(c.id);
      const deletedFiles = await deleteCaseStorageFiles(c.id);
      await dbDelete('cases', c.id);
      state.data.case_items = state.data.case_items.filter(i => i.case_id !== c.id);
      state.data.case_replies = state.data.case_replies.filter(r => r.case_id !== c.id);
      state.data.case_attachments = state.data.case_attachments.filter(a => a.case_id !== c.id);
      if(!state.online) saveLocal();
      await addLog(c, '刪除案件', c.title);
      await refreshAll(); closeModal(); toast(`案件已刪除，已清除 ${deletedFiles.storage || deletedFiles.total} 個附件檔案`);
    }catch(err){
      console.error(err);
      toast(err.message || '刪除案件失敗，請確認 Storage 權限', 'bad');
    }finally{
      endButtonBusy(busyButton);
    }
  }
  async function saveModalItems(c){
    const busyButton = $('modalSaveItems');
    if(!beginButtonBusy(busyButton, '儲存中...')) return;
    toast('正在儲存品項與照片...', 'warn');
    try{
      const rows = qsa('.mini-item-editor').map(div => {
        const get = f => div.querySelector(`[data-field="${f}"]`)?.value?.trim() || '';
        const qty = Number(get('qty') || 0); const completed = Number(get('completed_qty') || 0);
        const files = div.querySelector('[data-field="item_files"]')?.files || [];
        const hasData = get('item_name') || get('spec') || get('sn') || get('problem_desc') || get('vendor_result') || files.length;
        return { id:uid(), case_id:c.id, item_name:get('item_name') || (isLcdCase(c) && hasData ? '液晶面板' : ''), spec:get('spec'), sn:get('sn'), qty:qty || (hasData ? 1 : 0), completed_qty:completed, pending_qty:Math.max((qty || (hasData ? 1 : 0))-completed,0), vendor_result:get('vendor_result'), problem_desc:get('problem_desc'), created_at:nowIso(), _files:files, _hasData:hasData };
      }).filter(i => i._hasData);
      if(!rows.length) return toast('請至少填寫一筆 SN、設備資訊、問題，或選擇設備照片', 'bad');
      for(const row of rows){
        const { _files, _hasData, ...itemRow } = row;
        await dbInsert('case_items', itemRow);
        await uploadFiles(c.id, _files, itemRow.id);
      }
      await addLog(c, '新增品項', `新增 ${rows.length} 筆品項明細`);
      await refreshAll(); state.selectedCase = state.data.cases.find(x => x.id === c.id); renderCaseModal('items'); toast('品項已新增');
    }catch(err){
      console.error(err);
      toast(err.message || '新增液晶資料失敗，請確認欄位或照片是否可上傳', 'bad');
    }finally{
      endButtonBusy(busyButton);
    }
  }
  async function saveLcdRestock(c){
    const busyButton = $('saveLcdRestockBtn');
    if(!beginButtonBusy(busyButton, '儲存中...')) return;
    toast('正在儲存補料對應...', 'warn');
    try{
      if(!canEditCase(c)) return toast('目前角色不能登記補料', 'bad');
      const selectedIds = qsa('.lcd-restock-check').filter(x => x.checked).map(x => x.value);
      if(!selectedIds.length) return toast('請先勾選本次補料對應的 SN 資料', 'bad');
      const batch = $('lcdRestockBatch')?.value?.trim() || '';
      const container = $('lcdRestockContainer')?.value?.trim() || '';
      const date = $('lcdRestockDate')?.value || toLocalDateInput(new Date());
      const note = $('lcdRestockNote')?.value?.trim() || '';
      if(!container) return toast('請填寫送來的貨櫃號碼', 'bad');
      const items = state.data.case_items.filter(i => selectedIds.includes(i.id));
      if(!items.length) return toast('找不到勾選的 SN 資料，請重新開啟案件再試一次', 'bad');
      for(const item of items){
        const qty = Number(item.qty || 1);
        await dbUpdate('case_items', item.id, {
          completed_qty:qty,
          pending_qty:0,
          vendor_result:buildRestockText(item.vendor_result, { batch, container, date, status:'已補料', note })
        });
      }
      const snList = items.map(i => i.sn || i.item_name || i.id).join('、');
      const detail = `液晶面板補料登記：${items.length} 筆｜貨櫃：${container}${batch ? '｜批次：' + batch : ''}｜SN：${snList}${note ? '｜備註：' + note : ''}`;
      await addLog(c, '補料登記通知', detail);
      await dbUpdate('cases', c.id, { last_reply_at:nowIso(), updated_at:nowIso(), updated_by:currentUserId() || null });
      await refreshAll();
      state.selectedCase = state.data.cases.find(x => x.id === c.id);
      renderCaseModal('items');
      updateNotificationUi();
      toast('補料對應已儲存，相關負責人會看到通知');
    }catch(err){
      console.error(err);
      toast(err.message || '補料登記失敗，請確認是否已勾選資料與資料庫權限', 'bad');
    }finally{
      endButtonBusy(busyButton);
    }
  }
  async function uploadMore(c){
    const files = $('mFiles')?.files || [];
    if(!files.length) return toast('請先選擇要上傳的附件', 'bad');
    const busyButton = $('uploadMoreBtn');
    if(!beginButtonBusy(busyButton, '上傳中...')) return;
    toast(`正在上傳 ${files.length} 個附件...`, 'warn');
    try{ await uploadFiles(c.id, files); await addLog(c, '新增附件', `上傳 ${files.length} 個附件`); await refreshAll(); state.selectedCase = state.data.cases.find(x => x.id === c.id); renderCaseModal('attachmentsTab'); toast(`附件已上傳，共 ${files.length} 個`); }
    catch(err){
      console.error(err);
      errorBanner(err.message || '附件上傳失敗', $('uploadMoreBtn'));
      toast(err.message || '附件上傳失敗','bad');
    }
    finally{ endButtonBusy(busyButton); }
  }
  async function addReply(c){
    if(!canEditCase(c)) return toast('目前角色不能回覆此案件', 'bad');
    const msg = $('replyMessage').value.trim(); if(!msg) return toast('請輸入回覆內容','bad');
    const busyButton = $('addReplyBtn');
    if(!beginButtonBusy(busyButton, '送出中...')) return;
    toast('正在送出回覆...', 'warn');
    try{
      const role = currentReplyRole();
      const actorId = currentUserId();
      const row = {
        id:uid(), case_id:c.id, reply_by:currentName(), reply_role:role,
        reply_by_user_id:actorId, reply_by_email:currentAccountName() || state.user?.email || '', reply_by_app_role:currentRole(),
        message:msg, next_follow_date:$('nextFollowDate').value || null, created_at:nowIso()
      };
      let reply;
      try{
        reply = await dbInsert('case_replies', row);
      }catch(err){
        const m = String(err?.message || '');
        const oldSchema = m.includes('reply_by_user_id') || m.includes('reply_by_email') || m.includes('reply_by_app_role') || m.includes('schema cache');
        if(!state.online || !oldSchema) throw err;
        const compatibleRow = { id:row.id, case_id:row.case_id, reply_by:row.reply_by, reply_role:row.reply_role, message:row.message, next_follow_date:row.next_follow_date, created_at:row.created_at };
        reply = await dbInsert('case_replies', compatibleRow);
        toast('回覆已新增；提醒：Supabase case_replies 欄位尚未更新，請補跑新版 SQL 才能完整記錄回覆帳號', 'warn');
      }
      markNoticeRead(`reply-${reply?.id || row.id}`);
      await dbUpdate('cases', c.id, { last_reply_at:nowIso(), status: role === '廠商' && c.status === '待廠商回覆' ? '廠商處理中' : c.status, updated_at:nowIso(), updated_by:actorId || null });
      await addLog(c, '新增回覆', `${role}｜${currentName()} 回覆：${msg.slice(0,60)}`);
      await refreshAll(); state.selectedCase = state.data.cases.find(x => x.id === c.id); renderCaseModal('replies'); updateNotificationUi(); toast('回覆已新增，相關帳號登入後才會看到自己的新回覆通知');
    }catch(err){
      console.error(err);
      errorBanner(err.message || '新增回覆失敗，請確認權限或 Supabase 欄位是否已更新', $('addReplyBtn'));
      toast(err.message || '新增回覆失敗，請確認權限或 Supabase 欄位是否已更新', 'bad');
    }finally{
      endButtonBusy(busyButton);
    }
  }

  function caseHealthText(c){
    const calc = calcCase(c);
    if(calc.urgentNeedReply) return `${c.priority}案件已 ${calc.noReplyDays} 天未有有效回覆，建議立即催覆廠商或更新處理進度。`;
    if(calc.overdue) return `此案件已逾期 ${calc.overdueDays} 天，建議立即追蹤廠商處理進度。`;
    if(calc.soon) return `此案件 ${calc.daysToDue === 0 ? '今天到期' : calc.daysToDue + ' 天後到期'}，請確認是否需要催廠商回覆。`;
    if(calc.noReply) return `廠商已 ${calc.noReplyDays} 天沒有回覆，超過提醒天數 ${c.reminder_days || 7} 天。`;
    if(calc.notReceived) return '已送出但廠商尚未確認收件，請確認貨運或貨櫃狀態。';
    return '此案件目前未逾期。';
  }

  function vendorName(id){ return byId(state.data.vendors,id)?.vendor_name || '未指定'; }
  function locationName(id){ return byId(state.data.locations,id)?.location_name || '未指定'; }
  function buildCaseRows(cases=visibleMainCases()){
    const header = ['案件編號','案件類型','案件標題','優先度','狀態','逾期狀態','逾期天數','廠商回覆狀態','廠商未回覆天數','上次自動提醒','地點','回寄地點','廠商','申請人','負責人','追蹤單號','回寄單號','送出日期','廠商收件日','預計完成日','提醒天數','最後回覆','問題描述'];
    const rows = cases.map(c => { const calc = calcCase(c); return [c.case_no,normalizeCaseType(c.case_type),c.title,c.priority,c.status,c.overdue_status || (calc.overdue?'已逾期':calc.soon?'快逾期':'正常'),calc.overdueDays,c.vendor_reply_status || (calc.noReply?'廠商未回覆':'正常'),calc.noReplyDays,c.last_vendor_reminder_date,locationName(c.location_id),returnLocationName(c),vendorName(c.vendor_id),c.applicant_name,c.owner_name,c.tracking_no,c.return_tracking_no,c.ship_date,c.vendor_received_date,c.due_date,c.reminder_days,c.last_reply_at,c.description]; });
    return [header, ...rows];
  }
  function exportCasesExcel(){
    const cases = visibleMainCases();
    const caseRows = buildCaseRows(cases);
    const itemRows = [['案件編號','品項','規格/設備資訊','SN','數量','已完成','未完成','問題描述','補料批次','貨櫃號碼','補料日期','廠商判斷']];
    state.data.case_items.filter(i => cases.some(c => c.id === i.case_id)).forEach(i => { const c = state.data.cases.find(x=>x.id===i.case_id); const r = parseRestockInfo(i.vendor_result); itemRows.push([c?.case_no || '', i.item_name, i.spec, i.sn, i.qty, i.completed_qty, i.pending_qty, i.problem_desc, r.batch || '', r.container || '', r.date || '', r.note || i.vendor_result]); });
    downloadXlsx(`廠商協作案件_${toDateInput(new Date())}.xlsx`, [{name:'案件總表', rows:caseRows}, {name:'品項明細', rows:itemRows}]);
  }

  function exportReportsExcel(){
    const cases = visibleMainCases();
    const sheets = [
      {name:'廠商統計', rows:statRows(groupStats(cases, c => vendorName(c.vendor_id)), '廠商')},
      {name:'類型統計', rows:statRows(groupStats(cases, c => normalizeCaseType(c.case_type) || '未分類'), '類型')},
      {name:'地點統計', rows:statRows(groupStats(cases, c => locationName(c.location_id)), '地點')},
      {name:'負責人統計', rows:statRows(groupStats(cases, c => c.owner_name || '未指定'), '負責人')}
    ];
    downloadXlsx(`廠商協作統計報表_${toDateInput(new Date())}.xlsx`, sheets);
  }
  function exportImportTemplate(){
    const rows = [["案件類型","案件標題","優先度","地點","回寄地點","廠商","申請人","負責人","單號","預計完成日","品項","規格","SN","數量","問題描述"], ["維修料品申請","範例：廠房A申請電源","急件","廠房 A","總公司","YS 廠商","地點負責人","白駿森","","2026-07-01","電源","百納","","5","維修備料申請"]];
    downloadText(`案件匯入範本_${toDateInput(new Date())}.csv`, '\ufeff' + rows.map(r=>r.map(csvEscape).join(',')).join('\n'), 'text/csv;charset=utf-8');
  }
  function mapByName(list, nameKey, name){
    return list.find(x => String(x[nameKey]||'').trim() === String(name||'').trim());
  }
  async function importCsvCases(){
    if(!canCreate()) return toast('目前角色不能匯入案件', 'bad');
    const file = $('importCsvFile')?.files?.[0]; if(!file) return toast('請先選擇 CSV 檔', 'bad');
    const text = await file.text();
    const rows = parseCsv(text.replace(/^\ufeff/,''));
    if(rows.length < 2) return toast('CSV 沒有資料', 'bad');
    const header = rows[0].map(h=>h.trim());
    const idx = name => header.indexOf(name);
    let createdCount = 0;
    for(const r of rows.slice(1)){
      const get = name => idx(name) >= 0 ? (r[idx(name)] || '').trim() : '';
      const caseType = get('案件類型') || '維修料品申請';
      const type = CASE_TYPES.find(t => t.value === caseType) || CASE_TYPES[2];
      const vendor = mapByName(state.data.vendors, 'vendor_name', get('廠商'));
      const loc = mapByName(state.data.locations, 'location_name', get('地點'));
      const returnLoc = mapByName(state.data.locations, 'location_name', get('回寄地點'));
      const dueDate = get('預計完成日') || addDaysInput(new Date(), type.defaultDays);
      const partReviewRequired = isPartCase(type.value);
      const fixedModuleOwner = moduleOwnerName(type.value);
      if(partReviewRequired && !fixedModuleOwner) return toast('請先設定維修料品主要負責人，再匯入維修料品申請', 'bad');
      const row = { id:uid(), case_no:await nextCaseNo(type.prefix), case_type:type.value, title:get('案件標題') || 'CSV 匯入案件', status:partReviewRequired?'待負責人審核':'待整理', priority:get('優先度') || '一般', location_id:loc?.id || null, return_location_id:returnLoc?.id || null, vendor_id:vendor?.id || null, applicant_name:get('申請人') || currentName(), owner_name:fixedModuleOwner || get('負責人') || currentName(), tracking_no:get('單號'), return_tracking_no:'', ship_date:null, vendor_received_date:null, due_date:dueDate, reminder_days:type.defaultDays, description:get('問題描述'), review_status:partReviewRequired?REVIEW_STATUS.pending:REVIEW_STATUS.approved, review_note:'', reviewed_by:null, reviewed_at:null, last_reply_at:null, closed_at:null, created_by:state.user?.id||null, updated_by:state.user?.id||null, created_at:nowIso(), updated_at:nowIso() };
      const c = await dbInsert('cases', row);
      if(get('品項') || get('問題描述')) await dbInsert('case_items', { id:uid(), case_id:c.id, item_name:get('品項'), spec:get('規格'), sn:get('SN'), qty:Number(get('數量')||1), problem_desc:get('問題描述'), vendor_result:'', completed_qty:0, pending_qty:Number(get('數量')||1), created_at:nowIso() });
      await addLog(c, 'CSV 匯入案件', c.title);
      createdCount++;
    }
    $('importPreview').textContent = `已匯入 ${createdCount} 筆案件。`;
    await refreshAll(); toast(`已匯入 ${createdCount} 筆案件`);
  }

  function exportCsv(){
    const rows = [['案件編號','類型','標題','狀態','逾期狀態','逾期天數','廠商回覆狀態','未回覆天數','上次自動提醒','地點','回寄地點','廠商','單號','回寄單號','預計完成','最後回覆','負責人']];
    visibleMainCases().forEach(c => { const calc = calcCase(c); rows.push([c.case_no,normalizeCaseType(c.case_type),c.title,c.status,c.overdue_status || (calc.overdue?'已逾期':calc.soon?'快逾期':'正常'),calc.overdueDays,c.vendor_reply_status || (calc.noReply?'廠商未回覆':'正常'),calc.noReplyDays,c.last_vendor_reminder_date,locationName(c.location_id),returnLocationName(c),vendorName(c.vendor_id),c.tracking_no,c.return_tracking_no,c.due_date,c.last_reply_at,c.owner_name]); });
    const csv = '\ufeff' + rows.map(r => r.map(v => `"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `廠商協作案件_${toDateInput(new Date())}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  function toast(msg, type='good'){
    const wrap = $('toastWrap');
    const div = document.createElement('div');
    div.className = `toast ${type==='bad'?'bad-t':type==='warn'?'warn-t':'good-t'}`;
    div.textContent = msg;
    wrap.appendChild(div);
    setTimeout(() => div.remove(), 3600);
  }

  function errorBanner(msg, contextEl=null){
    const target = contextEl?.closest('.panel, .modal-body, .section') || $('app') || document.body;
    target.querySelector('.error-banner')?.remove();
    const banner = document.createElement('div');
    banner.className = 'error-banner';
    banner.innerHTML = `<span>${safe(msg)}</span><button type="button" aria-label="關閉錯誤訊息">×</button>`;
    banner.querySelector('button')?.addEventListener('click', () => banner.remove());
    target.insertBefore(banner, target.firstChild);
    setTimeout(() => banner.remove(), 30000);
  }

  window.VCS = {
    openCase,
    openNotification:async (noticeId, caseId, tab='basic') => {
      const notice = getNotificationItems().find(n => n.id === noticeId);
      if(!notice) markNoticeRead(noticeId);
      else await acknowledgeNotification(notice);
      renderNotifications();
      updateNotificationUi();
      openCase(caseId, tab);
    },
    toggleVendor,
    toggleLocation,
    saveLocation,
    deleteVendor,
    deleteLocation,
    saveProfileRole,
    toggleProfileActive,
    copyFollowup,
    markVendorFollowed,
    markNotificationRead:async (id)=>{
      const notice = getNotificationItems().find(n => n.id === id);
      if(!notice) markNoticeRead(id);
      else await acknowledgeNotification(notice);
      renderNotifications();
      updateNotificationUi();
    },
    markNotificationUnread:(id)=>{
      const notice = getNotificationItems().find(n => n.id === id);
      if(!notice || canAcknowledgeNotification(notice)) markNoticeUnread(id);
      renderNotifications();
      updateNotificationUi();
    }
  };
  boot();
})();
