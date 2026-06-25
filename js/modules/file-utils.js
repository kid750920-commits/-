export function isQuotaError(err){
  return err && (
    err.name === 'QuotaExceededError'
    || err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || String(err.message || '').includes('exceeded the quota')
  );
}

export function compactAttachmentUrl(fileName='附件已壓縮'){
  const text = String(fileName || '本機展示附件').slice(0, 28).replace(/[&<>"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220"><rect width="100%" height="100%" fill="#eef2f6"/><text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" fill="#667085" font-size="18">本機展示附件</text><text x="50%" y="62%" dominant-baseline="middle" text-anchor="middle" fill="#667085" font-size="14">${text}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export function safeStorageFileName(fileName='file'){
  const parts = String(fileName || 'file').split('.');
  const ext = parts.length > 1 ? '.' + parts.pop().replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) : '';
  const base = parts.join('.')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'attachment';
  return `${base}${ext || '.bin'}`;
}

export function fileToDataUrl(file){
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function fileToLocalPreviewUrl(file){
  if(!String(file.type || '').startsWith('image/')) return compactAttachmentUrl(file.name);
  try{
    return await imageFileToCompressedDataUrl(file, 900, 0.62);
  }catch(_){
    return compactAttachmentUrl(file.name);
  }
}

export function imageFileToCompressedDataUrl(file, maxSize=900, quality=.62){
  return new Promise((resolve,reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = err => {
      URL.revokeObjectURL(img.src);
      reject(err);
    };
    img.src = URL.createObjectURL(file);
  });
}
