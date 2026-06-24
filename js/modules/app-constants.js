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
