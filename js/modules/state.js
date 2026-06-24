export function emptyData(){
  return {
    vendors: [],
    locations: [],
    profiles: [],
    cases: [],
    case_items: [],
    case_replies: [],
    case_attachments: [],
    case_logs: []
  };
}

export function createInitialState(caseListPageSize){
  return {
    client: null,
    online: false,
    user: null,
    profile: null,
    section: 'dashboard',
    data: emptyData(),
    selectedCase: null,
    reminderFilter: 'all',
    notificationFilter: 'all',
    followupFilter: 'all',
    caseListLimit: caseListPageSize,
    modalTab: 'basic',
    caseDetailLoaded: { case_attachments: new Set(), case_logs: new Set() },
    caseDetailLoading: {},
    automationFieldsAvailable: true,
    draftRestored: false,
    realtimeChannel: null,
    realtimeRefreshTimer: null
  };
}
