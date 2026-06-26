export function byId(list, id){
  return list.find(item => item.id === id);
}

export function groupBy(list, keyFn){
  return list.reduce((acc, item) => {
    const key = keyFn(item) || '未指定';
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
}
