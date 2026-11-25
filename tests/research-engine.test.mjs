import test from 'node:test';
import assert from 'node:assert/strict';
import {analyze,demoRows,evaluateAnswer} from '../app/research-engine.mjs';
test('financial ratios and normalized scores are computed from records',()=>{const [a]=analyze(demoRows,'2026-08-12');assert.equal(a.margin,.2);assert.equal(a.cash,1.25);assert.equal(a.score,72);assert.equal(a.status,'可计算');});
test('invalid and future records cannot enter ranking',()=>{const rows=analyze([demoRows[0],demoRows[0],{...demoRows[1],asOf:'2027-01-01'},demoRows[2]],'2026-08-12');assert.equal(rows[1].score,null);assert.equal(rows[2].score,null);assert.equal(rows[3].score,null);assert.ok(rows[2].issues.some(x=>x.includes('未来')));});
test('weight experiment is normalized and invalid weights fail',()=>{assert.equal(analyze([demoRows[0]],'2026-08-12',[100,0,0,0])[0].score,78);assert.throws(()=>analyze(demoRows,'2026-08-12',[0,0,0,0]));assert.throws(()=>analyze([null],'2026-08-12'));});
test('review flags guarantees and never asserts factual verification',()=>{const r=evaluateAnswer('稳赚，保证收益','');assert.equal(r.flags.length,3);assert.match(r.factuality,/人工/);});

