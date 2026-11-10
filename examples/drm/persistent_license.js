/**
 * Persistent license: store a DRM license on the device, reuse it on the
 *   next load, and remove it.
 * Modules: cl.mse, cl.dash, cl.crypto, cl.persistent
 * APIs: player.open({drm: {env, customData, offlineId}}),
 *   clpp.events.DRM_SESSION_PERSISTED, clpp.persistent.removeLicense(offlineId)
 * Gotchas: the license server must issue a persistent license (in
 *   DRMtoday, the license policy must allow storing the license). Only
 *   some key systems and browsers support persistent licenses, e.g.
 *   Widevine on Chrome desktop. offlineId is your own key for the stored
 *   license, usually derived from the content ID.
 * Page: persistent_license.html provides #video, #log, #loadForm, #sourceUrl,
 *   #env, #merchant, #userId, #sessionId, #removeButton
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.crypto"
import "@castlabs/prestoplay/cl.persistent"

clpp.log.setLogLevel(clpp.log.Level.INFO);

// The key under which the player stores the license.
const OFFLINE_ID = 'my-content-id';

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

const logEl = document.getElementById('log');
function log(message) {
  const item = document.createElement('li');
  item.textContent = `${new Date().toLocaleTimeString()} ${message}`;
  logEl.prepend(item);
}

player.on(clpp.events.DRM_LICENSE_REQUESTED, () => {
  log('DRM_LICENSE_REQUESTED');
});

player.on(clpp.events.DRM_SESSION_PERSISTED, () => {
  log(`DRM_SESSION_PERSISTED: license stored under "${OFFLINE_ID}"`);
});

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
    log(`Error ${error.code}`);
  }
});

const value = id => document.getElementById(id).value.trim();

document.getElementById('loadForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await player.open({
      // Your stream, protected with keys stored in your DRMtoday account.
      source: value('sourceUrl'),
      autoplay: true,
      muted: true,
      drm: {
        // 'DRMtoday' (production) or 'DRMtoday_STAGING'.
        env: value('env'),
        // DRMtoday custom data of your merchant. The license policy must
        // allow persistent licenses.
        customData: {
          merchant: value('merchant'),
          userId: value('userId') || undefined,
          sessionId: value('sessionId') || undefined,
        },
        // Setting offlineId turns on persistent licenses. On the next
        // load with the same offlineId, the player uses the stored
        // license instead of requesting a new one.
        offlineId: OFFLINE_ID,
      },
    });
    log('Loaded');
  } catch (error) {
    console.warn('Load failed:', error);
  }
});

document.getElementById('removeButton').addEventListener('click', async () => {
  try {
    // Release the content first, so the stored session is not in use.
    await player.release();
    await clpp.persistent.removeLicense(OFFLINE_ID);
    log(`License "${OFFLINE_ID}" removed`);
  } catch (error) {
    console.warn('Remove failed:', error);
    log('Removing the license failed');
  }
});
