/**
 * Error handling: handle player errors from the error event and from
 *   rejected promises, and read the data of failed network attempts.
 * Modules: cl.mse, cl.dash
 * APIs: player.on(clpp.events.ERROR, e => e.detail), clpp.Error (category,
 *   severity, code, data, svtaCode), clpp.Error.Category,
 *   clpp.Error.Severity (RECOVERABLE, FATAL), clpp.Error.Code,
 *   error.data.request (uris, uriIndex, currentAttempt, maxAttempts),
 *   error.data.status, error.data.url, player.open().catch(),
 *   manifest.attemptParameters, player.release()
 * Gotchas: Attach the error listener right after creating the player. API
 *   calls that return a Promise (open, play, pause, setPosition, release,
 *   destroy) reject on failure; a failed open() also triggers the error
 *   event, so handle both and expect the same error twice.
 *   A failed network attempt that the player will retry is RECOVERABLE; the
 *   error after the last attempt is FATAL. After a FATAL error, release the
 *   player before you load again. HTTP 401 and 403 are not retried by
 *   default (attemptParameters.fatalStatusCodes). A CORS, SSL, mixed
 *   content or offline failure has no HTTP status (HTTP_ERROR, status 0 or
 *   -1); the browser console shows the cause.
 * Page: errors.html provides #video, #log and buttons with data-source
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"

clpp.log.setLogLevel(clpp.log.Level.INFO);

const SOURCES = {
  // The server responds with HTTP 404. The player retries the request
  // before it gives up.
  notFound: 'https://demo.cf.castlabs.com/media/prestodash/missing.mpd',
  // The host does not exist, so no HTTP response is received.
  unreachable: 'https://manifest.invalid/manifest.mpd',
  // A subtitle file loaded as DASH: the download works, parsing fails.
  notManifest: {
    url: 'https://testcontent.castlabs.com/QA/tos_1080_clear/TOS-en.ttml',
    type: clpp.Type.DASH,
  },
  valid: 'https://testcontent.castlabs.com/QA/tos_1080_clear/manifest.mpd',
};

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

const logEl = document.getElementById('log');
function log(event, detail = '') {
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

// Maps an enum value back to its name, e.g. 1001 -> 'BAD_HTTP_STATUS'.
function enumName(enumObject, value) {
  return Object.keys(enumObject).find(key => enumObject[key] === value) ?? value;
}

function describeError(error) {
  const severity = enumName(clpp.Error.Severity, error.severity);
  const category = enumName(clpp.Error.Category, error.category);
  const code = enumName(clpp.Error.Code, error.code);
  return `${severity} ${category} ${code} (${error.code})`;
}

// Describes the failed request attempt of a network error, if there is one.
function describeAttempt(error) {
  const data = error.data || {};
  const parts = [];
  if (data.status !== undefined) {
    parts.push(`status ${data.status}`);
  }
  const request = data.request;
  if (request) {
    parts.push(`attempt ${request.currentAttempt}/${request.maxAttempts}`);
    parts.push(request.uris[request.uriIndex]);
  } else if (data.url) {
    parts.push(data.url);
  }
  return parts.join(', ');
}

// Attach the error listener right after creating the player.
player.on(clpp.events.ERROR, (event) => {
  const error = event.detail;
  if (!error) {
    return;
  }
  console.warn('Error:', error);
  log(`error event: ${describeError(error)}`, describeAttempt(error));

  if (error.severity === clpp.Error.Severity.FATAL) {
    // The player stopped. Show a message to the viewer or try another source.
    log('fatal', 'playback stopped');
  }
});

document.querySelectorAll('button[data-source]').forEach((button) => {
  button.addEventListener('click', async () => {
    log('load', button.textContent);
    // Start from a clean state, also after a FATAL error.
    await player.release().catch(() => {});

    try {
      await player.open({
        source: SOURCES[button.dataset.source],
        autoplay: true,
        muted: true,
        // Fewer and faster manifest retries than the default, so the retries
        // show up in the log quickly.
        manifest: {
          attemptParameters: {
            maxAttempts: 3,
            baseDelay: 500,
            backoffFactor: 2,
            fuzzFactor: 0,
            timeout: 10000,
          },
        },
      });
      log('open() resolved');
    } catch (error) {
      // open() rejects with the same kind of clpp.Error. Other Promise-based
      // API calls (play, pause, setPosition, ...) work the same way.
      if (error instanceof clpp.Error) {
        log(`open() rejected: ${describeError(error)}`, describeAttempt(error));
      } else {
        log('open() rejected', String(error));
      }
    }
  });
});
