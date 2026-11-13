import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import {
  denyAllPermissions,
  enableGlobalSandbox,
  lockDownWebContents,
} from './security';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

/** True only when running from `npm start` (unpackaged), never in an installed build. */
const isDev = !app.isPackaged;

// These must be registered before the app is ready / any window exists.
enableGlobalSandbox();
lockDownWebContents();

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    title: 'VoxelRoom',
    backgroundColor: '#1e1f22',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      // Security settings, stated explicitly so they never depend on Electron defaults.
      contextIsolation: true, // preload and page run in separate JavaScript worlds
      nodeIntegration: false, // the page cannot use require() or Node.js APIs
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      sandbox: true, // the renderer process runs in the OS sandbox
      webSecurity: true, // keep the same-origin policy
      allowRunningInsecureContent: false,
      webviewTag: false,
      devTools: isDev, // DevTools cannot be opened at all in production builds
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  denyAllPermissions();
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
