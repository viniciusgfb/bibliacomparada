'use strict';
const $ = selector => document.querySelector(selector);
const main = $('#content');
const translations = [
 ['ACF','Almeida Corrigida e Fiel','1994','Sociedade Bíblica Trinitariana do Brasil'],
 ['ARA','Almeida Revista e Atualizada','1993','Sociedade Bíblica do Brasil'],
 ['ARC','Almeida Revista e Corrigida','1995','Sociedade Bíblica do Brasil'],
 ['AS21','Almeida Século 21','2009','Vida Nova'],
 ['JFAA','João Ferreira de Almeida Atualizada','—','Editora não confirmada'],
 ['KJA','King James Atualizada','2011','Abba Press'],
 ['KJF','King James Fiel','—','BVBooks'],
 ['NAA','Nova Almeida Atualizada','2017','Sociedade Bíblica do Brasil'],
 ['NBV','Nova Bíblia Viva','2007','Mundo Cristão'],
 ['NTLH','Nova Tradução na Linguagem de Hoje','1988','Sociedade Bíblica do Brasil'],
 ['NVI','Nova Versão Internacional','2000','Biblica'],
 ['NVT','Nova Versão Transformadora','2016','Mundo Cristão'],
 ['TB','Tradução Brasileira','2010','Sociedade Bíblica do Brasil'],
 ['BLIVRE','Bíblia Livre','2018','Editora não confirmada'],
 ['ALM1911','Almeida 1911','1911','Editora não confirmada'],
 ['OL','O Livro','2000','Biblica'],
 ['VFL','Versão Fácil de Ler','2017','Bible League International'],
 ['AA','João Ferreira de Almeida Atualizada','—','Editora não confirmada'],
 ['RC69','Almeida Revista e Corrigida (1969)','1969','Sociedade Bíblica do Brasil'],
 ['BPT09','a Bíblia para todos — Edição Comum','2009','Sociedade Bíblica de Portugal'],
 ['AVM','Bíblia Ave-Maria','1959','Editora Ave-Maria'],
 ['MATOS','Bíblia de Matos Soares','1932','Paulus (edição brasileira)'],
 ['PASTORAL','Bíblia Sagrada — Edição Pastoral','1990','Paulus'],
 ['NVI2011','Nova Versão Internacional (2011)','2011','Biblica']
];
const catholicCodes = new Set(['AVM','MATOS','PASTORAL']);
const mappedCodes = new Set(['AVM','MATOS','PASTORAL']);
const guardedCodes = new Set(['AA','NVI2011','BPT09']);
const catalogName = t => `${esc(t[0])} — ${esc(t[1])}${catholicCodes.has(t[0])?' <span class="catholic-cross" aria-label="Tradução católica" title="Tradução católica">†</span>':''}`;

const state = {page:'home', mode:'read', translation:'ARC', book:0, chapter:0, verse:0};
const library = Object.create(null);
const availability = Object.create(null);
const inFlight = Object.create(null);
const mappingLibrary = Object.create(null);
const refKey = (b,c,v) => `${b}:${c}:${v}`;
const unsafeIdentityBooks = Object.create(null);
function buildComparisonGuards(code,data){
 if(!guardedCodes.has(code))return;
 const blocked=new Set();
 for(let b=0;b<66;b++){
  const base=books[b].chapters,other=data[b].chapters;
  if(code==='BPT09'){
   if(base.length!==other.length||base.some((ch,c)=>other[c]?.length!==ch.length))blocked.add(b);
  }else{
   for(let c=0;c<base.length;c++)if(base[c]?.length!==other[c]?.length)blocked.add(`${b}:${c}`);
  }
 }
 // Psalms can contain numbered headings and shifts even where chapter lengths happen to match.
 if(code==='BPT09'){blocked.add(18);blocked.add(38);}
 unsafeIdentityBooks[code]=blocked;
}
function identityAllowed(code,b,c){const guard=unsafeIdentityBooks[code];return !guard||(!guard.has(b)&&!guard.has(`${b}:${c}`));}
async function loadMapping(code){
 if(!catholicCodes.has(code))return null;
 if(mappingLibrary[code])return mappingLibrary[code];
 const response=await fetch(`./mappings/${code}.json`,{cache:'no-store'});
 if(!response.ok)throw Error(`Mapeamento ${code} indisponível.`);
 const data=await response.json();
 if(data.translation!==code||data.base!=='ARC'||!Array.isArray(data.entries))throw Error('Mapeamento inválido.');
 const forward=new Map(),reverse=new Map(),affected=new Set();
 for(const entry of data.entries){
  const a=entry.arc,s=entry.source;
  if(!Array.isArray(a)||!Array.isArray(s)||a.length!==3||s.length!==3||a[0]!==s[0]||![...a,...s].every(Number.isInteger))throw Error('Referência de mapeamento inválida.');
  const ai=a.map(n=>n-1),si=s.map(n=>n-1),ak=refKey(...ai),sk=refKey(...si);
  if(forward.has(ak)||reverse.has(sk))throw Error('Mapeamento com conflito de referências.');
  forward.set(ak,{pos:si,status:entry.status});reverse.set(sk,ai);
  affected.add(`${ai[0]}:${ai[1]}`);
 }
 mappingLibrary[code]={forward,reverse,affected};return mappingLibrary[code];
}
function resolveComparison(code,b,c,v){
 if(code==='ARC')return {pos:[b,c,v],kind:'identity'};
 const target=library[code];if(!target)return null;
 const source=target[b];if(!source)return null;
 const baseChapter=books[b]?.chapters[c];
 if(!catholicCodes.has(code)){
  const ch=source.chapters[c];return identityAllowed(code,b,c)&&ch?.length===baseChapter?.length?{pos:[b,c,v],kind:'identity'}:null;
 }
 const mapping=mappingLibrary[code];if(!mapping)return null;
 const explicit=mapping.forward.get(refKey(b,c,v));
 if(explicit)return {pos:explicit.pos,kind:'mapped',status:explicit.status};
 // No implicit matching in known shifted chapters, Psalm numbering, Malachi, or corrupt Matos Genesis 11.
 if(b===18||b===38||(code==='MATOS'&&b===0&&c===10)||mapping.affected.has(`${b}:${c}`))return null;
 const ch=source.chapters[c];
 return ch?.length===baseChapter?.length?{pos:[b,c,v],kind:'identity'}:null;
}
function reverseReaderReference(code,b,c,v){
 if(code==='ARC')return [b,c,v];
 if(!catholicCodes.has(code)){
  const base=books[b]?.chapters[c],ch=library[code]?.[b]?.chapters[c];
  return identityAllowed(code,b,c)&&base&&ch?.length===base.length&&v<ch.length?[b,c,v]:null;
 }
 const mapping=mappingLibrary[code];
 const explicit=mapping?.reverse.get(refKey(b,c,v));if(explicit)return explicit;
 if(b===18||b===38||(code==='MATOS'&&b===0&&c===10)||mapping?.affected.has(`${b}:${c}`))return null;
 const chapter=library[code]?.[b]?.chapters[c];
 return chapter?.length===books[b]?.chapters[c]?.length?[b,c,v]:null;
}
const comparisonPreferenceKey = 'biblia-comparada-comparison-selection-v1';
// Ausência de preferência significa que todas as traduções estão selecionadas.
function readComparisonPreferences(){
 try {
  const saved=JSON.parse(localStorage.getItem(comparisonPreferenceKey)||'{}');
  if(!saved||typeof saved!=='object'||Array.isArray(saved))return {};
  return Object.fromEntries(translations.map(t=>t[0]).filter(code=>saved[code]===false).map(code=>[code,false]));
 }catch(error){return {};}
}
const comparisonPreferences = readComparisonPreferences();
function isSelected(code){return comparisonPreferences[code]!==false;}
function setSelected(code,selected){
 if(!translations.some(t=>t[0]===code))return;
 if(selected)delete comparisonPreferences[code];else comparisonPreferences[code]=false;
 try{localStorage.setItem(comparisonPreferenceKey,JSON.stringify(comparisonPreferences));}
 catch(error){notify('Seleção alterada, mas não foi possível salvá-la neste navegador.');}
}

let books = [], comparisonRun = 0, toastTimer;
let floatingMenu = null;
const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
function notify(message) { const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),3500); }
function snapshot(){return {...state};}
function navigate(target,changes={}) { closeFloatingMenu(); Object.assign(state,changes,{page:target}); history.pushState(snapshot(),'','#'+target); render(); window.scrollTo(0,0); }
function back(){if(history.state && history.state.page!=='home') history.back(); else navigate('home');}
window.addEventListener('popstate', event=>{ Object.assign(state,event.state && event.state.page?event.state:{page:'home',mode:'read',translation:'ARC',book:0,chapter:0,verse:0});render();window.scrollTo(0,0); });
function heading(title,subtitle='Português (Brasil)'){$('#title').textContent=title;$('#subtitle').textContent=subtitle;$('#back').classList.toggle('hidden',state.page==='home');}
function book(){return books[state.book];}
function start(mode){navigate(mode==='read'?'translations':'books',{mode,book:0,chapter:0,verse:0});}
function render(){
 closeFloatingMenu();
 const p=state.page;
 document.querySelectorAll('[data-nav]').forEach(el=>el.classList.toggle('active',(p==='home'?'home':p==='catalog'?'catalog':state.mode==='compare'?'compare':'read')===el.dataset.nav));
 if(p==='home')home();else if(p==='translations')translationList();else if(p==='books')booksPage();
 else if(p==='chapters')chaptersPage();else if(p==='reader')readerPage();else if(p==='verses')versesPage();
 else if(p==='comparison')comparisonPage();else if(p==='catalog')catalogPage();
}
function home(){
 heading('Bíblia Comparada');
 main.innerHTML=`<section class="home"><div class="home-logo">▱</div><h1>Bíblia Comparada</h1><p>Uma referência. Diversas traduções.</p></section>
 <div class="actions"><button class="action" id="read"><span class="symbol">▱</span><span><strong>Tradução específica</strong><small>Leia a Bíblia em uma tradução</small></span></button>
 <button class="action" id="compare"><span class="symbol">⇄</span><span><strong>Comparar traduções</strong><small>Compare o mesmo versículo nas versões disponíveis</small></span></button></div>
 <button class="link" id="see-catalog">Visualizar todas as traduções cadastradas</button>
`;
 $('#read').onclick=()=>start('read');$('#compare').onclick=()=>start('compare');$('#see-catalog').onclick=()=>navigate('catalog');
}
function status(code){return library[code]?'Disponível':availability[code]===true?'Disponível':availability[code]===false?'Sem arquivo':'Verificando…';}
function translationList(){
 heading('Tradução específica','Escolha a tradução');
 main.innerHTML='<h2>Traduções cadastradas</h2><p class="hint">Clique em uma tradução para ler o texto na íntegra.</p>'+translations.map(t=>`<button class="list-row" data-translation="${t[0]}"><span><b>${catalogName(t)}</b><small>${t[2]} · ${esc(t[3])}</small></span><span class="pill" data-status="${t[0]}">${status(t[0])}</span></button>`).join('');
 main.querySelectorAll('[data-translation]').forEach(el=>el.onclick=async()=>{
  const code=el.dataset.translation;
  if(availability[code]===false){notify(`Arquivo data/${code}.json não encontrado.`);return;}
  el.disabled=true; const pill=el.querySelector('.pill');pill.textContent='Carregando…';
  try{await loadTranslation(code);navigate('books',{translation:code,book:0,chapter:0,verse:0});}
  catch(error){notify(`${code}: ${error.message}`);el.disabled=false;pill.textContent=status(code);}
 });
}
function booksPage(){
 heading('Livros da Bíblia',state.mode==='read'?state.translation:'Comparar traduções');
 main.innerHTML='<input class="search" id="filter" placeholder="Pesquisar livro" aria-label="Pesquisar livro"><div id="book-results"></div>';
 const input=$('#filter');
 function draw(){
  const term=input.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const matching=books.map((b,index)=>({...b,index})).filter(b=>(b.name+' '+b.abbrev).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(term));
  const group=(items,title)=>`<h2>${title}</h2><div class="grid">${items.map(b=>`<button class="book" data-book="${b.index}">${esc(b.abbrev)}</button>`).join('')}</div>`;
  $('#book-results').innerHTML=group(matching.filter(b=>b.index<39),'Escrituras Hebraico-Aramaicas')+group(matching.filter(b=>b.index>=39),'Escrituras Gregas Cristãs');
  main.querySelectorAll('[data-book]').forEach(el=>el.onclick=()=>navigate('chapters',{book:Number(el.dataset.book),chapter:0,verse:0}));
 }
 input.oninput=draw;draw();
}
function chaptersPage(){
 heading(book().name,'Escolha o capítulo');
 const chapters=state.mode==='read'?(library[state.translation]?.[state.book]?.chapters||book().chapters):book().chapters;
 main.innerHTML=`<div class="grid">${chapters.map((_,i)=>`<button class="number" data-chapter="${i}">${i+1}</button>`).join('')}</div><div class="info">ⓘ &nbsp; ${esc(book().name)} — ${chapters.length} capítulos</div>`;
 main.querySelectorAll('[data-chapter]').forEach(el=>el.onclick=()=>navigate(state.mode==='read'?'reader':'verses',{chapter:Number(el.dataset.chapter),verse:0}));
}
function pager(type,total,hasPrev,hasNext){return `<div class="pager"><button id="prev" aria-label="Anterior" ${hasPrev?'':'disabled'}>‹</button><span>${type} ${total}</span><button id="next" aria-label="Próximo" ${hasNext?'':'disabled'}>›</button></div>`;}
function readerPage(){
 const b=book(), verses=library[state.translation]?.[state.book]?.chapters?.[state.chapter];
 heading(b.name,`${state.translation} · Capítulo ${state.chapter+1}`);
 if(!verses){main.innerHTML='<p class="hint">Capítulo indisponível nesta tradução.</p>';return;}
 main.innerHTML=`<div class="reader-title"><h1>${esc(b.name)} ${state.chapter+1}</h1><span class="pill">${verses.length} versículos</span></div>
 <article class="reader">${verses.map((v,i)=>`<p class="interactive-verse" data-reader-verse="${i}" tabindex="0" role="button" aria-label="Comparar versículo ${i+1}"><sup>${i+1}</sup>${esc(v)}</p>`).join('')}</article>`+
 pager('CAPÍTULO',`${state.chapter+1} DE ${library[state.translation][state.book].chapters.length}`,state.book>0||state.chapter>0,state.book<65||state.chapter<library[state.translation][state.book].chapters.length-1);
 main.querySelectorAll('[data-reader-verse]').forEach(el=>{
  const show=()=>showFloatingMenu(el,'Comparar traduções',()=>{const pos=reverseReaderReference(state.translation,state.book,state.chapter,Number(el.dataset.readerVerse));if(!pos){notify('Este versículo não possui correspondência segura na ARC.');return;}navigate('comparison',{mode:'compare',book:pos[0],chapter:pos[1],verse:pos[2]});});
  el.onclick=show;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}};
 });
 $('#prev').onclick=()=>moveChapter(-1);$('#next').onclick=()=>moveChapter(1);
}
function moveChapter(delta){
 let next=state.chapter+delta;
 if(next<0){if(state.book===0)return;state.book--;state.chapter=library[state.translation][state.book].chapters.length-1;}
 else if(next>=library[state.translation][state.book].chapters.length){if(state.book===65)return;state.book++;state.chapter=0;}
 else state.chapter=next;
 history.replaceState(snapshot(),'','#reader');render();window.scrollTo(0,0);
}
function versesPage(){
 const verses=book().chapters[state.chapter];heading(book().name,`Capítulo ${state.chapter+1} · Escolha o versículo`);
 main.innerHTML=`<p class="muted">${esc(book().name)} ${state.chapter+1} — selecione um versículo</p><div class="grid">${verses.map((_,i)=>`<button class="number" data-verse="${i}">${i+1}</button>`).join('')}</div>`;
 main.querySelectorAll('[data-verse]').forEach(el=>el.onclick=()=>navigate('comparison',{verse:Number(el.dataset.verse)}));
}
function comparisonPage(){
 const b=book(),v=state.verse,c=state.chapter,run=++comparisonRun;
 const selected=translations.filter(t=>isSelected(t[0]));
 // Only translations the visitor selected contribute to progress.
 const total=selected.length;
 heading(`${b.name} ${c+1}:${v+1}`,'Comparação de traduções');
 main.innerHTML=`<div class="reader-title"><h1>${esc(b.name)} ${c+1}:${v+1}</h1></div>
 <div class="comparison-loading" role="group" aria-label="Progresso do carregamento das traduções">
  <div class="progress-track" role="progressbar" aria-label="Traduções carregadas" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="comparison-progress"><div class="progress-fill" id="comparison-progress-fill"></div></div>
  <span class="progress-label" id="comparison-progress-label" aria-live="polite">Carregando traduções…</span>
 </div>
 <div id="comparison-results"></div>`+
 pager('VERSÍCULO',`${v+1} DE ${b.chapters[c].length}`,state.book>0||c>0||v>0,state.book<65||c<b.chapters.length-1||v<b.chapters[c].length-1);
 $('#prev').onclick=()=>moveVerse(-1);$('#next').onclick=()=>moveVerse(1);
 const draw=()=>{
  if(run!==comparisonRun||state.page!=='comparison')return;
  const loaded=selected.filter(t=>library[t[0]]);
  const finished=selected.filter(t=>library[t[0]]||availability[t[0]]===false);
  const pct=total?Math.round(finished.length/total*100):100;
  const bar=$('#comparison-progress');bar.setAttribute('aria-valuenow',String(pct));
  $('#comparison-progress-fill').style.width=pct+'%';
  $('#comparison-progress-label').textContent=total===0?'Selecione traduções no catálogo':pct===100?'Carregamento concluído': 'Carregando traduções…';
  $('#comparison-results').innerHTML=loaded.map(t=>{
   const other=library[t[0]],resolved=resolveComparison(t[0],state.book,c,v);
   const pos=resolved?.pos,ref=pos?other[pos[0]]?.chapters[pos[1]]?.[pos[2]]:undefined;
   const label=pos&&(pos[1]!==c||pos[2]!==v)?`<small>Referência nesta tradução: ${pos[1]+1}:${pos[2]+1} · correspondência sugerida pela auditoria</small>`:'';
   const content=typeof ref==='string'?esc(ref)+label:'<span class="hint">Correspondência não estabelecida com segurança para esta referência.</span>';
   return `<section class="compare-item interactive-translation" data-open-translation="${t[0]}" tabindex="0" role="button" aria-label="Abrir ${esc(t[1])} no capítulo completo"><b>${t[0]}</b><small>${esc(t[1])}${catholicCodes.has(t[0])?' †':''}</small><p>${content}</p></section>`;
  }).join('')||(total?'<p class="hint">Aguardando as traduções selecionadas…</p>':'<p class="hint">Nenhuma tradução selecionada. Abra o Catálogo e marque as traduções que deseja comparar.</p>');
  main.querySelectorAll('[data-open-translation]').forEach(el=>{
   const show=()=>showFloatingMenu(el,'Abrir tradução',()=>{const code=el.dataset.openTranslation;const match=resolveComparison(code,state.book,state.chapter,state.verse);if(!match){notify('Não há referência correspondente confirmada para abrir.');return;}navigate('reader',{mode:'read',translation:code,book:match.pos[0],chapter:match.pos[1]});});
   el.onclick=show;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}};
  });
 };
 draw();
 (async()=>{
  const codes=selected.filter(t=>availability[t[0]]!==false&&!library[t[0]]).map(t=>t[0]);
  let position=0;
  async function worker(){while(position<codes.length){const code=codes[position++];try{await loadTranslation(code);}catch(error){console.warn(code,error.message);availability[code]=false;}draw();}}
  await Promise.all(Array.from({length:Math.min(3,codes.length)},worker));
  if(run===comparisonRun&&state.page==='comparison')draw();
 })();
}
function moveVerse(delta){
 const b=book(),n=state.verse+delta;
 if(n<0){if(state.chapter>0){state.chapter--;state.verse=b.chapters[state.chapter].length-1;}else if(state.book>0){state.book--;state.chapter=book().chapters.length-1;state.verse=book().chapters[state.chapter].length-1;}else return;}
 else if(n>=b.chapters[state.chapter].length){if(state.chapter<b.chapters.length-1){state.chapter++;state.verse=0;}else if(state.book<65){state.book++;state.chapter=0;state.verse=0;}else return;}
 else state.verse=n;
 history.replaceState(snapshot(),'','#comparison');render();window.scrollTo(0,0);
}
function catalogPage(){
 heading('Traduções cadastradas','Selecione para comparar');
 const selectedCount=translations.filter(t=>isSelected(t[0])).length;
 main.innerHTML=`<h2>Catálogo de traduções</h2>
 <p class="hint">Marque as traduções que deseja ver na comparação. Todas começam selecionadas. As escolhas ficam salvas apenas neste navegador e não afetam a leitura individual.</p>
 <div class="catalog-toolbar"><span id="selection-count" aria-live="polite">${selectedCount} de ${translations.length} selecionadas</span><button class="selection-action" id="select-all" type="button">Marcar todas</button><button class="selection-action" id="select-none" type="button">Desmarcar todas</button></div>
 ${translations.map(t=>`<label class="list-row catalog-row"><span class="catalog-detail"><b>${catalogName(t)}</b><small>${t[2]} · ${esc(t[3])}</small><span class="pill catalog-status" data-status="${t[0]}">${status(t[0])}</span></span><span class="catalog-choice"><input type="checkbox" data-compare-code="${t[0]}" ${isSelected(t[0])?'checked':''} aria-label="Incluir ${esc(t[1])} na comparação"><span>Comparar</span></span></label>`).join('')}
`;
 const refresh=()=>{$('#selection-count').textContent=`${translations.filter(t=>isSelected(t[0])).length} de ${translations.length} selecionadas`;};
 main.querySelectorAll('[data-compare-code]').forEach(el=>el.onchange=()=>{setSelected(el.dataset.compareCode,el.checked);refresh();});
 $('#select-all').onclick=()=>{translations.forEach(t=>setSelected(t[0],true));main.querySelectorAll('[data-compare-code]').forEach(el=>el.checked=true);refresh();};
 $('#select-none').onclick=()=>{translations.forEach(t=>setSelected(t[0],false));main.querySelectorAll('[data-compare-code]').forEach(el=>el.checked=false);refresh();};
}

function closeFloatingMenu(){
 if(floatingMenu){floatingMenu.remove();floatingMenu=null;}
}
function showFloatingMenu(anchor,label,action){
 if(floatingMenu?.dataset.anchor===anchor.dataset.readerVerse+'|'+anchor.dataset.openTranslation){closeFloatingMenu();return;}
 closeFloatingMenu();
 const menu=document.createElement('div');menu.className='floating-menu';
 menu.dataset.anchor=anchor.dataset.readerVerse+'|'+anchor.dataset.openTranslation;
 const button=document.createElement('button');button.type='button';button.textContent=label;
 button.onclick=event=>{event.stopPropagation();closeFloatingMenu();action();};
 menu.appendChild(button);document.body.appendChild(menu);floatingMenu=menu;
 const r=anchor.getBoundingClientRect();
 const width=menu.offsetWidth, height=menu.offsetHeight;
 const left=Math.max(12,Math.min(window.innerWidth-width-12,r.left+(r.width-width)/2));
 const top=r.bottom+height+12>window.innerHeight?Math.max(12,r.top-height-8):r.bottom+8;
 menu.style.left=left+'px';menu.style.top=top+'px';
}
document.addEventListener('pointerdown',event=>{
 if(floatingMenu&&!floatingMenu.contains(event.target)&&!event.target.closest('[data-reader-verse],[data-open-translation]'))closeFloatingMenu();
});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeFloatingMenu();});
window.addEventListener('scroll',closeFloatingMenu,{passive:true});
window.addEventListener('resize',closeFloatingMenu);
function updateStatuses(){document.querySelectorAll('[data-status]').forEach(el=>el.textContent=status(el.dataset.status));}
function validate(data,code){
 if(!Array.isArray(data)||data.length!==66)throw Error('O JSON precisa conter 66 livros.');
 for(let i=0;i<66;i++){
  const b=data[i],base=books[i];
  if(!b||String(b.abbrev).toUpperCase()!==String(base.abbrev).toUpperCase()||typeof b.name!=='string'||!Array.isArray(b.chapters)||(!catholicCodes.has(code)&&code!=='BPT09'&&b.chapters.length!==base.chapters.length))throw Error(`Livros ou capítulos incompatíveis em ${base.name}.`);
  for(let c=0;c<b.chapters.length;c++){
   const ch=b.chapters[c];
   if(!Array.isArray(ch)||ch.length===0||ch.some(v=>typeof v!=='string'||!v.trim()))throw Error(`Versículos inválidos em ${base.name} ${c+1}.`);
  }
 }
 return data;
}
async function probe(code){
 if(code==='ARC'||library[code]){availability[code]=true;return;}
 try{const response=await fetch(`./data/${encodeURIComponent(code)}.json`,{method:'HEAD',cache:'no-store'});availability[code]=response.ok;}
 catch(error){availability[code]=false;}
 updateStatuses();
}
async function loadTranslation(code){
 if(library[code])return library[code];
 if(inFlight[code])return inFlight[code];
 inFlight[code]=(async()=>{
  const response=await fetch(`./data/${encodeURIComponent(code)}.json`,{cache:'no-store'});
  if(!response.ok){availability[code]=false;updateStatuses();throw Error(`data/${code}.json não encontrado (HTTP ${response.status}).`);}
  let json;try{json=await response.json();}catch(e){throw Error('O arquivo não contém JSON válido.');}
  const checked=validate(json,code);buildComparisonGuards(code,checked);if(catholicCodes.has(code))await loadMapping(code);library[code]=checked;availability[code]=true;updateStatuses();return checked;
 })();
 try{return await inFlight[code];}finally{delete inFlight[code];}
}
$('#back').onclick=back;
$('#catalog-shortcut').onclick=()=>navigate('catalog');
document.querySelectorAll('[data-nav]').forEach(el=>el.onclick=()=>{
 const p=el.dataset.nav;if(p==='home')navigate('home');else if(p==='catalog')navigate('catalog');else start(p==='compare'?'compare':'read');
});
(async()=>{
 main.innerHTML='<div class="initial-loading" role="status" aria-live="polite"><div class="loading-spinner" aria-hidden="true"></div><p>Carregando Bíblia…</p></div>';
 try{
  const response=await fetch('./data/ARC.json',{cache:'no-store'});
  if(!response.ok)throw Error(`Não foi possível carregar data/ARC.json (HTTP ${response.status}).`);
  const arc=await response.json();
  if(!Array.isArray(arc)||arc.length!==66)throw Error('O arquivo ARC.json não contém os 66 livros esperados.');
  books=arc;validate(arc,'ARC');library.ARC=arc;availability.ARC=true;
  history.replaceState(snapshot(),'','#home');render();
  await Promise.all(translations.filter(t=>t[0]!=='ARC').map(t=>probe(t[0])));
 }catch(error){main.innerHTML=`<h2>Erro ao carregar a Bíblia</h2><p class="hint">${esc(error.message)}</p><p>Confira se o arquivo <code>data/ARC.json</code> está no GitHub Pages e se o site foi publicado corretamente.</p>`;}
})();
if('serviceWorker'in navigator && location.protocol!=='file:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(console.warn));
