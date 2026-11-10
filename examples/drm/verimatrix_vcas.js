/**
 * Verimatrix VCAS Ultra: play a DRM-protected DASH or HLS stream with
 * licenses from Verimatrix VCAS Ultra license servers.
 * Modules: cl.mse, cl.dash, cl.hls, cl.verimatrix
 * APIs: player.open({drm: {env: 'VerimatrixVCAS', customData: {deviceId,
 *   authenticator, widevineLicenseUrl, playReadyLicenseUrl,
 *   fairPlayLicenseUrl, fairPlayCertificateUrl, licenseRequestVuidLocation,
 *   httpHeaderNames, fairPlayAssetIdStrategy, fairPlaySiteId}}}),
 *   clpp.verimatrix.Vcas.LicenseRequestVuidLocation,
 *   clpp.verimatrix.Vcas.LicenseRequestHttpHeader,
 *   clpp.verimatrix.Vcas.FairPlayAssetIdStrategy,
 *   clpp.events.DRM_SESSION_CREATED, clpp.events.DRM_LICENSE_REQUESTED
 * Gotchas: importing cl.verimatrix is required; it registers the
 *   'VerimatrixVCAS' environment when drm.env has that name. deviceId is the
 *   device's Verimatrix unique identifier (VUID). By default the VUID and the
 *   authenticator go Base64 encoded into the license request's query
 *   string; with HTTP_HEADER they go into request headers instead, and the
 *   license server must allow those headers through CORS. The player picks
 *   the key system the browser supports (FairPlay with HLS on Safari). DRM
 *   playback needs a secure context (HTTPS or localhost).
 * Page: verimatrix_vcas.html provides #video, #log, #loadForm, #sourceUrl,
 *   #deviceId, #authenticator, #widevineLicenseUrl, #playReadyLicenseUrl,
 *   #fairPlayLicenseUrl, #fairPlayCertificateUrl, #vuidLocation
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.hls"
import "@castlabs/prestoplay/cl.verimatrix"

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
  const {Vcas} = clpp.verimatrix;

  player.open({
    // Your DASH or HLS stream protected with Verimatrix VCAS Ultra.
    source: value('sourceUrl'),
    autoplay: true,
    muted: true,
    drm: {
      env: Vcas.NAME, // 'VerimatrixVCAS'
      customData: {
        // The device's Verimatrix unique identifier (VUID).
        deviceId: value('deviceId'),
        // Optional token for authentication with your Subscriber
        // Management System (SMS).
        authenticator: value('authenticator') || undefined,

        // License servers. Only the ones for key systems you use are needed.
        widevineLicenseUrl: value('widevineLicenseUrl'),
        playReadyLicenseUrl: value('playReadyLicenseUrl'),
        fairPlayLicenseUrl: value('fairPlayLicenseUrl'),
        fairPlayCertificateUrl: value('fairPlayCertificateUrl'),

        // Where the VUID and authenticator go in the license request:
        // QUERY_STRING (default) or HTTP_HEADER.
        licenseRequestVuidLocation: value('vuidLocation') === 'header'
          ? Vcas.LicenseRequestVuidLocation.HTTP_HEADER
          : Vcas.LicenseRequestVuidLocation.QUERY_STRING,
        // With HTTP_HEADER, the header names your license server expects.
        // The defaults are 'DeviceId' and 'Authenticator'.
        // httpHeaderNames: {
        //   [Vcas.LicenseRequestHttpHeader.DEVICE_ID_HEADER]: 'X-Device-Id',
        //   [Vcas.LicenseRequestHttpHeader.AUTHENTICATOR_HEADER]: 'X-Authenticator',
        // },

        // How the FairPlay asset ID is built. KEYID (default) takes it from
        // the skd:// URI of the #EXT-X-KEY tag. CONTENTID_SITEID builds
        // 'r=<contentId>&s=<siteId>' and needs fairPlaySiteId.
        // fairPlayAssetIdStrategy: Vcas.FairPlayAssetIdStrategy.CONTENTID_SITEID,
        // fairPlaySiteId: 'your-site-id',
      },
    },
  }).catch((error) => {
    console.warn('Load failed:', error);
  });
});
