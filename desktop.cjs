const { app, BrowserWindow, ipcMain, screen, Menu } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const readline = require('node:readline');
const { startServer } = require('./server.cjs');
let win, server, native, nativeReady = false, locked = false;
const tempPath=path.join(__dirname,'.runtime','temp');
fs.mkdirSync(tempPath,{recursive:true});
process.env.TEMP=tempPath;process.env.TMP=tempPath;
// Keep Electron's caches and user data inside the requested project directory.
app.setPath('userData', path.join(__dirname, '.runtime', 'user-data'));
app.setPath('sessionData', path.join(__dirname, '.runtime', 'session'));
app.setPath('crashDumps',path.join(__dirname,'.runtime','crash-dumps'));
app.setAppLogsPath(path.join(__dirname,'.runtime','logs'));
process.on('uncaughtExceptionMonitor', error => {
  const logDir=path.join(__dirname,'.runtime','logs');
  fs.mkdirSync(logDir,{recursive:true});
  fs.appendFileSync(path.join(logDir,'main-errors.log'),new Date().toISOString()+' '+error.stack+'\n');
});
const singleInstance=app.requestSingleInstanceLock();
if(!singleInstance) app.quit();
app.on('second-instance',()=>{if(win&&!win.isDestroyed()){if(win.isMinimized())win.restore();win.show();win.focus();}});
function command(value) { if (nativeReady && native?.stdin.writable) native.stdin.write(value + '\n'); }
function release() {
  command('unlock'); locked = false;
  if (win && !win.isDestroyed()) win.webContents.send('cursor-released');
}
function startNative() {
  if (process.platform !== 'win32') return;
  native = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'native', 'cursor.ps1')], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  native.stdin.on('error', () => {});
  readline.createInterface({ input: native.stdout }).on('line', line => {
    if (line === 'ready') {
      nativeReady = true;
      if (win && !win.isDestroyed()) win.webContents.send('native-status', true);
    } else if (line.startsWith('move ') && locked && win?.isFocused()) {
      const [x, y] = line.slice(5).split(' ').map(Number);
      win.webContents.send('raw-motion', { x, y });
    }
  });
  native.stderr.on('data', data => console.error('[cursor]', data.toString()));
  native.on('error', err => console.error('[cursor]', err.message));
  native.on('exit', () => { nativeReady = false; locked = false; if (win && !win.isDestroyed()) { win.webContents.send('native-status', false); win.webContents.send('cursor-released'); } });
}
ipcMain.handle('native-status', () => nativeReady);
ipcMain.handle('cursor-lock', (_, mode) => {
  if (!nativeReady || !win?.isFocused() || !['center', 'current'].includes(mode)) return false;
  const bounds = win.getContentBounds();
  const center = screen.dipToScreenPoint({ x: Math.round(bounds.x + bounds.width / 2), y: Math.round(bounds.y + bounds.height / 2) });
  command(`lock ${mode} ${center.x} ${center.y}`);
  locked = true;
  return true;
});
ipcMain.handle('cursor-unlock', () => { release(); return true; });
ipcMain.handle('fullscreen', () => { release(); win.setFullScreen(!win.isFullScreen()); });
if(singleInstance) app.whenReady().then(async () => {
  ({ server, url: app.gameUrl } = await startServer());
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({ width: 1440, height: 960, minWidth: 980, minHeight: 700, backgroundColor: '#f5f3eb', title: 'Porcelain Playground · 小事練習室', autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.control && ['w', 'W'].includes(input.key)) {
      event.preventDefault();
      if (input.type === 'keyDown' && !input.isAutoRepeat) win.webContents.send('protected-shortcut');
    }
    if (input.key === 'Escape' && input.type === 'keyDown') release();
    if (input.key === 'F11' && input.type === 'keyDown') { event.preventDefault(); release(); win.setFullScreen(!win.isFullScreen()); }
  });
  win.on('blur', release);
  win.on('minimize', release);
  win.on('resize', release);
  win.on('move', release);
  win.on('close', release);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  await win.loadURL(app.gameUrl);
  startNative();
}).catch(err => { console.error(err); app.quit(); });
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { command('quit'); native?.stdin.end(); server?.close(); });
