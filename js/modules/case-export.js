export function createCaseExportApi({
  state,
  $,
  caseTypes,
  reviewStatusValues,
  visibleMainCases,
  calcCase,
  normalizeCaseType,
  locationName,
  returnLocationName,
  vendorName,
  parseRestockInfo,
  toDateInput,
  addDaysInput,
  nowIso,
  uid,
  currentName,
  currentUserId,
  canCreate,
  isPartCase,
  moduleOwnerName,
  nextCaseNo,
  deriveCaseStatus,
  dbInsert,
  addLog,
  refreshAll,
  toast,
  groupStats,
  statRows,
  csvEscape,
  downloadText,
  downloadXlsx,
  parseCsv
}){
  function buildCaseRows(cases=visibleMainCases()){
    const header = ['案件編號','案件類型','案件標題','優先度','狀態','逾期狀態','逾期天數','廠商回覆狀態','廠商未回覆天數','上次自動提醒','地點','回寄地點','廠商','申請人','負責人','追蹤單號','回寄單號','送出日期','廠商收件日','預計完成日','提醒天數','最後回覆','問題描述'];
    const rows = cases.map(caseRow => {
      const calc = calcCase(caseRow);
      return [
        caseRow.case_no,
        normalizeCaseType(caseRow.case_type),
        caseRow.title,
        caseRow.priority,
        caseRow.status,
        caseRow.overdue_status || (calc.overdue ? '已逾期' : calc.soon ? '快逾期' : '正常'),
        calc.overdueDays,
        caseRow.vendor_reply_status || (calc.noReply ? '廠商未回覆' : '正常'),
        calc.noReplyDays,
        caseRow.last_vendor_reminder_date,
        locationName(caseRow.location_id),
        returnLocationName(caseRow),
        vendorName(caseRow.vendor_id),
        caseRow.applicant_name,
        caseRow.owner_name,
        caseRow.tracking_no,
        caseRow.return_tracking_no,
        caseRow.ship_date,
        caseRow.vendor_received_date,
        caseRow.due_date,
        caseRow.reminder_days,
        caseRow.last_reply_at,
        caseRow.description
      ];
    });
    return [header, ...rows];
  }

  function exportCasesExcel(){
    const cases = visibleMainCases();
    const caseRows = buildCaseRows(cases);
    const itemRows = [['案件編號','品項','規格/設備資訊','SN','數量','已完成','未完成','問題描述','補料批次','貨櫃號碼','補料日期','廠商判斷']];
    state.data.case_items
      .filter(item => cases.some(caseRow => caseRow.id === item.case_id))
      .forEach(item => {
        const caseRow = state.data.cases.find(row => row.id === item.case_id);
        const restock = parseRestockInfo(item.vendor_result);
        itemRows.push([
          caseRow?.case_no || '',
          item.item_name,
          item.spec,
          item.sn,
          item.qty,
          item.completed_qty,
          item.pending_qty,
          item.problem_desc,
          restock.batch || '',
          restock.container || '',
          restock.date || '',
          restock.note || item.vendor_result
        ]);
      });
    downloadXlsx(`廠商協作案件_${toDateInput(new Date())}.xlsx`, [{ name:'案件總表', rows:caseRows }, { name:'品項明細', rows:itemRows }]);
  }

  function exportReportsExcel(){
    const cases = visibleMainCases();
    const sheets = [
      { name:'廠商統計', rows:statRows(groupStats(cases, caseRow => vendorName(caseRow.vendor_id)), '廠商') },
      { name:'類型統計', rows:statRows(groupStats(cases, caseRow => normalizeCaseType(caseRow.case_type) || '未分類'), '類型') },
      { name:'地點統計', rows:statRows(groupStats(cases, caseRow => locationName(caseRow.location_id)), '地點') },
      { name:'負責人統計', rows:statRows(groupStats(cases, caseRow => caseRow.owner_name || '未指定'), '負責人') }
    ];
    downloadXlsx(`廠商協作統計報表_${toDateInput(new Date())}.xlsx`, sheets);
  }

  function exportImportTemplate(){
    const rows = [
      ['案件類型','案件標題','優先度','地點','回寄地點','廠商','申請人','負責人','單號','預計完成日','品項','規格','SN','數量','問題描述'],
      ['維修料品申請','範例：廠房A申請電源','急件','廠房 A','總公司','YS 廠商','地點負責人','白駿森','','2026-07-01','電源','百納','','5','維修備料申請']
    ];
    downloadText(`案件匯入範本_${toDateInput(new Date())}.csv`, '\ufeff' + rows.map(row => row.map(csvEscape).join(',')).join('\n'), 'text/csv;charset=utf-8');
  }

  function mapByName(list, nameKey, name){
    return list.find(row => String(row[nameKey] || '').trim() === String(name || '').trim());
  }

  async function importCsvCases(){
    if(!canCreate()) return toast('目前角色不能匯入案件', 'bad');
    const file = $('importCsvFile')?.files?.[0];
    if(!file) return toast('請先選擇 CSV 檔', 'bad');
    const text = await file.text();
    const rows = parseCsv(text.replace(/^\ufeff/, ''));
    if(rows.length < 2) return toast('CSV 沒有資料', 'bad');

    const header = rows[0].map(value => value.trim());
    const idx = name => header.indexOf(name);
    let createdCount = 0;

    for(const sourceRow of rows.slice(1)){
      const get = name => idx(name) >= 0 ? (sourceRow[idx(name)] || '').trim() : '';
      const caseType = get('案件類型') || '維修料品申請';
      const type = caseTypes.find(item => item.value === caseType) || caseTypes[2];
      const vendor = mapByName(state.data.vendors, 'vendor_name', get('廠商'));
      const location = mapByName(state.data.locations, 'location_name', get('地點'));
      const returnLocation = mapByName(state.data.locations, 'location_name', get('回寄地點'));
      const dueDate = get('預計完成日') || addDaysInput(new Date(), type.defaultDays);
      const partReviewRequired = isPartCase(type.value);
      const fixedModuleOwner = moduleOwnerName(type.value);
      if(partReviewRequired && !fixedModuleOwner) return toast('請先設定維修料品主要負責人，再匯入維修料品申請', 'bad');

      const row = {
        id:uid(),
        case_no:await nextCaseNo(type.prefix),
        case_type:type.value,
        title:get('案件標題') || 'CSV 匯入案件',
        status:partReviewRequired ? '待負責人審核' : '待整理',
        priority:get('優先度') || '一般',
        location_id:location?.id || null,
        return_location_id:returnLocation?.id || null,
        vendor_id:vendor?.id || null,
        applicant_name:get('申請人') || currentName(),
        owner_name:fixedModuleOwner || get('負責人') || currentName(),
        tracking_no:get('單號'),
        return_tracking_no:'',
        ship_date:null,
        vendor_received_date:null,
        due_date:dueDate,
        reminder_days:type.defaultDays,
        description:get('問題描述'),
        review_status:partReviewRequired ? reviewStatusValues.pending : reviewStatusValues.approved,
        review_note:'',
        reviewed_by:null,
        reviewed_at:null,
        last_reply_at:null,
        closed_at:null,
        created_by:currentUserId() || null,
        updated_by:currentUserId() || null,
        created_at:nowIso(),
        updated_at:nowIso()
      };
      const itemQty = Number(get('數量') || 1);
      row.status = deriveCaseStatus(row, {
        items:get('品項') || get('問題描述') ? [{ qty:itemQty, completed_qty:0, pending_qty:itemQty }] : [],
        currentStatus:row.status
      });
      const created = await dbInsert('cases', row);
      if(get('品項') || get('問題描述')){
        await dbInsert('case_items', {
          id:uid(),
          case_id:created.id,
          item_name:get('品項'),
          spec:get('規格'),
          sn:get('SN'),
          qty:itemQty,
          problem_desc:get('問題描述'),
          vendor_result:'',
          completed_qty:0,
          pending_qty:itemQty,
          created_at:nowIso()
        });
      }
      await addLog(created, 'CSV 匯入案件', created.title);
      createdCount++;
    }

    $('importPreview').textContent = `已匯入 ${createdCount} 筆案件。`;
    await refreshAll();
    toast(`已匯入 ${createdCount} 筆案件`);
  }

  function exportCsv(){
    const rows = [['案件編號','類型','標題','狀態','逾期狀態','逾期天數','廠商回覆狀態','未回覆天數','上次自動提醒','地點','回寄地點','廠商','單號','回寄單號','預計完成','最後回覆','負責人']];
    visibleMainCases().forEach(caseRow => {
      const calc = calcCase(caseRow);
      rows.push([
        caseRow.case_no,
        normalizeCaseType(caseRow.case_type),
        caseRow.title,
        caseRow.status,
        caseRow.overdue_status || (calc.overdue ? '已逾期' : calc.soon ? '快逾期' : '正常'),
        calc.overdueDays,
        caseRow.vendor_reply_status || (calc.noReply ? '廠商未回覆' : '正常'),
        calc.noReplyDays,
        caseRow.last_vendor_reminder_date,
        locationName(caseRow.location_id),
        returnLocationName(caseRow),
        vendorName(caseRow.vendor_id),
        caseRow.tracking_no,
        caseRow.return_tracking_no,
        caseRow.due_date,
        caseRow.last_reply_at,
        caseRow.owner_name
      ]);
    });
    const csv = '\ufeff' + rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `廠商協作案件_${toDateInput(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return {
    buildCaseRows,
    exportCasesExcel,
    exportReportsExcel,
    exportImportTemplate,
    importCsvCases,
    exportCsv
  };
}
