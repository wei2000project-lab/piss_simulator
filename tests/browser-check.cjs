const { chromium } = require('C:/Users/weiwei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { startServer } = require('../server.cjs');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
  const {server,url}=await startServer();
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const output=path.join(__dirname,'../artifacts');fs.mkdirSync(output,{recursive:true});
  try{
    await page.goto(url);await page.waitForFunction(()=>window.bathroomDebug,{timeout:30000});await page.waitForTimeout(2200);
    await page.screenshot({path:path.join(output,'01-welcome.png')});
    await page.waitForTimeout(1000);
    console.log('Initial:',JSON.stringify(await page.evaluate(()=>window.bathroomDebug.snapshot())));
    await page.screenshot({path:path.join(output,'02-playing.png')});
    console.log('Errors:',JSON.stringify(errors));
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
