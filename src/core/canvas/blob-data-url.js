/** A self-contained download URL stays valid while the browser's save dialog is open. */
export function blobDataURL(session, blob, signal) {
  return new Promise((resolve, reject) => {
    const reader = new (session.window?.FileReader || globalThis.FileReader)();
    const cleanup = () => {
      reader.onload = reader.onerror = null;
      signal?.removeEventListener('abort', abort);
    };
    const abort = () => {
      cleanup();
      reader.abort();
      reject(signal.reason);
    };
    reader.onload = () => { cleanup(); resolve(reader.result); };
    reader.onerror = () => { cleanup(); reject(reader.error || new Error('Could not prepare the PNG download.')); };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) { abort(); return; }
    try { reader.readAsDataURL(blob); }
    catch (error) { cleanup(); reject(error); }
  });
}
