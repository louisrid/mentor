import test from 'node:test';
import assert from 'node:assert/strict';
import { formatSpend } from '../src/format.js';
test('daily cents show small positive spend without rounding to zero dollars',()=>{
  assert.equal(formatSpend(.00081),'0.08¢');assert.equal(formatSpend(.3),'30.00¢');
});
