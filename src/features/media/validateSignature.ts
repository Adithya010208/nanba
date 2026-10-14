export async function validateFileSignature(file:File){
 const bytes=new Uint8Array(await file.slice(0,1024).arrayBuffer())
 const text=new TextDecoder('latin1').decode(bytes)
 const type=file.type.split(';')[0]
 const starts=(values:number[])=>values.every((value,index)=>bytes[index]===value)
 let valid=true
 if(type==='image/jpeg')valid=starts([255,216,255])
 else if(type==='image/png')valid=starts([137,80,78,71,13,10,26,10])
 else if(type==='image/gif')valid=/^GIF8[79]a/.test(text)
 else if(type==='image/webp')valid=text.startsWith('RIFF')&&text.slice(8,12)==='WEBP'
 else if(type==='video/webm'||type==='audio/webm')valid=starts([26,69,223,163])
 else if(['video/mp4','video/quicktime','audio/mp4','audio/x-m4a'].includes(type))valid=text.slice(4,8)==='ftyp'
 else if(type==='audio/ogg')valid=text.startsWith('OggS')
 else if(type==='audio/wav'||type==='audio/x-wav')valid=text.startsWith('RIFF')&&text.slice(8,12)==='WAVE'
 else if(type==='audio/mpeg')valid=text.startsWith('ID3')||(bytes[0]===255&&(bytes[1]&224)===224)
 else if(type==='application/pdf')valid=text.includes('%PDF-')
 else if(type.includes('openxmlformats')||type==='application/zip'||type==='application/x-zip-compressed')valid=starts([80,75])
 else if(['application/msword','application/vnd.ms-powerpoint','application/vnd.ms-excel'].includes(type))valid=starts([208,207,17,224,161,177,26,225])
 else if(type==='text/plain')valid=!bytes.includes(0)||starts([255,254])||starts([254,255])
 if(!valid)throw new Error('The file contents don’t match the selected file format. Choose the original file and try again.')
}
