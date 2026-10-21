const test=require('node:test');
const assert=require('node:assert/strict');
const {startServer}=require('../server.cjs');
test('two independent instances reserve different free ports and expose only assets',async()=>{
  const a=await startServer(),b=await startServer();
  try{
    assert.notEqual(a.url,b.url);
    const page=await fetch(a.url);assert.equal(page.status,200);assert.match(await page.text(),/Porcelain Playground/);
    assert.equal((await fetch(a.url+'/node_modules/three/build/three.module.js')).status,200);
    assert.equal((await fetch(a.url+'/desktop.cjs')).status,403);
    assert.equal((await fetch(a.url+'/src%2f..%2fdesktop.cjs')).status,403);
    assert.equal((await fetch(a.url+'/src/unknown.js')).status,404);
  }finally{a.server.close();b.server.close();}
});
