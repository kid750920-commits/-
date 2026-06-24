// 公司與廠商協作追蹤系統｜線上多人部署設定
// 1. 到 Supabase 專案 Settings → API 複製 Project URL 與 publishable key / anon public key
// 2. 貼到下方 supabaseUrl / supabaseAnonKey
// 3. 部署後，所有人使用同一個網址登入，就會共用同一套雲端資料
window.VENDOR_CASE_CONFIG = {
  supabaseUrl: 'https://agowadunriupsakziwmr.supabase.co',
  supabaseAnonKey: 'sb_publishable_VKO-SUJcUaKDC76VuEFdOw_EIz11fUM',

  // true：部署後鎖定登入頁的 Supabase 設定欄位，避免使用者誤改成本機自己的設定
  // false：仍允許在登入頁手動輸入 / 修改 Supabase 設定
  lockConfig: true
};
