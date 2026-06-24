export function $(id){
  return document.getElementById(id);
}

export function qsa(selector, root=document){
  return [...root.querySelectorAll(selector)];
}
