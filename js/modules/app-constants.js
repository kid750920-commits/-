export const APP_KEYS = {
  storage: 'vendor_case_system_phase2_localdb_v1',
  config: 'vendor_case_system_phase1_config',
  notificationsRead: 'vendor_case_system_phase1_notifications_read_v1',
  newCaseDraft: 'vendor_case_system_new_case_draft_v1'
};

export const PAGE_SIZES = {
  caseList: 100,
  cloudFetch: 1000
};

export const INTERNAL_AUTH_DOMAIN = 'vcs.local';

export const CLOUD_TABLES = [
  'vendors',
  'locations',
  'profiles',
  'cases',
  'case_items',
  'case_replies',
  'case_attachments',
  'case_logs'
];

export const LCD_CASE_TYPE = '液晶面板申請(保固內)';
export const PART_CASE_TYPE = '維修料品申請';

export const CASE_TYPES = [
  { value:'順豐送修', prefix:'SF', defaultDays:14, hint:'適合記錄順豐單號、寄出日、廠商收件日與回寄單號。' },
  { value:'貨櫃送修', prefix:'CONT', defaultDays:30, hint:'適合一批貨櫃回去，多筆送修品項可分別追蹤。' },
  { value:PART_CASE_TYPE, prefix:'PART', defaultDays:7, hint:'適合各辦公地點提出料品申請，統一整理後由廠商回覆進度。' },
  { value:LCD_CASE_TYPE, prefix:'LCD', defaultDays:14, hint:'適合申請人上傳設備損壞照片，填寫設備資訊、SN 號碼，並以清單統計提供廠商處理。' },
  { value:'程式BUG回報', prefix:'BUG', defaultDays:7, hint:'適合記錄機器設備程式 BUG、發生步驟、廠商修正版本與測試結果。' }
];

export const STATUS = ['草稿','待負責人審核','審核退回','待整理','待送出廠商','已送出廠商','廠商已收件','廠商處理中','待廠商回覆','待我司確認','已完成','已退回/已到貨','結案','取消'];
export const CLOSED_STATUS = ['結案','取消'];
export const VENDOR_STATUS = ['廠商已收件','廠商處理中','待我司確認','已完成','已退回/已到貨'];

export const REVIEW_STATUS = {
  pending:'pending',
  approved:'approved',
  rejected:'rejected'
};

export const MODULE_OWNER_FIELDS = [
  { type:'順豐送修', field:'is_sf_owner', label:'順豐送修' },
  { type:'貨櫃送修', field:'is_container_owner', label:'貨櫃送修' },
  { type:PART_CASE_TYPE, field:'is_part_owner', label:'維修料品申請' },
  { type:LCD_CASE_TYPE, field:'is_lcd_owner', label:'液晶面板申請' },
  { type:'程式BUG回報', field:'is_bug_owner', label:'程式BUG回報' }
];
