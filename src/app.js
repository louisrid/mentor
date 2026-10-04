import { invoke, Channel } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { renderText, formatSpend } from './format.js';
import './styles.css';
import { appendMarkdownFiles } from './import-context.js';
const $ = id => document.getElementById(id);
let state, conversation, busy=false, models=[], draft=null;
$('app').innerHTML = `
  <div id="drag" class="drag" aria-label="Drag window"></div>
  <div class="toolbar"><span class="brand">Mentor</span><button id="new" title="New conversation · ⌘N">New</button><button id="history">Chats</button><button id="settings">Settings</button><button id="hide" title="Hide · ⌘W">Hide</button></div>
  <main id="chat" class="chat" role="log" aria-label="Conversation" aria-live="off"></main>
  <div id="notice" class="notice" role="status"></div>
  <form id="composer" class="composer"><span class="prompt">&gt;</span><textarea id="input" rows="1" placeholder="Message Mentor…" aria-label="Message" maxlength="6000"></textarea><button id="send" type="submit">Send</button><button id="stop" type="button" hidden>Stop</button></form>
  <div class="footer"><span id="model-label">connecting…</span><span id="spend">0.00¢ today</span></div>
  <section id="panel" class="panel" hidden><div class="panel-head"><span id="panel-title"></span><button id="panel-close">Back</button></div><div id="panel-content" class="panel-content"></div><div id="panel-note" class="panel-note" role="status"></div><div id="panel-foot" class="panel-foot"></div></section>`;
function notify(text=''){$('notice').textContent=text;}
function report(error){notify(String(error));}
function setBusy(value){busy=value;$('panel-close').disabled=value;for(const id of ['new','history','settings','send'])$(id).disabled=value;$('stop').hidden=!value;$('send').hidden=value;}
function empty(){
  $('chat').replaceChildren();const div=document.createElement('div');div.className='empty';
  div.innerHTML='<div class="title">What’s on your mind?</div><p>Talk it through.</p>';
  $('chat').append(div);
}
function addMessage(role,text,status='complete'){
  $('chat').querySelector('.empty')?.remove();const el=document.createElement('article');el.className=`message ${role}`;
  const who=document.createElement('div');who.className='who';who.textContent=role==='user'?'YOU':'MENTOR';
  const body=document.createElement('div');body.className='body';renderText(body,text);el.append(who,body);
  if(status!=='complete'){const tag=document.createElement('div');tag.className='state';tag.textContent=status;el.append(tag);}
  $('chat').append(el);return body;
}
function bottom(){ $('chat').scrollTop=$('chat').scrollHeight; }
async function load(id){conversation=id;localStorage.setItem('conversation',id);const messages=await invoke('messages',{id});empty();for(const m of messages)addMessage(m.role,m.content,m.status);bottom();$('input').focus();}
async function refresh(){state=await invoke('snapshot');$('model-label').textContent=state.config.model.split('/').pop();$('spend').textContent=`${formatSpend(state.spend)} / ${formatSpend(state.config.daily_budget)} today`;}
async function newChat(){if(busy)return;const id=await invoke('new_conversation');await refresh();await load(id);notify();}
$('drag').addEventListener('mousedown',async e=>{if(e.button===0)try{await getCurrentWindow().startDragging();}catch(e){report(e);}});
$('hide').onclick=()=>getCurrentWindow().hide().catch(report);

$('new').onclick=()=>newChat().catch(report);
$('stop').onclick=()=>invoke('cancel').then(()=>notify('Stopping…')).catch(report);
$('input').oninput=()=>{const input=$('input');input.style.height='auto';input.style.height=Math.min(input.scrollHeight,140)+'px';};
$('input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(!busy)$('composer').requestSubmit();}};
$('composer').onsubmit=async e=>{
  e.preventDefault();const text=$('input').value.trim();if(!text||busy)return;
  if(!state.has_key){await openSetup();return;}
  setBusy(true);notify();$('input').value='';$('input').style.height='auto';addMessage('user',text);const body=addMessage('assistant','');bottom();let answer='';
  const channel=new Channel();channel.onmessage=event=>{const follow=$('chat').scrollHeight-$('chat').scrollTop-$('chat').clientHeight<100;answer+=event.text;renderText(body,answer);if(follow)bottom();};
  try{const result=await invoke('chat',{id:conversation,text,onToken:channel});notify(result.memory_note && result.memory_note!=='Memory updated.' ? result.memory_note : (result.status==='stopped'?'Stopped.':''));}
  catch(error){report(error);if(!answer)$('input').value=text;}
  finally{setBusy(false);try{await refresh();await load(conversation);}catch(error){report(error);}}
};
document.addEventListener('keydown',e=>{
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='n'){e.preventDefault();newChat().catch(report);}
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()===','){e.preventDefault();if(!busy)openSettings().catch(report);}
  if(e.key==='Escape'){if(!$('panel').hidden)closePanel();else if(busy)invoke('cancel').catch(report);else getCurrentWindow().hide().catch(report);}
});
function closePanel(){ if(busy)return; $('panel').hidden=true;$('panel-close').hidden=false;draft=null;$('input').focus(); }
$('panel-close').onclick=closePanel;
function showPanel(title){$('panel-content').classList.remove('setup');$('panel-close').hidden=false;$('panel-title').textContent=title;$('panel-content').replaceChildren();$('panel-foot').replaceChildren();$('panel-note').textContent='';$('panel').hidden=false;}
$('history').onclick=async()=>{
  try{await refresh();showPanel('Conversation history');const clear=document.createElement('button');clear.textContent='New chat';clear.className='primary';clear.onclick=()=>{closePanel();newChat().catch(report);};$('panel-foot').append(clear);
    const hint=document.createElement('p');hint.className='help';hint.textContent='Your memory carries across chats.';$('panel-content').append(hint);
    for(const c of state.conversations){const b=document.createElement('button');b.className='history-item';const title=document.createElement('span');title.textContent=c.title;const date=document.createElement('small');date.textContent=new Date(c.updated).toLocaleString('en-GB');b.append(title,date);b.onclick=()=>{closePanel();load(c.id).catch(report);};$('panel-content').append(b);}
  }catch(e){report(e);}
};
function field(label,id,value,type='text'){
  const wrap=document.createElement('label');wrap.className='field';wrap.textContent=label;
  const input=document.createElement(type==='textarea'?'textarea':'input');input.id=id;if(type!=='textarea')input.type=type;input.value=value;wrap.append(input);return wrap;
}
function help(text){const p=document.createElement('p');p.className='help';p.textContent=text;return p;}
function heading(text){const h=document.createElement('h2');h.textContent=text;return h;}
function button(text,handler){const b=document.createElement('button');b.type='button';b.textContent=text;b.className='small-button';b.onclick=async()=>{try{await handler();}catch(e){$('panel-note').textContent=String(e);}};return b;}
function checkbox(label,id,value){const w=document.createElement('label');w.className='field';const input=document.createElement('input');input.type='checkbox';input.id=id;input.checked=value;w.append(input,document.createTextNode(' '+label));return w;}
function group(title) {
  const details=document.createElement('details');details.className='group';
  const summary=document.createElement('summary');summary.textContent=title;details.append(summary);
  const content=document.createElement('div');content.className='group-body';details.append(content);
  return {details,content};
}
function slider(root,id,label,value){
  const w=field(label,id,value,'range');const input=w.querySelector('input');input.min='0';input.max='10';input.step='1';
  const val=document.createElement('span');val.textContent=` · ${input.value}`;w.insertBefore(val,input);input.oninput=()=>val.textContent=` · ${input.value}`;root.append(w);
}
async function openSetup(){
  if(busy)return;await refresh();showPanel('Welcome');$('panel-close').hidden=true;
  const root=$('panel-content');root.classList.add('setup');
  root.append(heading('Meet your mentor.'),help('Paste your OpenRouter key to begin.'));
  const key=field('OpenRouter key','api-key','','password');key.querySelector('input').autocomplete='off';key.querySelector('input').placeholder='sk-or-…';root.append(key);
  const model=document.createElement('p');model.className='setup-model';model.textContent='GPT-5.6 Luna · 30¢ daily limit';root.append(model);
  const begin=button('Start chatting',async()=>{
    begin.disabled=true;$('panel-note').textContent='Connecting…';
    try{await invoke('save_api_key',{value:$('api-key').value});await refresh();closePanel();notify();}
    finally{begin.disabled=false;}
  });begin.className='primary';$('panel-foot').append(begin);
  $('api-key').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();begin.click();}};
  $('api-key').focus();
}
async function openSettings(){
  if(busy)return;await refresh();draft=structuredClone(state);showPanel('Settings');const root=$('panel-content');
  if(!state.has_key){await openSetup();return;}
  root.append(help(state.config.model==='openai/gpt-5.6-luna'?'GPT-5.6 Luna':state.config.model.split('/').pop()));
  root.append(checkbox('Start at login','launch-login',draft.config.launch_at_login),checkbox('Remember useful details','auto-memory',draft.config.auto_memory));
  const context=group('Personal context');root.append(context.details);
  context.content.append(field('About you','doc-profile',draft.documents.profile,'textarea'),field('Current goals','doc-priorities',draft.documents.priorities,'textarea'));
  $('doc-profile').placeholder='Paste your personal context here.';
  $('doc-priorities').placeholder='Optional: what matters right now.';
  const picker=document.createElement('input');picker.type='file';picker.accept='.md,.markdown,text/markdown';picker.multiple=true;picker.hidden=true;picker.id='context-files';context.content.append(picker);
  const importButton=button('Add .md files',()=>picker.click());context.content.insertBefore(importButton,context.content.firstChild);
  picker.onchange=async()=>{
    const files=Array.from(picker.files||[]);if(!files.length)return;
    importButton.disabled=true;
    try{
      const combined=await appendMarkdownFiles(files,$('doc-profile').value);
      $('doc-profile').value=combined;
      $('panel-note').textContent=`${files.length===1?'File added.':'Files added.'} Click Save to keep them.`;
    }catch(error){$('panel-note').textContent=String(error.message||error);}
    finally{importButton.disabled=false;picker.value='';}
  };
  context.content.append(help('Paste text or add Markdown files. Click Save to keep them.'));
  context.content.append(button('Clear context',()=>{$('doc-profile').value='';$('doc-priorities').value='';}));
  const tone=group('Personality');root.append(tone.details);
  for(const [id,label] of [['aggression','Bluntness'],['positivity','Positivity'],['verbosity','Reply length'],['swearing','Swearing'],['challenge','Challenge']])slider(tone.content,id,label,draft.config[id]);
  const advanced=group('Advanced');root.append(advanced.details);const a=advanced.content;
  const key=field('Replace OpenRouter key','api-key','','password');key.querySelector('input').autocomplete='off';a.append(key);
  const keyRow=document.createElement('div');keyRow.className='row';keyRow.append(button('Save key',async()=>{await invoke('save_api_key',{value:$('api-key').value});$('api-key').value='';await refresh();$('panel-note').textContent='Key saved.';}),button('Remove key',async()=>{await invoke('delete_api_key');await refresh();await openSetup();}));a.append(keyRow);
  a.append(field('Model','model',draft.config.model));const suggestions=document.createElement('datalist');suggestions.id='models';a.append(suggestions);$('model').setAttribute('list','models');
  const price=document.createElement('p');price.id='model-price';price.className='help';a.append(price);
  a.append(button('Refresh models',async()=>{models=await invoke('model_list');populateModels();}),button('Cheaper model',()=>{$('model').value='openai/gpt-oss-120b';showPrice();}));
  a.append(field('Daily limit ($)','daily-budget',draft.config.daily_budget,'number'),field('Reply limit (tokens)','max-tokens',draft.config.max_tokens,'number'),field('Temperature','temperature',draft.config.temperature,'number'));
  $('daily-budget').min='0.01';$('daily-budget').max='10';$('daily-budget').step='0.01';$('max-tokens').min='100';$('max-tokens').max='2000';$('max-tokens').step='50';$('temperature').min='0';$('temperature').max='1.5';$('temperature').step='0.1';
  a.append(field('Memory','doc-memory',draft.documents.memory,'textarea'),field('Instructions','doc-system',draft.documents.system,'textarea'));
  const update=button('Update memory',async()=>{
    $('panel-note').textContent='Updating…';setBusy(true);update.disabled=true;stop.hidden=false;
    try{const note=await invoke('update_memory');await refresh();$('doc-memory').value=state.documents.memory;draft.documents.memory=state.documents.memory;$('panel-note').textContent=note;}
    finally{setBusy(false);update.disabled=false;stop.hidden=true;}
  });const stop=button('Stop',()=>invoke('cancel'));stop.hidden=true;a.append(update,stop);
  a.append(button('Open files',()=>invoke('open_data_folder')),button('Export chats',()=>invoke('export_history').then(()=>{$('panel-note').textContent='Exported.';})),button('Minimise window',()=>getCurrentWindow().minimize()));
  const save=button('Save',async()=>{
    if(busy)throw new Error('Wait for the reply.');const c={...draft.config};
    for(const id of ['aggression','positivity','verbosity','swearing','challenge'])c[id]=Number($(id).value);
    c.model=$('model').value.trim();c.daily_budget=Number($('daily-budget').value);c.max_tokens=Number($('max-tokens').value);c.temperature=Number($('temperature').value);c.auto_memory=$('auto-memory').checked;c.launch_at_login=$('launch-login').checked;
    const documents={};for(const id of ['system','profile','priorities','memory'])documents[id]=$('doc-'+id).value;
    await invoke('save_settings',{config:c,documents});await refresh();closePanel();notify();
  });save.className='primary';$('panel-foot').append(save);
  $('model').oninput=showPrice;
  if(models.length)populateModels();
}
function populateModels(){const list=$('models');if(!list)return;list.replaceChildren();for(const m of models){const o=document.createElement('option');o.value=m.id;o.label=m.name;list.append(o);}showPrice();}
function showPrice(){if(!$('model-price'))return;const m=models.find(m=>m.id===$('model').value);$('model-price').textContent=m?`$${(m.input*1e6).toFixed(2)}/M input · $${(m.output*1e6).toFixed(2)}/M output`:'Refresh models to check this ID.';}
$('settings').onclick=()=>openSettings().catch(report);
async function start(){
  try{await refresh();const saved=localStorage.getItem('conversation');conversation=state.conversations.find(c=>c.id===saved)?.id||state.conversations[0]?.id||await invoke('new_conversation');await load(conversation);
    const notes=await invoke('runtime_status');if(notes.length)notify(notes.join('\n'));
    if(!state.has_key){await openSetup();}
  }catch(e){report(e);}
}
start();
