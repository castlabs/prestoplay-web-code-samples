/**
 * Fast channel zapping: switch between live DASH channels with the
 *   multi-controller playlist, which preloads the neighboring channels in
 *   their own player instances, and show the zap time.
 * Modules: cl.mse, cl.dash
 * APIs: new clpp.playlist.McPlaylist({anchorId, config, transition}),
 *   setItems(configs), setIndex(i), playFirst(), playNext(), playPrev(),
 *   hasNext(), hasPrev(), getCurrent(), getPrev(), getNext(),
 *   getCurrentPlayer(), destroy(), on('update'), on('error'),
 *   player.isPaused(), player.one('playing'),
 *   streaming: {bufferingGoal, rebufferingGoal, startAtSegmentBoundary,
 *   ignoreDrift}
 * Gotchas: McPlaylist is experimental and may change. It is in cl.core, so
 *   no extra module is needed. It creates its own <video> elements inside
 *   the anchor element (one for the current channel and one for each
 *   preloaded neighbor) and shows the active one. Only the next and the
 *   previous channel are preloaded, so it can only step to a neighbor
 *   (there is no goTo()). setItems() and setIndex() can be called only
 *   once. Every item needs autoplay: true. No plugins (e.g. analytics),
 *   no multi-period DASH and no discontinuous HLS. Keep bufferingGoal and
 *   rebufferingGoal below the segment duration for the fastest switch.
 *   Playback starts on a click, because browsers block autoplay with sound
 *   until the user interacts with the page.
 * Page: fast_zapping.html provides #video-anchor, #channels, #zapTime,
 *   #startButton, #previousButton, #nextButton
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"

clpp.log.setLogLevel(clpp.log.Level.INFO);

// Public live DASH test streams, all single-period.
const CHANNELS = [
  {name: 'castLabs demo channel', url: 'https://usp-demo.castlabs.com/live/channel1/channel1.isml/channel1.mpd'},
  {name: 'DASH-IF test pattern, 2 s segments', url: 'https://livesim2.dashif.org/livesim2/testpic_2s/Manifest.mpd'},
  {name: 'DASH-IF test pattern, 6 s segments', url: 'https://livesim2.dashif.org/livesim2/testpic_6s/Manifest.mpd'},
  {name: 'Unified Streaming SCTE-35', url: 'https://demo.unified-streaming.com/k8s/live/stable/scte35.isml/.mpd'},
];

const playlist = new clpp.playlist.McPlaylist({
  // The playlist adds its <video> elements to this element.
  anchorId: 'video-anchor',
  // The default configuration of every player instance in the playlist.
  config: {
    // license: '<your_license_key>', // TODO: needed outside localhost
    // viewerId: '<user_id>',
    streaming: {
      // Buffer less than one segment before playback starts, so a
      // preloaded channel is ready to play as early as possible.
      bufferingGoal: 1,
      rebufferingGoal: 1,
      // Start live playback at a segment start, so no partial segment has
      // to be downloaded and decoded first.
      startAtSegmentBoundary: true,
      ignoreDrift: true,
    },
  },
  // Pause the channel you leave. 'keep-playing' keeps it running.
  transition: 'pause',
});

// Each item is a player configuration, as player.open() would receive it.
playlist.setItems(CHANNELS.map(channel => ({
  source: {url: channel.url},
  autoplay: true,
})));
playlist.setIndex(0);

const channelsEl = document.getElementById('channels');
const zapTimeEl = document.getElementById('zapTime');
const startButton = document.getElementById('startButton');
const previousButton = document.getElementById('previousButton');
const nextButton = document.getElementById('nextButton');

let started = false;
let busy = false;

// Show which channel plays and which neighbors are preloaded.
function render () {
  const current = playlist.getCurrent();
  const states = new Map();
  for (const item of [playlist.getPrev(), playlist.getNext()]) {
    if (item) {
      // 'preloading', 'preloaded', 'preload-failed' or 'preload-aborted'
      states.set(item.index, item.state);
    }
  }
  channelsEl.replaceChildren(...CHANNELS.map((channel, index) => {
    const li = document.createElement('li');
    const isCurrent = current && current.index === index;
    li.classList.toggle('active', Boolean(isCurrent));
    const state = isCurrent ? 'playing' : (states.get(index) || '');
    li.innerHTML = `<span>${channel.name}</span><span class="state">${state}</span>`;
    return li;
  }));
  previousButton.disabled = !started || busy || !playlist.hasPrev();
  nextButton.disabled = !started || busy || !playlist.hasNext();
}

// Resolves when the player starts playing. Rejects after timeoutMs, so a
// channel that never starts doesn't block the zap controls.
function waitForPlaying (player, timeoutMs) {
  return new Promise((resolve, reject) => {
    const onPlaying = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      player.off('playing', onPlaying);
      reject(new Error(`Channel didn't start within ${timeoutMs} ms`));
    }, timeoutMs);
    player.one('playing', onPlaying);
  });
}

// Measure from the request to the first frame of the new channel.
async function zap (action) {
  if (busy) {
    return;
  }
  busy = true;
  render();
  const start = performance.now();
  try {
    await action();
    const player = playlist.getCurrentPlayer();
    if (player && player.isPaused()) {
      await waitForPlaying(player, 10000);
    }
    zapTimeEl.textContent = `${Math.round(performance.now() - start)} ms`;
  } catch (error) {
    console.warn('Zap failed:', error);
    zapTimeEl.textContent = 'failed';
  } finally {
    busy = false;
    render();
  }
}

// The playlist state changed, e.g. a neighbor finished preloading.
playlist.on('update', render);
// Errors of background players, e.g. a failed preload. The playlist
// retries a failed item when you switch to it.
playlist.on('error', (event) => {
  console.warn('Playlist error:', event.detail);
});

startButton.addEventListener('click', () => {
  startButton.hidden = true;
  started = true;
  zap(() => playlist.playFirst());
});
previousButton.addEventListener('click', () => zap(() => playlist.playPrev()));
nextButton.addEventListener('click', () => zap(() => playlist.playNext()));

// Up and down arrow keys move through the channel list, like on a TV remote.
document.addEventListener('keydown', (event) => {
  if (!started) {
    return;
  }
  if (event.key === 'ArrowUp' && playlist.hasPrev()) {
    event.preventDefault();
    zap(() => playlist.playPrev());
  } else if (event.key === 'ArrowDown' && playlist.hasNext()) {
    event.preventDefault();
    zap(() => playlist.playNext());
  }
});

// Release all player instances when the page goes away. Keep them when the
// page goes into the back/forward cache (persisted), so it still works
// when the user comes back.
window.addEventListener('pagehide', (event) => {
  if (!event.persisted) {
    playlist.destroy();
  }
});

render();
