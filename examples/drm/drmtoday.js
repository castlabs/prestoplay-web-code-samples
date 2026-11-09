/**
 * DRMtoday playback: play a DRM-protected DASH stream with licenses from
 *   castLabs DRMtoday.
 * Modules: cl.mse, cl.dash
 * APIs: player.open({drm: {env, customData: {merchant, userId, sessionId}}}),
 *   clpp.events.DRM_SESSION_CREATED, clpp.events.DRM_LICENSE_REQUESTED
 * Gotchas: env selects the DRMtoday environment: 'DRMtoday' (production),
 *   'DRMtoday_STAGING' or 'DRMtoday_DEMO'. The player picks the key system
 *   (Widevine, PlayReady or FairPlay) the browser supports. DRM playback
 *   needs a secure context (HTTPS or localhost).
 * Page: drmtoday.html provides #video, #log, #loadButton
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"

clpp.log.setLogLevel(clpp.log.Level.INFO);

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

const logEl = document.getElementById('log');
function log(message) {
  const item = document.createElement('li');
  item.textContent = `${new Date().toLocaleTimeString()} ${message}`;
  logEl.prepend(item);
}

player.on(clpp.events.DRM_SESSION_CREATED, () => {
  log('DRM_SESSION_CREATED');
});

player.on(clpp.events.DRM_LICENSE_REQUESTED, () => {
  log('DRM_LICENSE_REQUESTED');
});

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
    log(`Error ${error.code}`);
  }
});

document.getElementById('loadButton').addEventListener('click', () => {
  player.open({
    // A live stream from the Unified Streaming demo with frequent key
    // rotation. Each key change triggers a new license request.
    source: 'https://live.unified-streaming.com/hfkr/hfkr.isml/.mpd',
    autoplay: true,
    muted: true,
    drm: {
      // The DRMtoday environment that issues the licenses.
      env: 'DRMtoday_DEMO',
      // DRMtoday custom data. Replace these values with the ones for your
      // DRMtoday merchant. In production, the backend that authorizes the
      // user usually provides them, together with an upfront authToken.
      customData: {
        merchant: 'usp',
        userId: 'purchase',
        sessionId: 'default',
        // authToken: '...',
      },
    },
  }).catch((error) => {
    console.warn('Load failed:', error);
  });
});
