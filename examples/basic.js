/**
 * Basic playback: load and play a DASH or HLS stream.
 * Modules: cl.mse, cl.dash, cl.hls
 * External: mux.js (global script, needed for HLS transmuxing)
 * APIs: new clpp.Player(), player.open({source, autoplay}), player.on('error')
 * Page: basic.html provides #video, #loadButton, #sourceUrl
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.hls"

clpp.log.setLogLevel(clpp.log.Level.INFO);

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

document.getElementById('loadButton').addEventListener('click', () => {
  player.open({
    source: document.getElementById('sourceUrl').value,
    autoplay: true,
    muted: true,
    preferredTextLanguage: 'en',
  });
});

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
  }
});
