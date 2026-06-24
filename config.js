// 公司與廠商協作追蹤系統｜線上多人部署設定
// 正式部署請由 Vercel Environment Variables 注入，不把 Supabase URL/key 寫死在 git repo。
const VCS_ENV = window.__ENV__ || {};
const VCS_ENV_VALUE = key => {
  const value = VCS_ENV[key] || '';
  return value.startsWith('%') && value.endsWith('%') ? '' : value;
};

window.VENDOR_CASE_CONFIG = {
  supabaseUrl: VCS_ENV_VALUE('SUPABASE_URL'),
  supabaseAnonKey: VCS_ENV_VALUE('SUPABASE_ANON_KEY'),

  // true：部署後鎖定登入頁的 Supabase 設定欄位，避免使用者誤改成本機自己的設定
  // false：仍允許在登入頁手動輸入 / 修改 Supabase 設定
  lockConfig: true
};
