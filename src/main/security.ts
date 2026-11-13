/**
 * Electron security rules for the main process.
 *
 * The renderer (the web page inside the window) is treated as untrusted:
 * it must never leave the app, open new windows, or gain extra permissions.
 */
import { app, session, type WebContents } from 'electron';

/**
 * Must be called before `app` is ready. Forces Chromium's OS-level sandbox
 * on every renderer, even if a future window forgets `sandbox: true`.
 */
export function enableGlobalSandbox(): void {
  app.enableSandbox();
}

/** Deny every permission request: camera, microphone, geolocation, notifications, USB, HID, serial… */
export function denyAllPermissions(): void {
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((_webContents, _permission, callback) =>
    callback(false),
  );
  ses.setPermissionCheckHandler(() => false);
  ses.setDevicePermissionHandler(() => false);
}

/**
 * Applies navigation and popup rules to every web contents the app creates,
 * including ones created later (DevTools, future windows).
 */
export function lockDownWebContents(): void {
  app.on('web-contents-created', (_event, contents) => {
    blockNavigation(contents);

    // No popups: window.open, target="_blank" links and middle-clicks are all refused.
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));

    // <webview> tags can load arbitrary sites with their own settings; never allow them.
    contents.on('will-attach-webview', (event) => event.preventDefault());
  });
}

function blockNavigation(contents: WebContents): void {
  // The editor is a single page. Any attempt to navigate (a clicked link, a
  // script setting location.href, a redirect) is blocked. The only exception
  // is the page reloading itself (e.g. Vite's full reload in development).
  contents.on('will-navigate', (event, url) => {
    if (isSamePage(url, contents.getURL())) return;
    event.preventDefault();
    console.warn(`[security] Blocked navigation to ${url}`);
  });
  contents.on('will-redirect', (event, url) => {
    event.preventDefault();
    console.warn(`[security] Blocked redirect to ${url}`);
  });
}

/** Same protocol, host and path as the current page (query and #hash ignored). */
function isSamePage(target: string, current: string): boolean {
  try {
    const a = new URL(target);
    const b = new URL(current);
    return (
      a.protocol === b.protocol &&
      a.host === b.host &&
      a.pathname === b.pathname
    );
  } catch {
    return false;
  }
}
