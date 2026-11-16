'use strict';
const $ = selector => document.querySelector(selector);
const main = $('#content');
const translations = [
 ['ACF','Almeida Corrigida e Fiel','1994','SBTB'],['ARA','Almeida Revista e Atualizada','1993','SBB'],
 ['ARC','Almeida Revista e Corrigida','1995','SBB'],['AS21','Almeida Século 21','2009','Vida Nova'],
 ['JFAA','Almeida Atualizada','—','—'],['KJA','King James Atualizada','1999','Abba Press'],
 ['KJF','King James Fiel','1611','BVBooks'],['NAA','Nova Almeida Atualizada','2017','SBB'],
 ['NBV','Nova Bíblia Viva','2007','Mundo Cristão'],['NTLH','Nova Tradução na Linguagem de Hoje','1988','SBB'],
 ['NVI','Nova Versão Internacional','—','Biblica'],['NVT','Nova Versão Transformadora','2016','Mundo Cristão'],
 ['TB','Tradução Brasileira','2010','SBB'],['BLIVRE','Bíblia Livre','2018','—'],
 ['ALM1911','Almeida 1911','1911','—'],['OL','O Livro','2000','Biblica'],
 ['VFL','Versão Fácil de Ler','2017','Bible League International'],
 ['AA','João Ferreira de Almeida Atualizada','—','—'],
 ['RC69','Almeida Revista e Corrigida (1969)','1969','SBB'],
 ['BPT09','A Bíblia para Todos — Edição Comum','2009','Sociedade Bíblica de Portugal'],
 ['NVI2011','Nova Versão Internacional (2011)','2011','Biblica'],
 ['AVM','Bíblia Ave-Maria','—','Ave-Maria'],
 ['MATOS','Bíblia Matos Soares','—','—'],
 ['PASTORAL','Bíblia Pastoral','—','Paulus']
];
const state = {page:'home', mode:'read', translation:'ARC', book:0, chapter:0, verse:0};
const library = Object.create(null);
const availability = Object.create(null);
const inFlight = Object.create(null);
// Offline: todos os códigos do catálogo são baixados e armazenados após a primeira abertura online.
const BIBLE_CACHE='biblia-comparada-bibles-v25';
const storedCodes=new Set(['ARC']);
const downloadBusy=new Set();
const catholicCodes=new Set(['AVM','MATOS','PASTORAL']);
const cross=code=>catholicCodes.has(code)?' ✝':'';
async function syncStored(){
 if(!('caches' in window))return;
 for(const [code] of translations){
  if(await caches.match(`./data/${code}.json`,{ignoreSearch:true}))storedCodes.add(code);
  else if(code!=='ARC')storedCodes.delete(code);
 }
}
async function persistBible(code,response){
 if(!('caches' in window))throw Error('Armazenamento offline indisponível neste navegador.');
 const cache=await caches.open(BIBLE_CACHE);
 await cache.put(`./data/${code}.json`,response);
 storedCodes.add(code);
}
async function downloadBible(code){
 if(downloadBusy.has(code))return;
 downloadBusy.add(code);catalogPage();
 // Solicita persistência durante uma ação explícita do usuário, quando suportada.
 navigator.storage?.persist?.().catch(()=>{});
 try{
  const response=await fetch(`./data/${code}.json`,{cache:'no-store'});
  if(!response.ok)throw Error(`Arquivo indisponível (HTTP ${response.status}).`);
  const copy=response.clone(),data=await response.json();
  validate(data,code);
  await persistBible(code,copy);
  library[code]=data;availability[code]=true;
  notify(`${code} baixada para uso offline.`);
 }catch(error){notify(`${code}: ${error.message}`);}
 finally{downloadBusy.delete(code);if(state.page==='catalog')catalogPage();}
}
async function removeBible(code){
 if(code==='ARC'){notify('A ARC é a tradução básica e não pode ser removida.');return;}
 if(!confirm(`Remover ${code} do armazenamento offline?`))return;
 for(const key of await caches.keys()){
  const cache=await caches.open(key);
  await cache.delete(`./data/${code}.json`,{ignoreSearch:true});
 }
 storedCodes.delete(code);delete library[code];setSelected(code,false);
 catalogPage();
}
async function resetApp(){
 if(!confirm('Apagar TODAS as traduções baixadas, preferências e dados offline deste aplicativo? Esta ação não pode ser desfeita.'))return;
 if(!confirm('Confirmar restauração total? O aplicativo será reiniciado e precisará de internet para baixar a ARC novamente.'))return;
 try{
  const registrations=await navigator.serviceWorker?.getRegistrations()||[];
  await Promise.all(registrations.filter(r=>r.scope.startsWith(new URL('./',location.href).href)).map(r=>r.unregister()));
  if('caches' in window)await Promise.all((await caches.keys()).filter(k=>k.startsWith('biblia-comparada-')).map(k=>caches.delete(k)));
  Object.keys(localStorage).filter(k=>k.startsWith('biblia-comparada-')).forEach(k=>localStorage.removeItem(k));
  location.replace(location.pathname+'?reset='+Date.now()+'#home');
 }catch(error){notify('Não foi possível limpar todos os dados: '+error.message);}
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
function isSelected(code){return storedCodes.has(code)&&(comparisonPreferences[code]===true||(code==='ARC'&&comparisonPreferences[code]!==false));}
function setSelected(code,selected){
 if(!translations.some(t=>t[0]===code))return;
 comparisonPreferences[code]=!!selected;
 try{localStorage.setItem(comparisonPreferenceKey,JSON.stringify(comparisonPreferences));}
 catch(error){notify('Seleção alterada, mas não foi possível salvá-la neste navegador.');}
}

let books = [], comparisonRun = 0, searchRun = 0, toastTimer;
const searchState={global:{query:'',results:[],done:0,total:0,working:false},local:{query:'',results:[],done:0,total:1,working:false}};
let chapterHighlight=null;
let floatingMenu = null;
const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
function notify(message) { const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),3500); }
function snapshot(){return {...state};}
function navigate(target,changes={}) { closeFloatingMenu(); Object.assign(state,changes,{page:target}); if(['home','translations','catalog','search'].includes(target))localStorage.setItem('biblia-comparada-last-tab',target); history.pushState(snapshot(),'','#'+target); render(); window.scrollTo(0,0); }
function back(){if(history.state && history.state.page!=='home') history.back(); else navigate('home');}
window.addEventListener('popstate', event=>{ Object.assign(state,event.state && event.state.page?event.state:{page:'home',mode:'read',translation:'ARC',book:0,chapter:0,verse:0});render();window.scrollTo(0,0); });
function heading(title,subtitle='Português (Brasil)'){$('#title').textContent=title;$('#subtitle').textContent=subtitle;$('#back').classList.toggle('hidden',state.page==='home');}
function book(){return books[state.book];}
function readerBook(){return library[state.translation]?.[state.book]||book();}
function start(mode){navigate(mode==='read'?'translations':'books',{mode,book:0,chapter:0,verse:0});}
function render(){
 closeFloatingMenu();
 const p=state.page;
 document.querySelectorAll('[data-nav]').forEach(el=>el.classList.toggle('active',(p==='home'?'home':p==='catalog'?'catalog':p==='search'||p==='search-verses'?'search':state.mode==='compare'?'compare':'read')===el.dataset.nav));
 if(p==='home')home();else if(p==='translations')translationList();else if(p==='books')booksPage();
 else if(p==='chapters')chaptersPage();else if(p==='reader')readerPage();else if(p==='verses')versesPage();
 else if(p==='comparison')comparisonPage();else if(p==='catalog')catalogPage();
 else if(p==='search')searchPage();else if(p==='search-verses')searchVersesPage();
}
function home(){
 heading('Bíblia Comparada');
 main.innerHTML=`<section class="home"><div class="home-logo">▱</div><h1>Bíblia Comparada</h1><p>Leia, compare e pesquise as Escrituras.</p></section>
 <div class="actions"><button class="action" id="read"><span class="symbol">▱</span><span><strong>Abrir Bíblia</strong></span></button>
 <button class="action" id="compare"><span class="symbol">⇄</span><span><strong>Comparar</strong></span></button>
 <button class="action" id="search-home"><span class="symbol">⌕</span><span><strong>Pesquisar</strong></span></button></div>`;
 $('#read').onclick=()=>start('read');$('#compare').onclick=()=>start('compare');$('#search-home').onclick=()=>navigate('search');
}
function status(code){return storedCodes.has(code)?'Baixada':'Não baixada';}
function translationList(){
 heading('Bíblia','Traduções disponíveis offline');
 const available=translations.filter(t=>storedCodes.has(t[0]));
 main.innerHTML='<h2>Escolha uma tradução</h2>'+available.map(t=>`<button class="list-row" data-translation="${t[0]}"><span><b>${t[0]}${cross(t[0])} — ${esc(t[1])}</b></span><span>›</span></button>`).join('')+
 '<button class="add-translation" id="add-translation" type="button">＋ Adicionar tradução</button>';
 $('#add-translation').onclick=()=>navigate('catalog');
 main.querySelectorAll('[data-translation]').forEach(el=>el.onclick=async()=>{
  const code=el.dataset.translation;el.disabled=true;
  try{await loadTranslation(code);navigate('books',{translation:code,book:0,chapter:0,verse:0});}
  catch(error){notify(`${code}: ${error.message}`);el.disabled=false;}
 });
}
function booksPage(){
 heading('Livros da Bíblia',state.mode==='read'?state.translation:'Comparar traduções');
 if(state.mode==='read'){
  main.innerHTML=`<h2>Pesquisar em ${esc(state.translation)}</h2><p class="hint">Busque uma palavra nesta tradução, sem diferenciar acentos ou maiúsculas.</p><form id="local-form" class="search-form"><input class="search" id="local-query" placeholder="Pesquisar palavra nos versículos" aria-label="Palavra para pesquisar" value="${esc(searchState.local.query)}"><button class="primary" type="submit">Pesquisar</button></form><div id="local-search-results"></div><h2>Escolher livro</h2><div id="book-results"></div>`;
  $('#local-form').onsubmit=e=>{e.preventDefault();runSearch('local',$('#local-query').value);};
  drawBookGrid();
  drawSearchResults('local');
 }else{
  main.innerHTML='<h2>Escolher livro</h2><div id="book-results"></div>';
  drawBookGrid();
 }
}
function drawBookGrid(){
 const group=(items,title)=>`<h2>${title}</h2><div class="grid">${items.map((b,i)=>`<button class="book" data-book="${b.index}">${esc(b.abbrev)}</button>`).join('')}</div>`;
 const indexed=books.map((b,index)=>({...b,index}));
 $('#book-results').innerHTML=group(indexed.filter(b=>b.index<39),'Escrituras Hebraico-Aramaicas')+group(indexed.filter(b=>b.index>=39),'Escrituras Gregas Cristãs');
 main.querySelectorAll('[data-book]').forEach(el=>el.onclick=()=>navigate('chapters',{book:Number(el.dataset.book),chapter:0,verse:0}));
}
function chaptersPage(){
 const current=state.mode==='read'?readerBook():book();
 heading(current.name,'Escolha o capítulo');
 main.innerHTML=`<div class="grid">${current.chapters.map((_,i)=>`<button class="number" data-chapter="${i}">${i+1}</button>`).join('')}</div><div class="info">ⓘ &nbsp; ${esc(current.name)} — ${current.chapters.length} capítulos</div>`;
 main.querySelectorAll('[data-chapter]').forEach(el=>el.onclick=()=>navigate(state.mode==='read'?'reader':'verses',{chapter:Number(el.dataset.chapter),verse:0}));
}
function pager(type,total,hasPrev,hasNext){return `<div class="pager"><button id="prev" aria-label="Anterior" ${hasPrev?'':'disabled'}>‹</button><span>${type} ${total}</span><button id="next" aria-label="Próximo" ${hasNext?'':'disabled'}>›</button></div>`;}
function readerPage(){
 const b=readerBook(), verses=library[state.translation]?.[state.book]?.chapters?.[state.chapter];
 heading(b.name,`${state.translation} · Capítulo ${state.chapter+1}`);
 if(!verses){main.innerHTML='<p class="hint">Capítulo indisponível nesta tradução.</p>';return;}
 main.innerHTML=`<div class="reader-title"><h1>${esc(b.name)} ${state.chapter+1}</h1><span class="pill">${verses.length} versículos</span></div>
 <article class="reader">${verses.map((v,i)=>`<p class="interactive-verse" data-reader-verse="${i}" tabindex="0" role="button" aria-label="Comparar versículo ${i+1}"><sup>${i+1}</sup>${chapterHighlight&&chapterHighlight.code===state.translation&&chapterHighlight.book===state.book&&chapterHighlight.chapter===state.chapter?highlightText(v,chapterHighlight.query):esc(v)}</p>`).join('')}</article>`+
 pager('CAPÍTULO',`${state.chapter+1} DE ${b.chapters.length}`,state.book>0||state.chapter>0,state.book<65||state.chapter<b.chapters.length-1);
 main.querySelectorAll('[data-reader-verse]').forEach(el=>{
  const show=()=>showFloatingMenu(el,'Comparar traduções',()=>{const arc=books[state.book]?.chapters[state.chapter];if(!arc||arc.length!==verses.length){notify('Comparação indisponível: divisão de versículos diferente da ARC.');return;}navigate('comparison',{mode:'compare',verse:Number(el.dataset.readerVerse)});});
  el.onclick=show;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}};
 });
 if(chapterHighlight&&chapterHighlight.code===state.translation&&chapterHighlight.book===state.book&&chapterHighlight.chapter===state.chapter){const target=main.querySelector(`[data-reader-verse="${chapterHighlight.verse}"]`);if(target){target.classList.add('target-verse');requestAnimationFrame(()=>target.scrollIntoView({block:'center'}));}}
 $('#prev').onclick=()=>moveChapter(-1);$('#next').onclick=()=>moveChapter(1);
}
function moveChapter(delta){chapterHighlight=null;
 let next=state.chapter+delta;
 if(next<0){if(state.book===0)return;state.book--;state.chapter=readerBook().chapters.length-1;}
 else if(next>=readerBook().chapters.length){if(state.book===65)return;state.book++;state.chapter=0;}
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
   const other=library[t[0]],otherBook=other[state.book];
   const target=otherBook?.chapters?.[c],ref=target?.[v],sameCount=Array.isArray(target)&&target.length===b.chapters[c].length;
   const content=sameCount&&typeof ref==='string'?esc(ref):'<span class="hint">Referência indisponível ou com divisão de versículos diferente. Não exibimos texto potencialmente incorreto.</span>';
   return `<section class="compare-item interactive-translation" data-open-translation="${t[0]}" tabindex="0" role="button" aria-label="Abrir ${esc(t[1])} no capítulo completo"><b>${t[0]}</b><small>${esc(t[1])}</small><p>${content}</p></section>`;
  }).join('')||(total?'<p class="hint">Aguardando as traduções selecionadas…</p>':'<p class="hint">Nenhuma tradução selecionada. Abra o Catálogo e marque as traduções que deseja comparar.</p>');
  main.querySelectorAll('[data-open-translation]').forEach(el=>{
   const show=()=>showFloatingMenu(el,'Abrir tradução',()=>{const code=el.dataset.openTranslation;if(!library[code]?.[state.book]?.chapters?.[state.chapter]){notify('Capítulo indisponível nesta tradução.');return;}navigate('reader',{mode:'read',translation:code});});
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
// Pesquisa por palavra inteira, ignorando caixa e diacríticos. Segmentação mantém as posições originais.
const wordSegmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('pt-BR',{granularity:'word'}):null;
function normalizeWord(s){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');}
function occurrences(text,query){
 const wanted=normalizeWord(query.trim());if(!wanted)return [];
 const tokens=wordSegmenter?[...wordSegmenter.segment(text)].filter(t=>t.isWordLike).map(t=>({word:t.segment,index:t.index})):Array.from(text.matchAll(/[\p{L}\p{N}]+/gu),m=>({word:m[0],index:m.index}));
 return tokens.filter(t=>normalizeWord(t.word)===wanted).map(t=>({start:t.index,end:t.index+t.word.length}));
}
function highlightText(text,query){let matches=occurrences(text,query),cursor=0,html='';for(const m of matches){html+=esc(text.slice(cursor,m.start))+'<mark>'+esc(text.slice(m.start,m.end))+'</mark>';cursor=m.end;}return html+esc(text.slice(cursor));}
function searchPage(){
 heading('Pesquisa','Buscar nas traduções selecionadas');
 const d=searchState.global;
 main.innerHTML=`<form id="global-form" class="search-form"><input class="search" id="global-query" aria-label="Palavra para pesquisar" placeholder="Digite uma palavra (ex.: oracao)" value="${esc(d.query)}" required><button class="primary" type="submit">Pesquisar</button></form><p class="hint">Pesquisa por palavra inteira, sem diferenciar acentos ou maiúsculas. Utiliza as traduções marcadas em Traduções.</p><div id="global-search-results"></div>`;
 $('#global-form').onsubmit=e=>{e.preventDefault();runSearch('global',$('#global-query').value);};drawSearchResults('global');
}
function searchVersesPage(){
 const code=state.searchCode,source=state.searchSource||'global',d=searchState[source];
 const item=d.results.find(r=>r.code===code);
 heading('Resultados',`${code} · ${d.query}`);
 if(!item){main.innerHTML='<p class="hint">Resultados indisponíveis. Faça uma nova pesquisa.</p>';return;}
 main.innerHTML=`<h2>${esc(code)} — ${esc(d.query)}</h2><p class="hint">${item.count} ocorrências em ${item.verses.length} versículos. Toque no versículo para abrir o capítulo.</p><div id="verse-search-list"></div><button class="primary spaced" id="more-verses" type="button">Mostrar mais versículos</button>`;
 let visible=0;
 function more(){const end=Math.min(visible+60,item.verses.length),container=$('#verse-search-list');for(let i=visible;i<end;i++){const v=item.verses[i],el=document.createElement('section');el.className='compare-item interactive-translation';el.tabIndex=0;el.setAttribute('role','button');el.dataset.searchVerse=String(i);el.innerHTML=`<b>${esc(books[v.book].name)} ${v.chapter+1}:${v.verse+1}</b><p>${highlightText(v.text,d.query)}</p>`;container.appendChild(el);const show=()=>showFloatingMenu(el,'Abrir capítulo',()=>openSearchChapter(code,v,d.query));el.onclick=show;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}};}visible=end;$('#more-verses').hidden=visible>=item.verses.length;}
 $('#more-verses').onclick=more;more();
}
function openSearchChapter(code,v,query){chapterHighlight={code,book:v.book,chapter:v.chapter,verse:v.verse,query};navigate('reader',{mode:'read',translation:code,book:v.book,chapter:v.chapter,verse:v.verse});}
function drawSearchResults(kind){
 const d=searchState[kind],container=document.querySelector(kind==='global'?'#global-search-results':'#local-search-results');if(!container)return;
 if(!d.query){container.innerHTML='';return;}
 const pct=d.total?Math.round(100*d.done/d.total):100;
 container.innerHTML=`<h2>Resultados para “${esc(d.query)}”</h2><div class="comparison-loading"><div class="progress-track" role="progressbar" aria-label="Progresso da pesquisa" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><div class="progress-fill" style="width:${pct}%"></div></div><span class="progress-label" aria-live="polite">${d.working?`Pesquisando ${d.done} de ${d.total} traduções…`:`Pesquisa concluída: ${d.done} de ${d.total} traduções.`}</span></div><div id="word-result-list"></div>`;
 const list=container.querySelector('#word-result-list');
 for(const item of d.results){const el=document.createElement('section');el.className='compare-item interactive-translation';el.tabIndex=0;el.setAttribute('role','button');el.dataset.searchCode=item.code;el.innerHTML=`<b>${esc(item.code)}</b><small>${esc(item.name)}</small><p>${item.error?esc(item.error):`${item.count} ocorrências · ${item.verses.length} versículos`}</p>`;list.appendChild(el);if(!item.error){const show=()=>showFloatingMenu(el,'Abrir tradução',()=>navigate('search-verses',{searchCode:item.code,searchSource:kind}));el.onclick=show;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}};}}
 if(!d.results.length)list.innerHTML='<p class="hint">Aguardando resultados…</p>';
}
async function runSearch(kind,raw){
 const query=raw.trim();if(!query)return;
 if(!/^[\p{L}\p{N}]+$/u.test(query)){notify('Digite apenas uma palavra, sem espaços ou pontuação.');return;}
 const d=searchState[kind],codes=kind==='global'?translations.filter(t=>isSelected(t[0])):translations.filter(t=>t[0]===state.translation);
 const run=++searchRun;
 Object.assign(d,{query,results:[],done:0,total:codes.length,working:true});drawSearchResults(kind);
 for(const t of codes){if(run!==searchRun)return;
  let result={code:t[0],name:t[1],count:0,verses:[]};
  try{const bible=await loadTranslation(t[0]);
   for(let b=0;b<bible.length;b++){for(let c=0;c<bible[b].chapters.length;c++){
    const verses=bible[b].chapters[c];for(let v=0;v<verses.length;v++){
     const count=occurrences(verses[v],query).length;if(count){result.count+=count;result.verses.push({book:b,chapter:c,verse:v,text:verses[v]});}
    }
   }if(b%6===0)await new Promise(resolve=>setTimeout(resolve,0));}
  }catch(e){result.error='Tradução indisponível: '+e.message;}
  if(run!==searchRun)return;d.results.push(result);d.done++;drawSearchResults(kind);
 }
 d.working=false;drawSearchResults(kind);
}
let catalogTab='downloaded';
function catalogPage(){
 heading('Traduções','Gerencie sua biblioteca offline');
 const available=translations.filter(t=>storedCodes.has(t[0]));
 const missing=translations.filter(t=>!storedCodes.has(t[0]));
 main.innerHTML=`<div class="catalog-tabs"><button id="tab-downloaded" class="${catalogTab==='downloaded'?'active':''}">Baixadas (${available.length})</button><button id="tab-available" class="${catalogTab==='available'?'active':''}">Disponíveis (${missing.length})</button></div>
 <p class="hint">${catalogTab==='downloaded'?'Marque as traduções que deseja comparar e pesquisar.':'Baixe apenas as traduções que deseja utilizar. Elas ficarão disponíveis offline.'}</p>
 ${(catalogTab==='downloaded'?available:missing).map(t=>`<div class="list-row catalog-row"><span class="catalog-detail"><b>${t[0]}${cross(t[0])} — ${esc(t[1])}</b><small>${esc(t[3])}</small></span><span class="catalog-choice">${catalogTab==='downloaded'?`<label><input type="checkbox" data-compare-code="${t[0]}" ${isSelected(t[0])?'checked':''}> Comparar</label> ${t[0]==='ARC'?'':`<button class="selection-action" data-remove="${t[0]}" aria-label="Remover ${t[0]}">⋯</button>`}`:`<button class="selection-action" data-download="${t[0]}" ${downloadBusy.has(t[0])?'disabled':''}>${downloadBusy.has(t[0])?'Baixando…':'↓ Baixar'}</button>`}</span></div>`).join('')}
 <details class="reset-section"><summary>Armazenamento e manutenção</summary><p class="hint">As traduções baixadas ficam armazenadas para uso offline. O navegador pode removê-las se faltar espaço.</p><button id="persist-cache" class="selection-action">Proteger armazenamento offline</button><p class="hint" id="persist-status"></p><button id="reset-app" class="selection-action reset-button">Restaurar aplicativo e limpar todos os dados</button></details>`;
 $('#tab-downloaded').onclick=()=>{catalogTab='downloaded';catalogPage();};
 $('#tab-available').onclick=()=>{catalogTab='available';catalogPage();};
 main.querySelectorAll('[data-download]').forEach(el=>el.onclick=()=>downloadBible(el.dataset.download));
 main.querySelectorAll('[data-remove]').forEach(el=>el.onclick=()=>removeBible(el.dataset.remove));
 main.querySelectorAll('[data-compare-code]').forEach(el=>el.onchange=()=>setSelected(el.dataset.compareCode,el.checked));
 $('#persist-cache').onclick=async()=>{
  const label=$('#persist-status');
  if(!navigator.storage?.persist){label.textContent='Este navegador não oferece armazenamento persistente.';return;}
  try{label.textContent=(await navigator.storage.persist())?'Armazenamento persistente autorizado.':'O navegador não autorizou armazenamento persistente.';}
  catch(e){label.textContent='Não foi possível solicitar a proteção.';}
 };
 $('#reset-app').onclick=resetApp;
}
function closeFloatingMenu(){
 if(floatingMenu){floatingMenu.remove();floatingMenu=null;}
}
function showFloatingMenu(anchor,label,action){
 if(floatingMenu?.dataset.anchor===[anchor.dataset.readerVerse,anchor.dataset.openTranslation,anchor.dataset.searchVerse,anchor.dataset.searchCode].join('|')){closeFloatingMenu();return;}
 closeFloatingMenu();
 const menu=document.createElement('div');menu.className='floating-menu';
 menu.dataset.anchor=[anchor.dataset.readerVerse,anchor.dataset.openTranslation,anchor.dataset.searchVerse,anchor.dataset.searchCode].join('|');
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
 if(floatingMenu&&!floatingMenu.contains(event.target)&&!event.target.closest('[data-reader-verse],[data-open-translation],[data-search-verse],[data-search-code]'))closeFloatingMenu();
});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeFloatingMenu();});
window.addEventListener('scroll',closeFloatingMenu,{passive:true});
window.addEventListener('resize',closeFloatingMenu);
function updateStatuses(){document.querySelectorAll('[data-status]').forEach(el=>el.textContent=status(el.dataset.status));}
function validate(data,code){
 if(!Array.isArray(data)||data.length!==66)throw Error('O JSON precisa conter 66 livros.');
 for(let i=0;i<66;i++){
  const b=data[i],base=books[i];
  if(!b||b.abbrev!==base.abbrev||typeof b.name!=='string'||!Array.isArray(b.chapters))throw Error(`Livros ou capítulos incompatíveis em ${base.name}.`);
  for(let c=0;c<b.chapters.length;c++){
   const ch=b.chapters[c];
   if(!Array.isArray(ch)||ch.length===0||ch.some(v=>typeof v!=='string'||!v.trim()))throw Error(`Versículos inválidos em ${base.name} ${c+1}.`);
  }
 }
 return data;
}
async function probe(code){availability[code]=storedCodes.has(code);updateStatuses();}
async function loadTranslation(code){
 if(!storedCodes.has(code))throw Error('Baixe esta tradução na aba Traduções.');
 if(library[code])return library[code];
 if(inFlight[code])return inFlight[code];
 inFlight[code]=(async()=>{
  const response=await fetch(`./data/${encodeURIComponent(code)}.json`,{cache:'no-store'});
  if(!response.ok){availability[code]=false;updateStatuses();throw Error(`data/${code}.json não encontrado (HTTP ${response.status}).`);}
  let json;try{json=await response.json();}catch(e){throw Error('O arquivo não contém JSON válido.');}
  const checked=validate(json,code);library[code]=checked;availability[code]=true;updateStatuses();return checked;
 })();
 try{return await inFlight[code];}finally{delete inFlight[code];}
}
$('#back').onclick=back;
$('#catalog-shortcut').onclick=()=>navigate('catalog');
document.querySelectorAll('[data-nav]').forEach(el=>el.onclick=()=>{
 const p=el.dataset.nav;if(p==='home')navigate('home');else if(p==='catalog')navigate('catalog');else if(p==='search')navigate('search');else start(p==='compare'?'compare':'read');
});
(async()=>{
 main.innerHTML='<div class="initial-loading" role="status" aria-live="polite"><div class="loading-spinner" aria-hidden="true"></div><p>Carregando Bíblia…</p></div>';
 try{
  const response=await fetch('./data/ARC.json',{cache:'no-store'});
  if(!response.ok)throw Error(`Não foi possível carregar data/ARC.json (HTTP ${response.status}).`);
  const arc=await response.json();
  if(!Array.isArray(arc)||arc.length!==66)throw Error('O arquivo ARC.json não contém os 66 livros esperados.');
  books=arc;validate(arc,'ARC');library.ARC=arc;availability.ARC=true;
  const last=localStorage.getItem('biblia-comparada-last-tab');if(['home','translations','catalog','search'].includes(last))state.page=last;history.replaceState(snapshot(),'','#'+state.page);render();
  await syncStored();
  render();
 }catch(error){main.innerHTML=`<h2>Erro ao carregar a Bíblia</h2><p class="hint">${esc(error.message)}</p><p>Confira se o arquivo <code>data/ARC.json</code> está no GitHub Pages e se o site foi publicado corretamente.</p>`;}
})();
if('serviceWorker'in navigator && location.protocol!=='file:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(console.warn));
