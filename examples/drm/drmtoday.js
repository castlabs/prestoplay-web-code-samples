/**
 * DRMtoday playback: play a DRM-protected DASH stream with licenses from
 *   castLabs DRMtoday.
 * Modules: cl.mse, cl.dash
 * APIs: player.open({drm: {env, customData: {merchant, userId, sessionId,
 *   authToken}}}),
 *   clpp.events.DRM_SESSION_CREATED, clpp.events.DRM_LICENSE_REQUESTED
 * Gotchas: env selects the DRMtoday environment: 'DRMtoday' (production) or
 *   'DRMtoday_STAGING'. The stream must be encrypted with keys from the same
 *   merchant and environment. The player picks the key system
 *   (Widevine, PlayReady or FairPlay) the browser supports. DRM playback
 *   needs a secure context (HTTPS or localhost).
 * Page: drmtoday.html provides #video, #log, #loadForm, #sourceUrl, #env,
 *   #merchant, #userId, #sessionId, #authToken
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

const value = id => document.getElementById(id).value.trim();

document.getElementById('loadForm').addEventListener('submit', (event) => {
  event.preventDefault();
  player.open({
    // Your stream, protected with keys stored in your DRMtoday account.
    source: value('sourceUrl'),
    autoplay: true,
    muted: true,
    drm: {
      // The DRMtoday environment that issues the licenses:
      // 'DRMtoday' (production) or 'DRMtoday_STAGING'.
      env: value('env'),
      // DRMtoday custom data for your merchant. In production, the backend
      // that authorizes the user usually provides these values, together
      // with an upfront authToken.
      customData: {
        merchant: value('merchant'),
        userId: value('userId') || undefined,
        sessionId: value('sessionId') || undefined,
        authToken: value('authToken') || undefined,
      },
    },
  }).catch((error) => {
    console.warn('Load failed:', error);
  });
});
