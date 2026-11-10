/**
 * Live delay: control how far behind the live edge a live DASH or HLS
 *   stream plays.
 * Modules: cl.mse, cl.dash, cl.hls
 * External: mux.js (global script, needed for HLS transmuxing)
 * APIs: player.open({suggestedPresentationDelay, lowLatencyMode,
 *   streaming: {bufferingGoal, rebufferingGoal}}),
 *   player.getPresentationStartTime()
 * Gotchas: without suggestedPresentationDelay, the player uses the delay
 *   from the stream (DASH: suggestedPresentationDelay in the MPD, HLS:
 *   HOLD-BACK in EXT-X-SERVER-CONTROL, or 3 target durations). The
 *   buffering goal must be at least the delay, or the player cannot
 *   reach it. The stream's time-shift window must be longer than the
 *   delay, or the segments are gone (HTTP 410). The delay is measured
 *   from the live edge of the manifest; the latency to the device clock
 *   also includes the encoding and packaging delay of the stream.
 * Page: live_delay.html provides #video, #expected, #latency, #bufferAhead,
 *   #loadButton, #presetSelect
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.hls"

clpp.log.setLogLevel(clpp.log.Level.INFO);

const DASH_LIVE = 'https://livesim2.dashif.org/livesim2/tsbd_180/chunkdur_1/ato_7/testpic4_8s/Manifest300.mpd';
const HLS_LIVE = 'https://usp-demo.castlabs.com/live/channel1/channel1.isml/hls.m3u8';

const PRESETS = {
  dash_delay_60: {
    expected: '60 s (app)',
    config: {
      source: DASH_LIVE,
      suggestedPresentationDelay: 60,
      // Must exceed the delay, otherwise the player can't reach it.
      streaming: {bufferingGoal: 60, rebufferingGoal: 60},
    },
  },
  dash_low_latency: {
    expected: '~0 s',
    config: {
      source: DASH_LIVE,
      lowLatencyMode: true,
    },
  },
  hls_default: {
    expected: '18 s (stream)',
    config: {
      source: HLS_LIVE,
      streaming: {bufferingGoal: 20, rebufferingGoal: 20},
    },
  },
  hls_delay_60: {
    expected: '60 s (app)',
    config: {
      source: HLS_LIVE,
      suggestedPresentationDelay: 60,
      streaming: {bufferingGoal: 60, rebufferingGoal: 60},
    },
  },
};

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

const expectedEl = document.getElementById('expected');
const latencyEl = document.getElementById('latency');
const bufferAheadEl = document.getElementById('bufferAhead');

let presentationStartTime = null;

setInterval(() => {
  if (presentationStartTime === null) {
    return;
  }
  const position = player.getPosition();
  const latency = Date.now() / 1000 - (presentationStartTime + position);
  const buffered = videoEl.buffered;
  const bufferEnd = buffered.length > 0 ? buffered.end(buffered.length - 1) : position;
  latencyEl.textContent = `${latency.toFixed(1)} s`;
  bufferAheadEl.textContent = `${(bufferEnd - position).toFixed(1)} s`;
}, 250);

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
  }
});

document.getElementById('loadButton').addEventListener('click', async () => {
  const preset = PRESETS[document.getElementById('presetSelect').value];
  presentationStartTime = null;
  latencyEl.textContent = '--';
  bufferAheadEl.textContent = '--';
  expectedEl.textContent = preset.expected;

  try {
    await player.open({
      ...preset.config,
      autoplay: true,
      muted: true,
    });
    presentationStartTime = player.getPresentationStartTime();
  } catch (error) {
    console.warn('Load failed:', error);
  }
});
