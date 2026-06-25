function accountHash(value){
  let hash = 2166136261;
  for(const char of String(value || '')){
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function normalizeAccount(value){
  return String(value || '').trim().replace(/\s+/g, '');
}

export function accountSlug(value){
  const raw = normalizeAccount(value).toLowerCase();
  const slug = raw
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 24) || 'user';
  return `${slug}-${accountHash(raw)}`;
}

export function createAccountAuthHelpers(internalAuthDomain){
  function accountToAuthEmail(account){
    const raw = normalizeAccount(account).toLowerCase();
    if(raw.includes('@')) return raw;
    return `${accountSlug(raw)}@${internalAuthDomain}`;
  }

  function accountFromAuthEmail(email){
    const value = String(email || '').trim();
    if(!value) return '';
    if(value.endsWith('@' + internalAuthDomain)){
      return value.slice(0, -1 * (internalAuthDomain.length + 1));
    }
    return value.includes('@') ? value.split('@')[0] : value;
  }

  return {
    accountFromAuthEmail,
    accountToAuthEmail,
    normalizeAccount
  };
}
