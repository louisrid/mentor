const { chromium } = require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.MENTOR_QA_BROWSER||undefined,args:['--no-sandbox','--no-zygote','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:520,height:640}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const docs=Object.fromEntries(['system','profile','memory','priorities'].map(k=>[k,fs.readFileSync(path.join(__dirname,'../prompts',k+'.md'),'utf8')]));
 await page.addInitScript(({docs})=>{
  let counter=0;const callbacks={};const histories={first:[]};let lastConfig;let hasKey=false;
  const config={model:'openai/gpt-5.6-luna',temperature:.7,max_tokens:700,daily_budget:.3,aggression:7,positivity:8,verbosity:3,swearing:6,challenge:9,auto_memory:true,launch_at_login:true};
  const conversations=[{id:'first',title:'New conversation',updated:new Date().toISOString()}];
  window.__TAURI_INTERNALS__={metadata:{currentWindow:{label:'main'},currentWebview:{label:'main'}},
   transformCallback:(fn)=>{const id=++counter;callbacks[id]=fn;return id;},unregisterCallback:id=>delete callbacks[id],
   invoke:async(cmd,args={})=>{
    if(cmd==='snapshot')return {config:lastConfig||config,documents:docs,conversations,has_key:hasKey,spend:.003,data_path:'~/Library/Application Support/Mentor'};
    if(cmd==='save_api_key'){hasKey=true;return;}
    if(cmd==='runtime_status')return [];
    if(cmd==='model_list')return [{id:'openai/gpt-5.6-luna',name:'GPT-5.6 Luna',input:.0000002,output:.0000012}];
    if(cmd==='messages')return histories[args.id]||[];
    if(cmd==='new_conversation'){const id='conv'+(++counter);conversations.unshift({id,title:'New conversation',updated:new Date().toISOString()});histories[id]=[];return id;}
    if(cmd==='save_settings'){lastConfig=args.config;Object.assign(docs,args.documents);return;}
    if(cmd==='chat'){
      window.__replyChars=args.replyChars;
      const text='**Do the small version tonight.**\n\n<img src=x onerror="window.hacked=true">';
      histories[args.id].push({role:'user',content:args.text,status:'complete'});
      args.onToken.onmessage({text:text.slice(0,20)});await new Promise(r=>setTimeout(r,30));args.onToken.onmessage({text:text.slice(20)});
      histories[args.id].push({role:'assistant',content:text,status:'complete'});return {content:text,status:'complete',memory_note:'Memory updated.',spend:.003};
    }
    if(cmd==='update_memory'){docs.memory='# Memory\nNew test fact.';return 'Memory updated.';}
    if(cmd==='plugin:event|listen')return ++counter;
    if(cmd.startsWith('plugin:'))return null;
    return null;
   }
  };
 },{docs});
 await page.goto('http://127.0.0.1:1420');await page.waitForSelector('.setup');
 assert.equal(await page.locator('#panel-content input').count(),1);
 assert.equal(await page.locator('#model').count(),0);
 assert.equal(await page.locator('#api-key').evaluate(el=>getComputedStyle(el).fontSize),'19px');
 assert.equal(await page.locator('#api-key').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
 await page.screenshot({path:path.join(__dirname,'../../mentor-setup-check.png')});
 await page.locator('#api-key').fill('mock-key');await page.getByRole('button',{name:'Start chatting',exact:true}).click();
 await page.waitForSelector('#panel[hidden]',{state:'attached'});await page.waitForSelector('.empty');
 assert.match(await page.locator('#spend').textContent(),/0.30¢/);
 await page.locator('#input').fill('I keep putting this off');await page.locator('#input').press('Enter');
 await page.waitForSelector('.assistant strong');await page.waitForFunction(()=>!document.getElementById('send').disabled);
 assert.equal(await page.locator('.assistant strong').textContent(),'Do the small version tonight.');assert.equal(await page.locator('.assistant img').count(),0);assert.equal(await page.evaluate(()=>window.hacked),undefined);
 await page.locator('#settings').click();await page.waitForSelector('summary');
 assert.equal(await page.locator('details[open]').count(),0);assert.equal(await page.locator('#model').isVisible(),false);
 await page.screenshot({path:path.join(__dirname,'../../mentor-settings-check.png')});
 await page.getByText('Personality',{exact:true}).click();await page.waitForSelector('#aggression');
 await page.getByText('Personal context',{exact:true}).click();
 assert.equal(await page.locator('#doc-profile').inputValue(),'');assert.equal(await page.locator('#doc-priorities').inputValue(),'');
 await page.locator('#doc-profile').fill('My personal context, added by me.');await page.locator('#context-files').setInputFiles([{name:'example.md',mimeType:'text/markdown',buffer:Buffer.from('Imported Markdown note.')}]);await page.waitForFunction(()=>document.getElementById('doc-profile').value.includes('Imported Markdown note.'));assert.equal(await page.locator('#doc-profile').inputValue(),'My personal context, added by me.\n\n## example.md\n\nImported Markdown note.');await page.locator('#doc-priorities').fill('One task tomorrow.');await page.getByRole('button',{name:'Save',exact:true}).click();
 await page.locator('#settings').click();await page.getByText('Personality',{exact:true}).click();await page.getByText('Personal context',{exact:true}).click();assert.equal(await page.locator('#doc-priorities').inputValue(),'One task tomorrow.');assert.equal(await page.locator('#doc-profile').inputValue(),'My personal context, added by me.\n\n## example.md\n\nImported Markdown note.');
 await page.getByText('Advanced',{exact:true}).click();await page.getByRole('button',{name:'Update memory',exact:true}).click();await page.waitForFunction(()=>document.getElementById('panel-note').textContent==='Memory updated.');assert.match(await page.locator('#doc-memory').inputValue(),/New test fact/);
 await page.locator('#panel-close').click();await page.locator('#new').click();await page.waitForSelector('.empty');await page.locator('#history').click();await page.waitForSelector('.history-item');assert.equal(await page.locator('.history-item').count(),2);
 await page.locator('.history-item').last().click();await page.waitForSelector('.assistant');assert.equal(await page.locator('.message').count(),1);
 await page.screenshot({path:path.join(__dirname,'../../mentor-ui-check.png')});
 const brandBefore=await page.locator('.brand').boundingBox();
 await page.setViewportSize({width:380,height:400});
 await page.waitForTimeout(100);
 assert.equal(await page.locator('#chat').evaluate(el=>el.scrollHeight>el.clientHeight),false);
 assert.equal(await page.locator('#chat').evaluate(el=>getComputedStyle(el).overflowY),'hidden');
 await page.locator('#previous-message').click();
 assert.equal(await page.locator('.message.user').count(),1);
 await page.locator('#next-message').click();assert.equal(await page.locator('.assistant').count(),1);
 const brandAfter=await page.locator('.brand').boundingBox();assert.equal(brandBefore.y,brandAfter.y);assert.equal(brandBefore.x,brandAfter.x);assert.ok(await page.evaluate(()=>window.__replyChars>=1&&window.__replyChars<=240));
 await page.locator('#settings').click();await page.getByText('Personality',{exact:true}).click();await page.getByText('Personal context',{exact:true}).click();assert.equal(await page.evaluate(()=>document.body.scrollWidth>window.innerWidth),false);
 assert.deepEqual(errors,[]);console.log('PASS: one-field setup, large white text, collapsed settings, chat streaming, safe rendering, saved settings, memory, history and compact layout.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
