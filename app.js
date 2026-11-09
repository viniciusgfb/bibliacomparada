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
 ['TB','Tradução Brasileira †','2010','SBB'],['BLIVRE','Bíblia Livre †','2018','—'],
 ['ALM1911','Almeida 1911 †','1911','—'],['OL','O Livro','2000','Biblica'],
 ['MENS','A Mensagem','2016','Editora Vida'],['VFL','Versão Fácil de Ler','2017','Bible League International']
];
const state = {page:'home', mode:'read', translation:'ARC', book:0, chapter:0, verse:0};
const library = Object.create(null);
const availability = Object.create(null);
const inFlight = Object.create(null);
let books = [], comparisonRun = 0, toastTimer;
const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
function notify(message) { const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),3500); }
function snapshot(){return {...state};}
function navigate(target,changes={}) { Object.assign(state,changes,{page:target}); history.pushState(snapshot(),'','#'+target); render(); window.scrollTo(0,0); }
function back(){if(history.state && history.state.page!=='home') history.back(); else navigate('home');}
window.addEventListener('popstate', event=>{ Object.assign(state,event.state && event.state.page?event.state:{page:'home',mode:'read',translation:'ARC',book:0,chapter:0,verse:0});render();window.scrollTo(0,0); });
function heading(title,subtitle='Português (Brasil)'){$('#title').textContent=title;$('#subtitle').textContent=subtitle;$('#back').classList.toggle('hidden',state.page==='home');}
function book(){return books[state.book];}
function start(mode){navigate(mode==='read'?'translations':'books',{mode,book:0,chapter:0,verse:0});}
function render(){
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
 <div class="info"><b>Leitura pelo navegador</b><p>O aplicativo funciona diretamente neste endereço, sem instalação. Adicioná-lo à tela inicial é opcional.</p><p>Os arquivos das traduções são publicados pelo administrador na pasta <code>data/</code> do GitHub.</p></div>`;
 $('#read').onclick=()=>start('read');$('#compare').onclick=()=>start('compare');$('#see-catalog').onclick=()=>navigate('catalog');
}
function status(code){return library[code]?'Disponível':availability[code]===true?'Disponível':availability[code]===false?'Sem arquivo':'Verificando…';}
function translationList(){
 heading('Tradução específica','Escolha a tradução');
 main.innerHTML='<h2>Traduções cadastradas</h2><p class="hint">Traduções com JSON publicado na pasta data ficam disponíveis para todos os visitantes.</p>'+translations.map(t=>`<button class="list-row" data-translation="${t[0]}"><span><b>${t[0]} — ${esc(t[1])}</b><small>${t[2]} · ${esc(t[3])}</small></span><span class="pill" data-status="${t[0]}">${status(t[0])}</span></button>`).join('');
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
 main.innerHTML=`<div class="grid">${book().chapters.map((_,i)=>`<button class="number" data-chapter="${i}">${i+1}</button>`).join('')}</div><div class="info">ⓘ &nbsp; ${esc(book().name)} — ${book().chapters.length} capítulos</div>`;
 main.querySelectorAll('[data-chapter]').forEach(el=>el.onclick=()=>navigate(state.mode==='read'?'reader':'verses',{chapter:Number(el.dataset.chapter),verse:0}));
}
function pager(type,total,hasPrev,hasNext){return `<div class="pager"><button id="prev" aria-label="Anterior" ${hasPrev?'':'disabled'}>‹</button><span>${type} ${total}</span><button id="next" aria-label="Próximo" ${hasNext?'':'disabled'}>›</button></div>`;}
function readerPage(){
 const b=book(), verses=library[state.translation]?.[state.book]?.chapters?.[state.chapter];
 heading(b.name,`${state.translation} · Capítulo ${state.chapter+1}`);
 if(!verses){main.innerHTML='<p class="hint">Capítulo indisponível nesta tradução.</p>';return;}
 main.innerHTML=`<div class="reader-title"><h1>${esc(b.name)} ${state.chapter+1}</h1><span class="pill">${verses.length} versículos</span></div>
 <article class="reader">${verses.map((v,i)=>`<p><sup>${i+1}</sup>${esc(v)}</p>`).join('')}</article>`+
 pager('CAPÍTULO',`${state.chapter+1} DE ${b.chapters.length}`,state.book>0||state.chapter>0,state.book<65||state.chapter<b.chapters.length-1);
 $('#prev').onclick=()=>moveChapter(-1);$('#next').onclick=()=>moveChapter(1);
}
function moveChapter(delta){
 let next=state.chapter+delta;
 if(next<0){if(state.book===0)return;state.book--;state.chapter=book().chapters.length-1;}
 else if(next>=book().chapters.length){if(state.book===65)return;state.book++;state.chapter=0;}
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
 heading(`${b.name} ${c+1}:${v+1}`,'Comparação de traduções');
 main.innerHTML=`<div class="reader-title"><h1>${esc(b.name)} ${c+1}:${v+1}</h1><span class="pill" id="compare-count">Carregando…</span></div>
 <div id="comparison-results"><p class="hint">Consultando traduções publicadas…</p></div>`+
 pager('VERSÍCULO',`${v+1} DE ${b.chapters[c].length}`,state.book>0||c>0||v>0,state.book<65||c<b.chapters.length-1||v<b.chapters[c].length-1);
 $('#prev').onclick=()=>moveVerse(-1);$('#next').onclick=()=>moveVerse(1);
 const draw=()=>{
  if(run!==comparisonRun||state.page!=='comparison')return;
  const loaded=translations.filter(t=>library[t[0]]);
  $('#compare-count').textContent=`${loaded.length} tradução(ões)`;
  $('#comparison-results').innerHTML=loaded.map(t=>{
   const other=library[t[0]],otherBook=other.find(x=>x.abbrev===b.abbrev);
   const target=otherBook?.chapters?.[c],ref=target?.[v],sameCount=Array.isArray(target)&&target.length===b.chapters[c].length;
   const content=sameCount&&typeof ref==='string'?esc(ref):'<span class="hint">Referência indisponível ou com divisão de versículos diferente. Não exibimos texto potencialmente incorreto.</span>';
   return `<section class="compare-item"><b>${t[0]}</b><small>${esc(t[1])}</small><p>${content}</p></section>`;
  }).join('')||'<p class="hint">Nenhuma tradução carregada.</p>';
 };
 draw();
 (async()=>{
  const codes=translations.filter(t=>availability[t[0]]!==false&&!library[t[0]]).map(t=>t[0]);
  let position=0;
  async function worker(){while(position<codes.length){const code=codes[position++];try{await loadTranslation(code);}catch(error){console.warn(code,error.message);}draw();}}
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
 heading('Traduções cadastradas','Ano e editora');
 main.innerHTML='<h2>Catálogo de traduções</h2><p class="hint">Os arquivos JSON publicados na pasta data do repositório ficam disponíveis para qualquer visitante, sem importar ou instalar nada.</p>'+
 translations.map(t=>`<div class="list-row"><span><b>${t[0]} — ${esc(t[1])}</b><small>${t[2]} · ${esc(t[3])}</small></span><span class="pill" data-status="${t[0]}">${status(t[0])}</span></div>`).join('')+
 '<div class="info"><b>Biblioteca online</b><p>O responsável pelo site adiciona arquivos como <code>data/NVI.json</code> e <code>data/ARA.json</code> no GitHub. Ao acessar ou atualizar o site, os visitantes poderão usar as traduções publicadas.</p></div>';
}
function updateStatuses(){document.querySelectorAll('[data-status]').forEach(el=>el.textContent=status(el.dataset.status));}
function validate(data,code){
 if(!Array.isArray(data)||data.length!==66)throw Error('O JSON precisa conter 66 livros.');
 for(let i=0;i<66;i++){
  const b=data[i],base=books[i];
  if(!b||b.abbrev!==base.abbrev||typeof b.name!=='string'||!Array.isArray(b.chapters)||b.chapters.length!==base.chapters.length)throw Error(`Livros ou capítulos incompatíveis em ${base.name}.`);
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
  const checked=validate(json,code);library[code]=checked;availability[code]=true;updateStatuses();return checked;
 })();
 try{return await inFlight[code];}finally{delete inFlight[code];}
}
$('#back').onclick=back;
$('#catalog-shortcut').onclick=()=>navigate('catalog');
document.querySelectorAll('[data-nav]').forEach(el=>el.onclick=()=>{
 const p=el.dataset.nav;if(p==='home')navigate('home');else if(p==='catalog')navigate('catalog');else start(p==='compare'?'compare':'read');
});
(async()=>{
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
