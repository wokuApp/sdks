/**
 * postMessage bridge — micro-app side.
 *
 * Sends messages to the host loader and listens for commands.
 * All messages are verified for origin on the loader side;
 * the app trusts `parent` (same CDN origin) for incoming messages.
 */

export type AppToHostType =
  | 'woku:ready'
  | 'woku:resize'
  | 'woku:open'
  | 'woku:close'
  | 'woku:submit'
  | 'woku:skip';

export type HostToAppType =
  | 'woku:config'
  | 'woku:show'
  | 'woku:hide'
  | 'woku:destroy';

export interface BridgeMessage {
  type: AppToHostType | HostToAppType;
  payload?: unknown;
}

/** Send a message to the loader (host page) */
export function sendToHost(type: AppToHostType, payload?: unknown): void {
  window.parent.postMessage({ type, payload }, '*');
}

/** Notify the host of the current content dimensions for resize */
export function notifyResize(width: number, height: number): void {
  sendToHost('woku:resize', { width, height });
}

/** Register a listener for messages from the host loader */
export function onHostMessage(
  callback: (msg: BridgeMessage) => void,
): () => void {
  const handler = (event: MessageEvent) => {
    const msg = event.data as BridgeMessage;
    if (!msg?.type?.startsWith('woku:')) return;
    callback(msg);
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
