/**
 * DRMtoday Onboard: play a DRM-protected DASH stream with licenses from a
 * DRMtoday Onboard server, the offline DRMtoday that runs in a private
 * network without internet access (e.g. on a plane, train, bus or ship).
 * Modules: cl.mse, cl.dash, cl.onboard
 * APIs: player.open({drm: {env: 'DRMtodayOnboard', customData: {baseUrl,
 *   widevineUrl, playreadyUrl, fairplayUrl, serverCertificate}}}),
 *   clpp.events.DRM_SESSION_CREATED, clpp.events.DRM_LICENSE_REQUESTED
 * Gotchas: importing cl.onboard is required; on each load whose drm config
 *   has customData.baseUrl, it registers the environment named in drm.env.
 *   Use the name 'DRMtodayOnboard' so it doesn't clash with a built-in
 *   environment. The license paths are appended to baseUrl
 *   unless they are absolute URLs. Without serverCertificate the SDK uses its
 *   built-in Widevine certificate; null fetches it from the license server.
 *   DRM playback needs a secure context (HTTPS or localhost).
 * Page: onboard.html provides #video, #log, #loadForm, #sourceUrl, #baseUrl
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.onboard"

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

document.getElementById('loadForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const baseUrl = document.getElementById('baseUrl').value.trim();
  log(`Loading with licenses from ${baseUrl}`);

  player.open({
    // Your stream, protected with keys that your Onboard server has.
    source: document.getElementById('sourceUrl').value.trim(),
    autoplay: true,
    muted: true,
    drm: {
      // The name to register the Onboard environment under.
      env: 'DRMtodayOnboard',
      customData: {
        // The URL of your Onboard server in the local network.
        baseUrl,
        // License paths, relative to baseUrl or absolute. These are the
        // defaults.
        widevineUrl: 'widevine',
        playreadyUrl: 'playready',
        fairplayUrl: 'fairplay',
        // Widevine server certificate:
        // - leave it out to use the certificate built into the SDK,
        // - null to fetch it from the Widevine license URL,
        // - a name from clpp.drm.DrmToday.WidevineCertificates, e.g. 'V2',
        // - or the certificate as a Uint8Array.
        // serverCertificate: null,
      },
    },
  }).catch((error) => {
    console.warn('Load failed:', error);
  });
});
