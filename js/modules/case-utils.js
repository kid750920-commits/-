export function createCaseTypeHelpers({
  lcdCaseType,
  partCaseType,
  reviewStatusValues
}){
  function normalizeCaseType(type){
    const value = String(type || '').trim();
    if(!value) return '';
    if(value === '電視大屏申請' || value.includes('液晶面板') || value.includes('液晶申請')) return lcdCaseType;
    if(value.includes('維修料品') || value.includes('料品申請')) return partCaseType;
    return value;
  }

  function isLcdCase(caseRow){
    const type = typeof caseRow === 'string' ? caseRow : caseRow?.case_type;
    return normalizeCaseType(type) === lcdCaseType;
  }

  function isPartCase(caseRow){
    const type = typeof caseRow === 'string' ? caseRow : caseRow?.case_type;
    return normalizeCaseType(type) === partCaseType;
  }

  function reviewStatus(caseRow){
    if(!isPartCase(caseRow)) return reviewStatusValues.approved;
    if(caseRow?.review_status) return caseRow.review_status;
    if(caseRow?.status === '待負責人審核') return reviewStatusValues.pending;
    if(caseRow?.status === '審核退回') return reviewStatusValues.rejected;
    return reviewStatusValues.approved;
  }

  function needsReview(caseRow){
    return isPartCase(caseRow) && reviewStatus(caseRow) === reviewStatusValues.pending;
  }

  function reviewRejected(caseRow){
    return isPartCase(caseRow) && reviewStatus(caseRow) === reviewStatusValues.rejected;
  }

  function isMainTableCase(caseRow){
    return !isPartCase(caseRow) || reviewStatus(caseRow) === reviewStatusValues.approved;
  }

  function isLocationReviewCase(caseRow){
    return isPartCase(caseRow)
      || String(caseRow?.case_no || '').startsWith('PART-')
      || Object.values(reviewStatusValues).includes(caseRow?.review_status);
  }

  return {
    normalizeCaseType,
    isLcdCase,
    isPartCase,
    reviewStatus,
    needsReview,
    reviewRejected,
    isMainTableCase,
    isLocationReviewCase
  };
}
