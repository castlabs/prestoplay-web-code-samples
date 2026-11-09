/**
 * Mux Data analytics: DASH playback reported to Mux Data.
 * Modules: cl.mse, cl.dash, cl.muxdata
 * External: Mux core SDK (https://src.litix.io/core/4/mux.js, global script)
 * APIs: player config `muxdata: {envKey, muxOptionsOverride}`,
 *   player.getPlugin('mux').emit(eventName, data)
 * Gotchas: envKey is a TODO placeholder; this mux.js is Mux Data, not the
 *   mux.js transmuxer used for HLS.
 * Page: muxdata.html provides #video, #sourceUrl, #loadButton
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.muxdata"

const defaultSource = {
  name: 'DASH VoD Clear',
  url: 'https://demo.cf.castlabs.com/media/prestodash/Manifest.mpd'
};

clpp.log.setLogLevel(clpp.log.Level.INFO);

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, {
  muxdata: {
    // Follow the official guide to get the envKey:
    // https://www.mux.com/docs/guides/monitor-castlabs-prestoplay-web#mux-environment-key
    envKey: 'TODO',
    // Optional: override or extend the options passed to the Mux SDK.
    muxOptionsOverride: {
      // Logs Mux SDK activity to the browser console.
      debug: true,
      data: {
        player_name: 'PRESTOplay code samples',
        viewer_user_id: 'example-viewer',
        page_type: 'watchpage',
      },
      automaticErrorTracking: true,
      respectDoNotTrack: false,
    }
  }
}, { containerEl });

const sourceUrlEl = document.getElementById('sourceUrl');

document.getElementById('loadButton').addEventListener('click', () => {
  player.open({
    source: {
      url: sourceUrlEl.value,
      name: defaultSource.name
    },
    autoplay: true,
  });
});

// Expose a helper for manually sending custom Mux events through the
// PRESTOplay Mux plugin. This example uses the `hb` event to attach
// custom heartbeat metadata without interfering with built-in playback events.
// You can call it from the browser console, for example:
// emitCustomValueHb('custom_value', 'example')
window.emitCustomValueHb = (key, value) => {
  const mux = player.getPlugin('mux')
  const metaDataObj = {
    [key]: value
  }
  mux.emit('hb', metaDataObj)
}

player.on('error', event => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
  }
});
