/**
 * Custom license server: use any license server that authorizes requests
 *   with HTTP headers, through the built-in 'HeaderDrm' environment.
 * Modules: cl.mse, cl.dash, cl.hls
 * External: mux.js (global script, needed for HLS transmuxing)
 * APIs: player.open({drm: {env: 'HeaderDrm', customData: {widevineLicenseUrl,
 *   playReadyLicenseUrl, fairPlayLicenseUrl, fairPlayCertificateUrl,
 *   fairPlayContentIdStrategy, headers}}}),
 *   clpp.drm.HeaderDrm.FairPlayContentIdStrategy
 * Gotchas: the headers are sent with every license request (and the
 *   FairPlay certificate request). Only set the URLs for the key systems
 *   you use. A license server on another origin must allow the custom
 *   headers through CORS. For a server that needs a different request
 *   format, register your own environment (clpp.drm.registerDrmEnvironment).
 * Page: header_drm.html provides #video, #loadButton
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.hls"

clpp.log.setLogLevel(clpp.log.Level.INFO);

// TODO: Replace with the protected stream and the license server of your
// DRM provider.
const SOURCE_URL = 'TODO: URL of a DRM-protected DASH or HLS stream';
const LICENSE_SERVER = {
  widevineLicenseUrl: 'TODO: Widevine license URL',
  playReadyLicenseUrl: 'TODO: PlayReady license URL',
  fairPlayLicenseUrl: 'TODO: FairPlay license URL',
  fairPlayCertificateUrl: 'TODO: FairPlay certificate URL',
};
// TODO: The headers your license server needs to authorize the request,
// e.g. a token that your backend issued for this user and content.
const LICENSE_HEADERS = {
  'Authorization': 'Bearer TODO',
};

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
  }
});

document.getElementById('loadButton').addEventListener('click', () => {
  player.open({
    source: {
      url: SOURCE_URL,
      drmProtected: true,
    },
    autoplay: true,
    muted: true,
    drm: {
      env: 'HeaderDrm',
      customData: {
        ...LICENSE_SERVER,
        // How to get the FairPlay content ID from the skd:// URL in the
        // HLS playlist: the full URL (FULL_SKD) or its host (HOSTNAME).
        fairPlayContentIdStrategy: clpp.drm.HeaderDrm.FairPlayContentIdStrategy.FULL_SKD,
        headers: LICENSE_HEADERS,
      },
    },
  }).catch((error) => {
    console.warn('Load failed:', error);
  });
});
