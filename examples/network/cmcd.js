/**
 * CMCD: send Common Media Client Data (CTA-5004) with every media request,
 *   so the CDN can log and optimize the delivery.
 * Modules: cl.mse, cl.dash
 * APIs: player.open({cmcd: {enabled, contentId, sessionId, deliveryMode,
 *   rtpMultiplier}}), player.getNetworkEngine().addResponseModifier
 *   (used here only to show the data that was sent)
 * Gotchas: CMCD is off by default. deliveryMode 'query' adds a CMCD query
 *   parameter; 'headers' sends CMCD-* request headers, which trigger a
 *   CORS preflight that the CDN must allow. If sessionId is not set, the
 *   player generates one per session.
 * Page: cmcd.html provides #video, #log
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"

clpp.log.setLogLevel(clpp.log.Level.INFO);

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

const logEl = document.getElementById('log');

// Show the CMCD data of each request. response.uri is the URL that was
// requested, including the CMCD query parameter.
player.getNetworkEngine().addResponseModifier((response) => {
  const cmcd = new URL(response.uri).searchParams.get('CMCD');
  if (cmcd) {
    const item = document.createElement('li');
    item.textContent = cmcd;
    logEl.prepend(item);
  }
});

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
  }
});

player.open({
  source: 'https://testcontent.castlabs.com/QA/tos_1080_clear/manifest.mpd',
  autoplay: true,
  muted: true,
  cmcd: {
    enabled: true,
    // Identifies the content across sessions and devices (max. 64 chars).
    contentId: 'tears-of-steel',
    // 'query' adds a CMCD query parameter, 'headers' sends CMCD-* headers.
    deliveryMode: 'query',
  },
}).catch((error) => {
  console.warn('Load failed:', error);
});
