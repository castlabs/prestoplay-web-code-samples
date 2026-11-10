/**
 * Smart TV: suspend and resume handling, a memory-friendly configuration
 *   and remote control keys, for Samsung Tizen, LG webOS and other TV
 *   platforms. Also runs in a desktop browser: switch to another tab to
 *   suspend the app and use the keyboard as the remote.
 * Modules: cl.mse, cl.dash
 * External: polyfill.min.js from @castlabs/prestoplay/cjs (global script,
 *   loaded before the SDK for old TV web engines)
 * APIs: new clpp.Player(videoEl, {pauseWhenInBackground, restrictions}),
 *   player.open({source, startTime, autoplay, streaming: {bufferingGoal,
 *   rebufferingGoal, bufferBehind}}), player.release(), player.play(),
 *   player.pause(), player.isPaused(), player.getPosition(),
 *   player.seek(), document visibilitychange,
 *   tizen.tvinputdevice.registerKey()
 * Gotchas: pauseWhenInBackground is a constructor option, so this page
 *   reloads to switch the suspend mode. With 'pause', the SDK pauses on
 *   document.hidden and resumes when the page is visible again. With
 *   'release', the app releases the player (and its decoder and DRM
 *   sessions) on suspend and opens the content again at the saved position
 *   on resume; older Tizen models can reclaim the decoder and some webOS
 *   versions end the app, so treat resume as a possible fresh start. Tizen
 *   delivers media keys (play/pause, stop, rewind...) only after
 *   tizen.tvinputdevice.registerKey(); webOS delivers them by default.
 *   Older TV engines need the app bundled and transpiled to ES5; this
 *   module syntax is for modern engines. Test on each target device.
 * Page: smart_tv.html provides #video, #log, #modeForm (mode select),
 *   #playPauseButton, #rewindButton, #forwardButton
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"

clpp.log.setLogLevel(clpp.log.Level.INFO);

const SOURCE = 'https://testcontent.castlabs.com/QA/tos_1080_clear/manifest.mpd';
const SEEK_STEP = 10;

// The form on the page sets the mode as a query parameter.
const mode = new URLSearchParams(location.search).get('mode') === 'release' ? 'release' : 'pause';
document.querySelector('#modeForm [name="mode"]').value = mode;

const logEl = document.getElementById('log');
function log(message) {
  const item = document.createElement('li');
  item.textContent = `${new Date().toLocaleTimeString()} ${message}`;
  logEl.prepend(item);
}

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, {
  // license: '<your_license_key>', // TODO: needed outside localhost
  // viewerId: '<user_id>',
  // Pause when the app goes to the background and resume when it is back.
  pauseWhenInBackground: mode === 'pause',
  // Skip renditions the TV can't show anyway, e.g. 4K on a 1080p panel.
  restrictions: {
    maxHeight: 1080,
  },
}, { containerEl });

// Lower buffer sizes than the defaults keep memory use low on TVs.
const contentConfig = {
  source: SOURCE,
  autoplay: true,
  muted: true,
  streaming: {
    bufferingGoal: 10,
    rebufferingGoal: 2,
    // Seconds of media kept behind the playhead (default 30).
    bufferBehind: 10,
  },
};

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
    log(`Error ${error.code}`);
  }
});
player.on('pause', () => log('pause'));
player.on('play', () => log('play'));

function load(startTime, autoplay = true) {
  return player.open({...contentConfig, startTime, autoplay}).catch((error) => {
    // The browser can block autoplay with sound until the user presses a
    // key. TV apps are usually allowed to autoplay.
    console.warn('Load failed:', error);
    log('Press play to start');
  });
}

// Advanced suspend handling: free the decoder and DRM sessions while the
// app is in the background and reload the content on resume.
let savedPosition = 0;
let savedPaused = false;
let resuming = Promise.resolve();
document.addEventListener('visibilitychange', () => {
  log(`visibilitychange: ${document.hidden ? 'hidden' : 'visible'}`);
  if (mode !== 'release') {
    // pauseWhenInBackground handles it.
    return;
  }
  resuming = resuming.then(async () => {
    if (document.hidden) {
      savedPosition = player.getPosition() || 0;
      savedPaused = player.isPaused();
      await player.release();
      log(`Released at ${savedPosition.toFixed(1)} s`);
    } else {
      log(`Reopening at ${savedPosition.toFixed(1)} s`);
      await load(savedPosition, !savedPaused);
    }
  }).catch(error => console.warn('Suspend handling failed:', error));
});

// Remote control.
function togglePlayPause() {
  const action = player.isPaused() ? player.play() : player.pause();
  action.catch(error => console.warn('Play/pause failed:', error));
}

function seekBy(offset) {
  const position = Math.max(0, (player.getPosition() || 0) + offset);
  player.seek(position).catch(error => console.warn('Seek failed:', error));
}

// Tizen sends media keys to the app only after they are registered.
const MEDIA_KEYS = ['MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop',
  'MediaRewind', 'MediaFastForward'];
if (window.tizen?.tvinputdevice) {
  for (const key of MEDIA_KEYS) {
    try {
      window.tizen.tvinputdevice.registerKey(key);
    } catch (error) {
      console.warn(`Can't register ${key}:`, error);
    }
  }
}

// Older TV engines don't set event.key for remote keys, so map key codes
// (Tizen and webOS) to the standard key names.
const KEY_CODES = {
  10252: 'MediaPlayPause',
  415: 'MediaPlay',
  19: 'MediaPause',
  413: 'MediaStop',
  412: 'MediaRewind',
  417: 'MediaFastForward',
  10009: 'GoBack', // Tizen Return
  461: 'GoBack', // webOS Back
};

// Keys that a focused form control handles itself: Enter and Space click a
// button, and the arrow keys change a <select> or <input>.
function isHandledByFocusedControl (key) {
  const el = document.activeElement;
  if (el instanceof HTMLButtonElement) {
    return key === 'Enter' || key === ' ';
  }
  if (el instanceof HTMLSelectElement || el instanceof HTMLInputElement) {
    return key === 'Enter' || key === ' ' || key.startsWith('Arrow');
  }
  return false;
}

document.addEventListener('keydown', (event) => {
  const key = KEY_CODES[event.keyCode] || event.key;
  if (isHandledByFocusedControl(key)) {
    return;
  }
  switch (key) {
    case 'MediaPlayPause':
    case ' ':
    case 'Enter':
      togglePlayPause();
      break;
    case 'MediaPlay':
      player.play().catch(error => console.warn('Play failed:', error));
      break;
    case 'MediaPause':
    case 'MediaStop':
      player.pause().catch(error => console.warn('Pause failed:', error));
      break;
    case 'ArrowLeft':
    case 'MediaRewind':
      seekBy(-SEEK_STEP);
      break;
    case 'ArrowRight':
    case 'MediaFastForward':
      seekBy(SEEK_STEP);
      break;
    case 'GoBack':
      // A TV app usually goes back a screen or exits here, e.g. with
      // tizen.application.getCurrentApplication().exit() on Tizen.
      log('Back pressed');
      break;
    default:
      return;
  }
  log(`key: ${key === ' ' ? 'Space' : key}`);
  event.preventDefault();
});

// On-screen controls for a pointer, or the remote's OK button on a focused
// button.
document.getElementById('playPauseButton').addEventListener('click', togglePlayPause);
document.getElementById('rewindButton').addEventListener('click', () => seekBy(-SEEK_STEP));
document.getElementById('forwardButton').addEventListener('click', () => seekBy(SEEK_STEP));

log(`Suspend mode: ${mode}`);
load(0);
