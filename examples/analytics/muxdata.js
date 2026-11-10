/**
 * Mux Data analytics: DASH playback reported to Mux Data.
 * Modules: cl.mse, cl.dash, cl.muxdata
 * External: Mux core SDK (https://src.litix.io/core/4/mux.js, global script)
 * APIs: player config `muxdata: {envKey, muxOptionsOverride}`,
 *   player.getPlugin('mux').emit(eventName, data), player.release()
 * Gotchas: The plugin reads its config when the player is created, so the
 *   player is created on Load with the environment key from the form, and
 *   the previous player is released first. envKey is required. This mux.js
 *   is Mux Data, not the mux.js transmuxer used for HLS.
 * Page: muxdata.html provides #video, #loadForm, #envKey, #sourceUrl
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
let player = null;

function createPlayer({envKey}) {
  const newPlayer = new clpp.Player(videoEl, {
    muxdata: {
      // The environment key from your Mux account, see
      // https://www.mux.com/docs/guides/monitor-castlabs-prestoplay-web#mux-environment-key
      envKey,
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

  newPlayer.on('error', event => {
    const error = event.detail;
    if (error) {
      console.warn('Error:', error);
    }
  });
  return newPlayer;
}

document.getElementById('loadForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  // Release the previous player, which also ends its Mux view.
  await player?.release();
  // Controls stay hidden until there is something to play.
  videoEl.controls = true;
  player = createPlayer({
    envKey: document.getElementById('envKey').value.trim(),
  });
  player.open({
    source: {
      url: document.getElementById('sourceUrl').value,
      name: defaultSource.name
    },
    autoplay: true,
    muted: true,
  }).catch((error) => {
    console.warn('Load failed:', error);
  });
});

// Expose a helper for manually sending custom Mux events through the
// PRESTOplay Mux plugin. This example uses the `hb` event to attach
// custom heartbeat metadata without interfering with built-in playback events.
// After loading a stream, call it from the browser console, for example:
// emitCustomValueHb('custom_value', 'example')
window.emitCustomValueHb = (key, value) => {
  const mux = player?.getPlugin('mux');
  if (!mux) {
    console.warn('Load a stream first.');
    return;
  }
  mux.emit('hb', {[key]: value});
}
