const {_electron:electron}=require('C:/Users/weiwei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),baseline=process.argv.includes('--baseline');
(async()=>{
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const app=await electron.launch({executablePath:path.join(root,'node_modules/electron/dist/electron.exe'),args:[root],env});
  try{
    const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.waitForFunction(()=>window.bathroomDebug?.snapshot().state.nativeReady);
    await page.waitForTimeout(1000);
    await page.evaluate(()=>{
      window.gpuProbe={draws:0,clears:0};
      for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced','clear']){
        const original=WebGL2RenderingContext.prototype[name];
        WebGL2RenderingContext.prototype[name]=function(...args){window.gpuProbe[name==='clear'?'clears':'draws']++;return original.apply(this,args);};
      }
    });
    const measure=async(ms=1500)=>{
      const a=await page.evaluate(()=>({time:performance.now(),...window.gpuProbe,render:window.bathroomDebug.snapshot().render}));
      await page.waitForTimeout(ms);
      const b=await page.evaluate(()=>({time:performance.now(),...window.gpuProbe,render:window.bathroomDebug.snapshot().render}));
      return {seconds:(b.time-a.time)/1000,draws:b.draws-a.draws,clears:b.clears-a.clears,
        frames:b.render&&b.render.frames-a.render.frames,shadowPasses:b.render&&b.render.shadowPasses-a.render.shadowPasses,
        mirrorPasses:b.render&&b.render.mirrorPasses-a.render.mirrorPasses};
    };
    const result={idle:await measure()};
    await page.keyboard.down('d');result.moving=await measure();await page.keyboard.up('d');
    await page.waitForTimeout(900);result.settled=await measure();
    await page.keyboard.press('Escape');await page.waitForTimeout(250);result.paused=await measure();
    await page.click('#resume-button');await page.waitForTimeout(250);
    console.log('Measured scenarios:',JSON.stringify(result));
    if(!baseline){
      assert.equal(result.idle.draws,0);assert.equal(result.settled.draws,0);assert.equal(result.paused.draws,0);
      assert.ok(result.moving.frames>20);assert.ok(result.moving.frames<=Math.ceil(result.moving.seconds*60));
      assert.equal(result.moving.shadowPasses,0);
      const before=(await page.evaluate(()=>window.bathroomDebug.snapshot())).render.frames;
      await page.keyboard.press('Space');await page.waitForTimeout(250);
      const jumping=await page.evaluate(()=>window.bathroomDebug.snapshot());assert.ok(jumping.player.feet>.1);assert.ok(jumping.render.frames>before);
      await page.waitForFunction(()=>window.bathroomDebug.snapshot().player.grounded);await page.waitForTimeout(100);
      const canvas=await page.locator('#canvas-host').boundingBox();await page.mouse.move(canvas.width/2,canvas.height/2);await page.mouse.down();
      await page.waitForFunction(()=>window.bathroomDebug.snapshot().pending>=3);await page.keyboard.press('Escape');await page.mouse.up();
      const frozen=await page.evaluate(()=>window.bathroomDebug.snapshot());result.pausedWater=await measure(800);
      assert.equal(result.pausedWater.draws,0);assert.equal((await page.evaluate(()=>window.bathroomDebug.snapshot().pending)),frozen.pending);
      await page.click('#resume-button');await page.waitForFunction(()=>window.bathroomDebug.snapshot().pending===0);
      const landed=await page.evaluate(()=>window.bathroomDebug.snapshot());assert.ok(Math.abs(landed.state.total-landed.state.caught-landed.state.floor)<.001);
      await page.waitForFunction(()=>!window.bathroomDebug.snapshot().render.animating);
      // Resize must invalidate a retained frame, including while paused.
      await page.keyboard.press('Escape');const old=await page.evaluate(()=>window.bathroomDebug.snapshot().render.frames);
      await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setFullScreen(false);w.setSize(1100,800);});
      await page.waitForTimeout(500);assert.ok((await page.evaluate(()=>window.bathroomDebug.snapshot().render.frames))>old);
      await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].minimize());await page.waitForTimeout(500);
      result.minimized=await measure();assert.equal(result.minimized.draws,0);
      await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.restore();w.focus();});await page.waitForTimeout(300);
      await page.click('#resume-button');await page.keyboard.down('a');await page.waitForTimeout(200);await page.keyboard.up('a');
      assert.equal((await page.evaluate(()=>window.bathroomDebug.snapshot().state.paused)),false);
    }
    assert.deepEqual(errors,[]);result.viewport=await page.evaluate(()=>({css:[innerWidth,innerHeight],pixels:[document.querySelector('canvas').width,document.querySelector('canvas').height]}));
    fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});fs.writeFileSync(path.join(root,'artifacts',baseline?'performance-before.json':'performance-after.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify(result,null,2));console.log(baseline?'BASELINE CAPTURED':'PERFORMANCE CHECKS PASSED');
  }finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
