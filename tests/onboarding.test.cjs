const {test}=require('node:test');const assert=require('node:assert/strict');const {parse}=require('../dist/onboarding.js');
test('imports names and CSV name column',()=>{assert.equal(parse('Aditi Roy\nRohan Sen').length,2);assert.equal(parse('Department,Employee Name\nHR,"Roy, Aditi"')[0].name,'Roy, Aditi')});
test('detects within-file and existing duplicates',()=>{const r=parse('Employee Name\nAditi Roy\nADITI ROY\nRohan Sen',['Rohan Sen']);assert(!r[0].issue);assert(r[1].issue);assert(r[2].issue)});
test('supports BOM, CRLF and Hindi names',()=>assert.equal(parse('\uFEFFEmployee Name\r\nअनन्या शर्मा')[0].name,'अनन्या शर्मा'));
test('rejects malformed files and invalid names',()=>{assert.throws(()=>parse('"broken'));assert.throws(()=>parse('NameX,Other\nA,B'));assert(parse('Employee Name\n<script>')[0].issue);assert.throws(()=>parse('x'.repeat(200001)))});
