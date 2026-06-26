const STATUS_DRAFT = '草稿';
const STATUS_REVIEW_PENDING = '待負責人審核';
const STATUS_REVIEW_REJECTED = '審核退回';
const STATUS_ORGANIZING = '待整理';
const STATUS_READY_TO_SHIP = '待送出廠商';
const STATUS_SHIPPED = '已送出廠商';
const STATUS_VENDOR_RECEIVED = '廠商已收件';
const STATUS_VENDOR_WORKING = '廠商處理中';
const STATUS_WAIT_VENDOR_REPLY = '待廠商回覆中';
const STATUS_WAIT_INTERNAL_CONFIRM = '待我司確認';
const STATUS_VENDOR_SHIPPED = '廠商已寄出';
const STATUS_DONE = '已完成';

export function createStatusFlow({
  closedStatus,
  reviewStatusValues,
  reviewStatus,
  needsReview,
  reviewRejected
}){
  function deriveCaseStatus(caseRow, options={}){
    const current = options.currentStatus || caseRow?.status || STATUS_ORGANIZING;
    if(isFinalStatus(current)) return current;
    if(needsReview(caseRow)) return STATUS_REVIEW_PENDING;
    if(reviewRejected(caseRow)) return STATUS_REVIEW_REJECTED;

    const replyRole = String(options.replyRole || '');
    const appRole = String(options.appRole || '');
    if(replyRole || appRole){
      if(appRole === 'vendor' || replyRole.includes('廠商')) return STATUS_WAIT_INTERNAL_CONFIRM;
      return STATUS_WAIT_VENDOR_REPLY;
    }

    if(caseRow?.return_tracking_no) return STATUS_VENDOR_SHIPPED;

    const items = options.items || [];
    if(itemsComplete(items)){
      return STATUS_DONE;
    }

    if(caseRow?.vendor_received_date) return STATUS_VENDOR_WORKING;
    if(caseRow?.ship_date || caseRow?.tracking_no) return STATUS_SHIPPED;
    if(caseRow?.vendor_id) return STATUS_READY_TO_SHIP;
    return current === STATUS_DRAFT ? STATUS_DRAFT : STATUS_ORGANIZING;
  }

  function shouldAutoStatus(caseRow, selectedStatus){
    if(!selectedStatus) return true;
    if(selectedStatus === caseRow?.status) return true;
    if(isFinalStatus(selectedStatus)) return false;
    if(reviewStatus(caseRow) !== reviewStatusValues.approved) return true;
    return false;
  }

  function shouldMarkVendorViewed(caseRow){
    const current = String(caseRow?.status || '');
    if(isFinalStatus(current)) return false;
    if(needsReview(caseRow) || reviewRejected(caseRow)) return false;
    if(caseRow?.return_tracking_no) return false;
    return [
      STATUS_READY_TO_SHIP,
      STATUS_SHIPPED,
      STATUS_VENDOR_RECEIVED,
      STATUS_WAIT_VENDOR_REPLY,
      '待廠商回覆'
    ].includes(current);
  }

  function vendorViewedStatus(){
    return STATUS_VENDOR_WORKING;
  }

  function isFinalStatus(status){
    return closedStatus.includes(status);
  }

  function itemsComplete(items){
    const rows = (items || []).filter(item => Number(item.qty || 0) > 0 || Number(item.completed_qty || 0) > 0);
    if(!rows.length) return false;
    return rows.every(item => {
      const qty = Number(item.qty || 0);
      const completed = Number(item.completed_qty || 0);
      const pending = item.pending_qty == null ? Math.max(qty - completed, 0) : Number(item.pending_qty || 0);
      return qty > 0 && (completed >= qty || pending <= 0);
    });
  }

  return {
    deriveCaseStatus,
    shouldAutoStatus,
    shouldMarkVendorViewed,
    vendorViewedStatus,
    isFinalStatus,
    itemsComplete
  };
}
