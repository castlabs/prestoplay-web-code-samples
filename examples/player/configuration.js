/**
 * Player configuration: autoplay and the browser autoplay policy, start
 *   time, volume and muted state, buffering goals and network retries.
 * Modules: cl.mse, cl.dash
 * APIs: player.open({source, autoplay, muted, volume, startTime, streaming:
 *   {bufferingGoal, rebufferingGoal, bufferBehind, attemptParameters},
 *   manifest: {attemptParameters}}), player.play(), player.setMuted(),
 *   clpp.events.AUTOPLAY_NOT_ALLOWED, clpp.events.STATE_CHANGED,
 *   clpp.Player.State
 * Gotchas: Browsers block autoplay with sound until the user interacts with
 *   the page. Muted autoplay is generally allowed, so the page loads muted
 *   on start. When autoplay is blocked, the player fires
 *   AUTOPLAY_NOT_ALLOWED and open() rejects; show a play button then.
 *   Use the autoplay option, not the <video autoplay> attribute, which the
 *   player ignores. rebufferingGoal must be <= bufferingGoal.
 *   attemptParameters counts the first attempt in maxAttempts; baseDelay and
 *   timeout are in milliseconds.
 * Page: configuration.html provides #video, #log, #sourceUrl, #autoplay,
 *   #muted, #volume, #startTime, #bufferingGoal, #rebufferingGoal,
 *   #bufferBehind, #segmentAttempts, #manifestAttempts, #loadButton,
 *   #playButton, #unmuteButton
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"

clpp.log.setLogLevel(clpp.log.Level.INFO);

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

const logEl = document.getElementById('log');
function log(message) {
  const item = document.createElement('li');
  item.textContent = `${new Date().toLocaleTimeString()} ${message}`;
  logEl.prepend(item);
}

function getStateName(state) {
  return Object.keys(clpp.Player.State).find(key => clpp.Player.State[key] === state) ?? state;
}

player.on(clpp.events.STATE_CHANGED, (event) => {
  const {previousState, currentState} = event.detail;
  log(`STATE_CHANGED ${getStateName(previousState)} -> ${getStateName(currentState)}`);
});

// Fired when the browser blocks playback that was not started by a user
// gesture. Offer a play button, or reload muted.
player.on(clpp.events.AUTOPLAY_NOT_ALLOWED, () => {
  log('AUTOPLAY_NOT_ALLOWED: press Play or load muted');
});

player.on('volumechange', () => {
  log(`volumechange muted=${player.isMuted()} volume=${player.getVolume() ?? '-'}`);
});

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
    log(`Error ${error.code}`);
  }
});

function readNumber(id) {
  return Number(document.getElementById(id).value);
}

function retries(maxAttempts) {
  return {
    maxAttempts,       // attempts in total, including the first one
    baseDelay: 1000,   // milliseconds before the first retry
    backoffFactor: 2,  // each retry waits twice as long as the previous one
    fuzzFactor: 0.5,   // randomize each delay by +/- 50%
    timeout: 30000,    // per-request timeout in milliseconds, 0 = unlimited
  };
}

function load() {
  const config = {
    source: document.getElementById('sourceUrl').value,
    // Start playback as soon as the content is ready. With false (the
    // default) the content is loaded and buffered, but paused.
    autoplay: document.getElementById('autoplay').checked,
    muted: document.getElementById('muted').checked,
    volume: readNumber('volume'),
    // Position in seconds where playback starts.
    startTime: readNumber('startTime'),
    streaming: {
      // Seconds of content to buffer ahead of the playhead.
      bufferingGoal: readNumber('bufferingGoal'),
      // Seconds that must be buffered to resume after a stall.
      rebufferingGoal: readNumber('rebufferingGoal'),
      // Seconds of content to keep behind the playhead.
      bufferBehind: readNumber('bufferBehind'),
      // Retries for segment requests.
      attemptParameters: retries(readNumber('segmentAttempts')),
    },
    manifest: {
      // Retries for manifest requests.
      attemptParameters: retries(readNumber('manifestAttempts')),
    },
  };
  log(`open() autoplay=${config.autoplay} muted=${config.muted} startTime=${config.startTime}`);
  player.open(config).then(() => {
    log('open() resolved');
  }).catch((error) => {
    // A blocked autoplay rejects open() as well.
    console.warn('Load failed:', error);
    log(`open() rejected: ${error.code ?? error}`);
  });
}

document.getElementById('loadButton').addEventListener('click', load);

// play() and setMuted() called from a click are user gestures, so the
// browser allows playback with sound.
document.getElementById('playButton').addEventListener('click', () => {
  player.play().catch((error) => log(`play() rejected: ${error.code ?? error}`));
});

document.getElementById('unmuteButton').addEventListener('click', () => {
  player.setMuted(false);
  document.getElementById('muted').checked = false;
});

// Load on page start, without a user gesture. Autoplay works here because
// the "Muted" checkbox starts out checked. Loading with sound before the
// user interacts with the page would be blocked by the browser.
load();
