/**
 * Multiple DRM environments: play assets whose licenses come from different
 * DRM providers in the same player, e.g. your own content protected with
 * DRMtoday and partner content protected by another license server.
 * Modules: cl.mse, cl.dash, cl.hls
 * APIs: player.open({source, drm: {env, customData}}) once per asset, with
 *   env 'DRMtoday' / 'DRMtoday_STAGING' (customData: {merchant, userId,
 *   sessionId}) and env 'HeaderDrm' (customData: {widevineLicenseUrl,
 *   playReadyLicenseUrl, fairPlayLicenseUrl, fairPlayCertificateUrl,
 *   headers}), clpp.events.DRM_SESSION_CREATED,
 *   clpp.events.DRM_LICENSE_REQUESTED
 * Gotchas: the DRM config belongs to each open() call, not to the player,
 *   so keep it next to the asset it protects and pass it on every load.
 *   Each open() releases the previous asset and its DRM sessions. Built-in
 *   environments need no registration; a custom one must be registered
 *   with clpp.drm.registerDrmEnvironment() before the open() that uses it.
 *   DRM playback needs a secure context (HTTPS or localhost).
 * Page: multiple_environments.html provides #video, #log, #assetForm1,
 *   #assetForm2 and the inputs named in readAssets()
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.hls"

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

player.on(clpp.events.DRM_SESSION_CREATED, () => log('DRM_SESSION_CREATED'));
player.on(clpp.events.DRM_LICENSE_REQUESTED, () => log('DRM_LICENSE_REQUESTED'));
player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
    log(`Error ${error.code}`);
  }
});

const value = id => document.getElementById(id).value.trim() || undefined;

// Your catalog: each asset carries the DRM config of its provider. In an
// app this usually comes from your backend together with the stream URL.
// Here it is read from the page.
function readAssets() {
  return {
    // Asset 1: licenses from DRMtoday.
    drmtoday: {
      title: 'Asset 1 (DRMtoday)',
      source: value('source1'),
      drm: {
        // 'DRMtoday' (production) or 'DRMtoday_STAGING'.
        env: value('env1'),
        customData: {
          merchant: value('merchant1'),
          userId: value('userId1'),
          sessionId: value('sessionId1'),
        },
      },
    },
    // Asset 2: licenses from another license server that authorizes
    // requests with HTTP headers.
    headerDrm: {
      title: 'Asset 2 (HeaderDrm)',
      source: value('source2'),
      drm: {
        env: 'HeaderDrm',
        customData: {
          // Only the URLs for the key systems you use are needed.
          widevineLicenseUrl: value('widevineLicenseUrl2'),
          playReadyLicenseUrl: value('playReadyLicenseUrl2'),
          fairPlayLicenseUrl: value('fairPlayLicenseUrl2'),
          fairPlayCertificateUrl: value('fairPlayCertificateUrl2'),
          // Sent with every license (and FairPlay certificate) request.
          headers: value('headerName2')
            ? {[value('headerName2')]: value('headerValue2') ?? ''}
            : {},
        },
      },
    },
  };
}

async function play(asset) {
  log(`Loading ${asset.title} with env '${asset.drm.env}'`);
  try {
    // The drm config of this asset replaces the one of the previous load.
    await player.open({
      source: asset.source,
      autoplay: true,
      muted: true,
      drm: asset.drm,
    });
  } catch (error) {
    console.warn('Load failed:', error);
  }
}

document.getElementById('assetForm1').addEventListener('submit', (event) => {
  event.preventDefault();
  play(readAssets().drmtoday);
});

document.getElementById('assetForm2').addEventListener('submit', (event) => {
  event.preventDefault();
  play(readAssets().headerDrm);
});
