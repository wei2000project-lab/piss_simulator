const {_electron}=require('C:/Users/weiwei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('node:path');
(async()=>{
  const root=path.resolve(__dirname,'..'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const app=await _electron.launch({executablePath:path.join(root,'node_modules/electron/dist/electron.exe'),args:[root],env});
  try{
    const page=await app.firstWindow();await page.waitForFunction(()=>window.bathroomDebug);
    await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setFullScreen(false);w.setSize(1024,768);});await page.waitForTimeout(500);
    console.log('Full viewport canvas:',await page.locator('#canvas-host').boundingBox());
    await page.screenshot({path:path.join(root,'artifacts','06-compact.png')});
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1440,960));await page.waitForTimeout(2800);
    await page.screenshot({path:path.join(root,'artifacts','08-final-room.png')});
  }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
