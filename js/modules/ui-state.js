export function beginButtonBusy(button, text='處理中...'){
  if(!button || button.dataset.busy === '1') return false;
  button.dataset.busy = '1';
  button.dataset.originalText = button.textContent;
  button.disabled = true;
  button.textContent = text;
  return true;
}

export function endButtonBusy(button){
  if(!button) return;
  button.disabled = false;
  button.textContent = button.dataset.originalText || button.textContent;
  delete button.dataset.busy;
  delete button.dataset.originalText;
}
