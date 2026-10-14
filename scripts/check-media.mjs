import assert from 'node:assert/strict'
import {validateFileSignature} from '../src/features/media/validateSignature.ts'
await validateFileSignature(new File([new Uint8Array([137,80,78,71,13,10,26,10])],'test.png',{type:'image/png'}))
await assert.rejects(validateFileSignature(new File([new Uint8Array([255,216,255])],'fake.png',{type:'image/png'})),/contents don’t match/)
await assert.rejects(validateFileSignature(new File(['not a pdf'],'fake.pdf',{type:'application/pdf'})),/contents don’t match/)
await validateFileSignature(new File(['%PDF-1.7\n'],'test.pdf',{type:'application/pdf'}))
await validateFileSignature(new File([new Uint8Array([26,69,223,163])],'voice.webm',{type:'audio/webm;codecs=opus'}))
await validateFileSignature(new File(['a shared note'],'note.txt',{type:'text/plain'}))
await assert.rejects(validateFileSignature(new File([new Uint8Array([0,0,0,0])],'fake.txt',{type:'text/plain'})),/contents don’t match/)
console.log('PASS: file signature checks reject mismatched PNG, PDF and binary TXT; supported headers pass.')
