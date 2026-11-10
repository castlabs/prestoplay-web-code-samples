/**
 * Conviva analytics: DASH playback reported to Conviva.
 * Modules: cl.mse, cl.dash, cl.conviva
 * External: Conviva Core SDK >= 4.0.3 (global script; provided by Conviva, not
 *   on npm)
 * APIs: player config `conviva: {customerKey, serviceUrl, viewerId, playerName,
 *   customTags, enableAdInsights}`, open({source: {url, type, name}}),
 *   player.release()
 * Gotchas: The plugin reads its config when the player is created, so the
 *   player is created on Load with the customer key and gateway URL from the
 *   form, and the previous player is released first. serviceUrl is the test
 *   gateway and is omitted in production. customerKey and viewerId are
 *   required. source.name is reported as the asset name.
 * Page: conviva.html provides #video, #loadForm, #customerKey, #serviceUrl,
 *   #sourceUrl
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.conviva"

const defaultSource = {
  name: 'DASH VoD Clear',
  url: 'https://demo.cf.castlabs.com/media/prestodash/Manifest.mpd'
};

clpp.log.setLogLevel(clpp.log.Level.INFO);

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
let player = null;

function createPlayer({customerKey, serviceUrl}) {
  const newPlayer = new clpp.Player(videoEl, {
    conviva: {
      // The customer key from your Conviva account.
      customerKey,
      // Use the test gateway URL during development. Omit it in production.
      serviceUrl: serviceUrl || undefined,
      viewerId: 'example-viewer',
      playerName: 'PRESTOplay code samples',
      // Report additional metadata with every session.
      customTags: {
        page: 'code-samples',
      },
      // Set to true to also report client-side ads to Conviva Ad Insights.
      enableAdInsights: false,
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
  // Release the previous player, which also ends its Conviva session.
  await player?.release();
  // Controls stay hidden until there is something to play.
  videoEl.controls = true;
  player = createPlayer({
    customerKey: document.getElementById('customerKey').value.trim(),
    serviceUrl: document.getElementById('serviceUrl').value.trim(),
  });
  player.open({
    source: {
      url: document.getElementById('sourceUrl').value,
      type: clpp.Type.DASH,
      // Reported as the asset name by the integration.
      name: defaultSource.name
    },
    autoplay: true,
    muted: true,
  }).catch((error) => {
    console.warn('Load failed:', error);
  });
});
