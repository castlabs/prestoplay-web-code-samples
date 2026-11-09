/**
 * Player events: listen to HTML5 media events and PRESTOplay events, listen
 *   once, and remove a listener.
 * Modules: cl.mse, cl.dash
 * APIs: player.on(name, fn), player.one(name, fn), player.off(name, fn),
 *   clpp.events.STATE_CHANGED (detail: previousState, currentState, reason),
 *   clpp.Player.State, clpp.events.LOAD_START, LOADEDMETADATA,
 *   BUFFERING_STARTED/BUFFERING_ENDED (detail: reason, bufferedTimeMS),
 *   clpp.events.BufferingReasons, TRACKS_ADDED, AUDIO_TRACK_CHANGED,
 *   TEXT_TRACK_CHANGED, VIDEO_TRACK_CHANGED (detail: abrSelection, width,
 *   height, bandwidth), BITRATE_CHANGED (detail: width, height, bandwidth),
 *   RELEASING, player.release()
 * Gotchas: Attach listeners right after creating the player, before
 *   player.open(), so no early event is missed. HTML5 media events use their
 *   regular names ('playing', 'timeupdate', ...). player.off() needs the same
 *   function reference that was passed to player.on() (on() also returns it).
 *   VIDEO_TRACK_CHANGED fires when a rendition is selected for download;
 *   BITRATE_CHANGED fires when a rendition is actually on screen.
 *   VIDEO_TRACK_CHANGED puts its data in event.details (not event.detail)
 *   in SDK 6.36.
 * Page: player_events.html provides #video, #log, #loadButton,
 *   #releaseButton, #timeupdateToggle
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"

clpp.log.setLogLevel(clpp.log.Level.INFO);

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

// Maps an enum value back to its name, e.g. 3 -> 'PLAYING'.
function enumName(enumObject, value) {
  return Object.keys(enumObject).find(key => enumObject[key] === value) ?? value;
}

function formatBandwidth(bandwidth) {
  return bandwidth ? `${Math.round(bandwidth / 1000)} kbps` : 'unknown bitrate';
}

// --- PRESTOplay events (clpp.events) ---------------------------------------

player.on(clpp.events.STATE_CHANGED, (event) => {
  const {previousState, currentState, reason} = event.detail;
  const from = enumName(clpp.Player.State, previousState);
  const to = enumName(clpp.Player.State, currentState);
  // reason is only meaningful for transitions into BUFFERING.
  const why = currentState === clpp.Player.State.BUFFERING && reason
    ? ` (${enumName(clpp.events.BufferingReasons, reason)})`
    : '';
  log('STATE_CHANGED', `${from} -> ${to}${why}`);
});

// clpp.events.LOAD_START has the same name as the HTML5 'loadstart' event
// ('loadstart'), so this listener can run more than once per load.
player.on(clpp.events.LOAD_START, () => {
  log('LOAD_START');
});

player.on(clpp.events.LOADEDMETADATA, () => {
  log('LOADEDMETADATA', `duration ${player.getDuration().toFixed(1)}s`);
});

player.on(clpp.events.BUFFERING_STARTED, (event) => {
  log('BUFFERING_STARTED', enumName(clpp.events.BufferingReasons, event.detail.reason));
});

player.on(clpp.events.BUFFERING_ENDED, (event) => {
  log('BUFFERING_ENDED', `after ${event.detail.bufferedTimeMS} ms`);
});

player.on(clpp.events.TRACKS_ADDED, () => {
  const trackManager = player.getTrackManager();
  log('TRACKS_ADDED',
    `${trackManager.getVideoTracks().length} video, ` +
    `${trackManager.getAudioTracks().length} audio, ` +
    `${trackManager.getTextTracks().length} text`);
});

player.on(clpp.events.AUDIO_TRACK_CHANGED, () => {
  const track = player.getTrackManager().getAudioTrack();
  log('AUDIO_TRACK_CHANGED', track ? `${track.language} ${track.label ?? ''}` : 'none');
});

player.on(clpp.events.TEXT_TRACK_CHANGED, () => {
  const track = player.getTrackManager().getTextTrack();
  log('TEXT_TRACK_CHANGED', track ? `${track.language} ${track.label ?? ''}` : 'off');
});

player.on(clpp.events.VIDEO_TRACK_CHANGED, (event) => {
  // In SDK 6.36 this event carries its data in `details`, not `detail`.
  const {abrSelection, width, height, bandwidth} = event.detail ?? event.details;
  log('VIDEO_TRACK_CHANGED',
    `${width}x${height} ${formatBandwidth(bandwidth)} ${abrSelection ? '(ABR)' : '(manual)'}`);
});

player.on(clpp.events.BITRATE_CHANGED, (event) => {
  const {width, height, bandwidth} = event.detail;
  log('BITRATE_CHANGED', `${width}x${height} ${formatBandwidth(bandwidth)}`);
});

player.on(clpp.events.RELEASING, () => {
  log('RELEASING');
});

player.on(clpp.events.ERROR, (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
    log('ERROR', `code ${error.code}`);
  }
});

// --- HTML5 media events ------------------------------------------------------

for (const name of ['play', 'pause', 'seeking', 'seeked', 'volumechange', 'ended']) {
  player.on(name, () => log(name));
}

// --- Listen once and remove a listener ---------------------------------------

// The 'timeupdate' listener is added and removed with the checkbox. Keep the
// function reference: player.off() needs the same function.
function onTimeUpdate() {
  log('timeupdate', `position ${player.getPosition().toFixed(2)}s`);
}

document.getElementById('timeupdateToggle').addEventListener('change', (event) => {
  if (event.target.checked) {
    player.on('timeupdate', onTimeUpdate);
  } else {
    player.off('timeupdate', onTimeUpdate);
  }
});

// Whether a player.one('playing') listener is still waiting. A load that
// never reaches 'playing' leaves it registered, so don't add a second one.
let waitingForFirstPlaying = false;

document.getElementById('loadButton').addEventListener('click', () => {
  // player.one() removes the listener after the first call, so this logs only
  // the first 'playing' event after a load.
  if (!waitingForFirstPlaying) {
    waitingForFirstPlaying = true;
    player.one('playing', () => {
      waitingForFirstPlaying = false;
      log('playing (once)', 'playback started');
    });
  }

  player.open({
    source: 'https://testcontent.castlabs.com/QA/tos_1080_clear/manifest.mpd',
    autoplay: true,
    muted: true,
  }).catch((error) => {
    console.warn('Load failed:', error);
  });
});

document.getElementById('releaseButton').addEventListener('click', () => {
  // Release unloads the content but keeps the player and its listeners, so the
  // same player can open new content.
  player.release().catch((error) => {
    console.warn('Release failed:', error);
  });
});
