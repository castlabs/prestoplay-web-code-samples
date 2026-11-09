/**
 * Request and response modifiers: change network requests before they are
 *   sent (headers, query parameters, async auth tokens) and responses
 *   before the player uses them (manifest rewriting).
 * Modules: cl.mse, cl.dash, cl.ttml (only for the subtitle tracks of
 *   this stream)
 * APIs: player.getNetworkEngine(), networkEngine.addRequestModifier(fn),
 *   networkEngine.addResponseModifier(fn), removeRequestModifier,
 *   removeResponseModifier, clpp.net.RequestType (MANIFEST, SEGMENT,
 *   LICENSE, ...), request.uris, request.headers, response.data
 *   (ArrayBuffer), response.uri
 * Gotchas: a modifier can return a Promise; if it rejects, the request
 *   fails and the player raises an error. An async modifier must resolve
 *   with the request (or response) object: it replaces the original, so
 *   resolving with undefined breaks the request. Custom headers trigger a CORS
 *   preflight, so the server must allow them. Modifiers stay registered
 *   after player.release(). On Safari, HLS played by the native player
 *   bypasses the network engine, so modifiers are not called.
 * Page: request_modifiers.html provides #video, #log, #stopLoggingButton
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.ttml"

clpp.log.setLogLevel(clpp.log.Level.INFO);

const RequestType = clpp.net.RequestType;
const TYPE_NAMES = Object.fromEntries(
  Object.entries(RequestType).filter(([, value]) => typeof value === 'number')
    .map(([name, value]) => [value, name]),
);

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

const logEl = document.getElementById('log');
function log(event, detail) {
  const item = document.createElement('li');
  const eventEl = document.createElement('span');
  eventEl.className = 'event';
  eventEl.textContent = event;
  const detailEl = document.createElement('span');
  detailEl.className = 'detail';
  detailEl.textContent = ` ${detail}`;
  item.append(eventEl, detailEl);
  logEl.prepend(item);
}

// Stand-in for a call to your backend. Request modifiers can be async,
// so the player waits for the token before it sends the request.
let cachedToken = null;
async function getAuthToken() {
  if (!cachedToken) {
    await new Promise(resolve => setTimeout(resolve, 100));
    cachedToken = 'example-token';
  }
  return cachedToken;
}

const networkEngine = player.getNetworkEngine();

// 1. Request modifier: add an auth header to every request and a query
// parameter to segment requests.
networkEngine.addRequestModifier(async (request) => {
  request.headers['X-Auth-Token'] = await getAuthToken();
  if (request.type === RequestType.SEGMENT) {
    request.uris = request.uris.map((uri) => {
      const url = new URL(uri);
      url.searchParams.set('session', 'abc123');
      return url.toString();
    });
  }
  // Async modifiers must resolve with the request.
  return request;
});

// 2. Response modifier: rewrite the DASH manifest before the player
// parses it. This one removes the Chinese subtitle track.
networkEngine.addResponseModifier((response) => {
  if (response.request?.type !== RequestType.MANIFEST) {
    return;
  }
  const text = new TextDecoder().decode(response.data);
  const patched = text.replace(
    /<AdaptationSet[^>]*\blang="ch"[^>]*>[\s\S]*?<\/AdaptationSet>/g,
    '',
  );
  if (patched !== text) {
    response.data = new TextEncoder().encode(patched).buffer;
    log('MANIFEST', 'removed the "ch" subtitle track');
  }
});

// 3. Response modifier that only observes: log every response. Keep a
// reference to the function so it can be removed later.
function logResponse(response) {
  const type = TYPE_NAMES[response.request?.type] || 'UNKNOWN';
  const size = (response.data.byteLength / 1024).toFixed(1);
  log(type, `${size} KiB ${response.uri}`);
}
networkEngine.addResponseModifier(logResponse);

document.getElementById('stopLoggingButton').addEventListener('click', () => {
  networkEngine.removeResponseModifier(logResponse);
  log('INFO', 'response logging stopped');
});

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
  }
});

player.open({
  source: 'https://testcontent.castlabs.com/QA/tos_1080_clear/manifest.mpd',
  autoplay: true,
  muted: true,
}).then(() => {
  const languages = player.getTrackManager().getTextTracks().map(track => track.language);
  log('INFO', `subtitle languages after the rewrite: ${languages.join(', ')}`);
}).catch((error) => {
  console.warn('Load failed:', error);
});
