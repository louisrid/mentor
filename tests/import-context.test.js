import test from 'node:test';
import assert from 'node:assert/strict';
import { appendMarkdownFiles } from '../src/import-context.js';
const file=(name,text)=>({name,size:new TextEncoder().encode(text).length,text:async()=>text});
test('multiple Markdown files append with headings and preserve existing context',async()=>{
  assert.equal(await appendMarkdownFiles([file('profile.md','My profile'),file('goals.markdown','My goals')],'Existing'), 'Existing\n\n## profile.md\n\nMy profile\n\n## goals.markdown\n\nMy goals');
});
test('bad file types, empty files and combined UTF-8 overflow reject the whole import',async()=>{
  await assert.rejects(appendMarkdownFiles([file('file.txt','text')]),/Choose/);
  await assert.rejects(appendMarkdownFiles([file('empty.md','  ')]),/empty/);
  await assert.rejects(appendMarkdownFiles([file('big.md','🙂'.repeat(5000))],'x'.repeat(14000)),/exceeds/);
});
test('cancelled selection is a no-op and BOM is removed',async()=>{
  assert.equal(await appendMarkdownFiles([],'Original'),'Original');
  assert.equal(await appendMarkdownFiles([file('note.md','\uFEFFHello')]),'## note.md\n\nHello');
});
