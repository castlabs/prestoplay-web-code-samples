/**
 * Low-latency live: play a live DASH stream as close to the live edge as
 *   possible and show the latency.
 * Modules: cl.mse, cl.dash
 * APIs: player.open({lowLatencyMode, suggestedPresentationDelay,
 *   streaming: {bufferingGoal, rebufferingGoal, bufferBehind,
 *   enableLiveEdgeChasing, startChasingAt, stopChasingAt},
 *   manifest: {clockSyncUri, autoCorrectDrift}}),
 *   player.getPresentationStartTime(),
 *   player.getSeekRange(), player.getPlaybackRate()
 * Gotchas: lowLatencyMode is experimental. Live edge chasing raises the
 *   playback rate when the player falls behind by more than
 *   startChasingAt seconds and stops at stopChasingAt. The latency is only
 *   accurate when the device clock is in sync; clockSyncUri is used when
 *   the manifest has no UTCTiming element (the player reads the HTTP Date
 *   header of its response).
 * Page: low_latency.html provides #video, #latency, #bufferAhead,
 *   #playbackRate, #liveEdgeButton
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"

clpp.log.setLogLevel(clpp.log.Level.INFO);

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

const latencyEl = document.getElementById('latency');
const bufferAheadEl = document.getElementById('bufferAhead');
const playbackRateEl = document.getElementById('playbackRate');

// Wall-clock time (in seconds) of position 0 of the live stream.
let presentationStartTime = null;

function updateStats() {
  if (presentationStartTime === null) {
    return;
  }
  const position = player.getPosition();
  // The latency is the difference between now and the wall-clock time of
  // the frame that is playing.
  const latency = Date.now() / 1000 - (presentationStartTime + position);
  const buffered = videoEl.buffered;
  const bufferEnd = buffered.length > 0 ? buffered.end(buffered.length - 1) : position;

  latencyEl.textContent = `${latency.toFixed(2)} s`;
  bufferAheadEl.textContent = `${(bufferEnd - position).toFixed(2)} s`;
  playbackRateEl.textContent = player.getPlaybackRate().toFixed(2);
}

setInterval(updateStats, 100);

document.getElementById('liveEdgeButton').addEventListener('click', () => {
  player.setPosition(player.getSeekRange().end).catch((error) => {
    console.warn('Seek failed:', error);
  });
});

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
  }
});

player.open({
  source: 'https://usp-demo.castlabs.com/live/channel1/channel1.isml/channel1.mpd',
  autoplay: true,
  muted: true,
  lowLatencyMode: true,
  // Target distance from the live edge, in seconds.
  suggestedPresentationDelay: 0,
  streaming: {
    bufferingGoal: 30,
    rebufferingGoal: 0,
    bufferBehind: 60,
    // Speed up playback when the player falls behind the live edge.
    enableLiveEdgeChasing: true,
    startChasingAt: 3,
    stopChasingAt: 1,
  },
  manifest: {
    // Time source, used when the manifest has no UTCTiming element.
    clockSyncUri: 'https://time.akamai.com/?iso',
    // Trust availabilityStartTime instead of deriving the live edge from
    // the segments.
    autoCorrectDrift: false,
  },
}).then(() => {
  presentationStartTime = player.getPresentationStartTime();
}).catch((error) => {
  console.warn('Load failed:', error);
});
