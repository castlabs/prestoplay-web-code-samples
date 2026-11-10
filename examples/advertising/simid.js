/**
 * SIMID ads: interactive overlay ads (Secure Interactive Media Interface
 * Definition, IAB) shown on top of, or around, the main content. The
 * creatives here are L-banners: the video shrinks into a corner while the
 * banner fills the rest of the player.
 * Modules: cl.mse, cl.dash, cl.simid
 * APIs: player.open({simid: {creatives: [{url, startTime, duration, preload,
 *   adParameters}], style: {className}}}), clpp.events.SIMID_CREATIVE_STARTED,
 *   clpp.events.SIMID_CREATIVE_STOPPED
 * Gotchas: experimental, low-level API: the creatives and their times are
 *   configured by hand, there is no ad server or VAST parsing. startTime is
 *   on the content timeline in seconds. preload (default 5) is how many
 *   seconds before startTime the creative's iframe starts loading.
 *   adParameters must be a string, so JSON.stringify objects. The creative
 *   HTML must be served with CORS headers.
 * Page: simid.html provides #video, #adLog
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.simid"

clpp.log.setLogLevel(clpp.log.Level.INFO);

// castLabs demo SIMID creatives. Replace them with your own.
const CREATIVES_URL = 'https://players.castlabs.com/demos/simid-content-v2';

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

// Log SIMID events to the page.
const logEl = document.getElementById('adLog');

function log (eventName) {
  const li = document.createElement('li');
  li.innerHTML = '<span class="event"></span> <span class="detail"></span>';
  li.querySelector('.event').textContent = eventName;
  li.querySelector('.detail').textContent = `at ${player.getPosition().toFixed(1)} s`;
  logEl.prepend(li);
}

player.on(clpp.events.SIMID_CREATIVE_STARTED, () => log('SIMID_CREATIVE_STARTED'));
player.on(clpp.events.SIMID_CREATIVE_STOPPED, () => log('SIMID_CREATIVE_STOPPED'));

try {
  await player.open({
    source: 'https://content.players.castlabs.com/demos/clear-segmented/manifest.mpd',
    autoplay: true,
    muted: true,
    simid: {
      creatives: [
        {
          url: `${CREATIVES_URL}/l-banner-castlabs.html`,
          // Show the creative from 5 s to 10 s of the content.
          startTime: 5,
          duration: 5,
        },
        {
          url: `${CREATIVES_URL}/l-banner-webrtc.html`,
          startTime: 20,
          duration: 5,
          // Start loading the creative 2 s before it is shown (default 5 s).
          preload: 2,
          // Passed to the creative when it is initialized. Must be a string.
          // (This demo creative ignores it.)
          adParameters: JSON.stringify({campaign: 'webrtc', variant: 'b'}),
        },
        {
          url: `${CREATIVES_URL}/l-banner-sessions.html`,
          startTime: 30,
          duration: 5,
          preload: 2,
        },
      ],
    },
  });
} catch (error) {
  console.error('Error initializing player:', error);
}
