/**
 * Conviva analytics: DASH playback reported to Conviva.
 * Modules: cl.mse, cl.dash, cl.conviva
 * External: Conviva Core SDK >= 4.0.3 (global script; provided by Conviva, not
 *   on npm)
 * APIs: player config `conviva: {customerKey, serviceUrl, viewerId, playerName,
 *   customTags, enableAdInsights}`, open({source: {url, type, name}})
 * Gotchas: customerKey and serviceUrl are TODO placeholders; serviceUrl is the
 *   test gateway and is omitted in production; source.name is reported as the
 *   asset name.
 * Page: conviva.html provides #video, #sourceUrl, #loadButton
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
const player = new clpp.Player(videoEl, {
  conviva: {
    // Fill in the customer key and gateway URL from your Conviva account.
    customerKey: 'TODO',
    // Use the test gateway URL during development. Omit it in production.
    serviceUrl: 'https://TODO.testonly.conviva.com',
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

const sourceUrlEl = document.getElementById('sourceUrl');

document.getElementById('loadButton').addEventListener('click', () => {
  player.open({
    source: {
      url: sourceUrlEl.value,
      type: clpp.Type.DASH,
      // Reported as the asset name by the integration.
      name: defaultSource.name
    },
    autoplay: true,
  });
});

player.on('error', event => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
  }
});
