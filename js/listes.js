const LIST_PAGE_SIZE=100;
const _lists={};
const _listTimers={};
function listState(key){return _lists[key]||(_lists[key]={items:[],total:0,q:""});}
async function fetchListPage(key,url,append){
  const st=listState(key);
  const offset=append?st.items.length:0;
  const qs=`limit=${LIST_PAGE_SIZE}&offset=${offset}${st.q?`&q=${encodeURIComponent(st.q)}`:""}`;
  const r=await api("GET",`${url}${url.includes("?")?"&":"?"}${qs}`);
  const items=Array.isArray(r)?r:(r.items||[]);
  st.total=Array.isArray(r)?items.length:(r.total||0);
  st.items=append?st.items.concat(items):items;
  return st;
}
function renderListFooter(key,boxId,loadFn){
  const box=document.getElementById(boxId);if(!box)return;
  const st=listState(key);
  if(!st.total){box.innerHTML="";return;}
  const more=st.items.length<st.total;
  box.innerHTML=`<span>${t("list_count").replace("{n}",st.items.length).replace("{total}",st.total)}</span>${more?`<button class="btn btn-o btn-sm" onclick="${loadFn}(true)"><i class="ti ti-chevron-down"></i> ${t("btn_show_more")}</button>`:""}`;
}
function onListSearch(key,value,loadFn){
  listState(key).q=(value||"").trim();
  clearTimeout(_listTimers[key]);
  _listTimers[key]=setTimeout(()=>window[loadFn](false),300);
}
