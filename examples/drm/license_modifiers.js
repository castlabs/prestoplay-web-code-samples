/**
 * Custom DRM environment with license modifiers: register your own DRM
 *   environment and adapt license requests and responses to a license
 *   server with license modifiers.
 * Modules: cl.mse, cl.dash
 * APIs: new clpp.drm.DrmEnvironment(name), environment.setDrmSystem(keySystem,
 *   {licenseUrl, certificateUrl, modifiers}), clpp.drm.registerDrmEnvironment(),
 *   clpp.drm.KeySystem (WIDEVINE, PLAYREADY, FAIRPLAY), modifiers
 *   (licenseRequest, licenseResponse, certificateRequest, extractContentId),
 *   sessionContext.customData, clpp.utils.strings.fromUtf8,
 *   clpp.utils.Uint8ArrayUtils.fromBase64, clpp.utils.FairplayUtils,
 *   player.open({drm: {env}})
 * Gotchas: a modifier changes the request or response in place and can
 *   return a Promise; the player waits for it. Each key system has its own
 *   modifiers. Register the environment before player.open() and give each
 *   environment a unique name. Use customData in sessionContext to pass data
 *   between modifiers of the same media session. A license server on another
 *   origin must allow custom headers through CORS. For DRMtoday or a server
 *   that only needs fixed headers, the built-in 'DRMtoday' and 'HeaderDrm'
 *   environments are simpler. DRM playback needs a secure context (HTTPS or
 *   localhost).
 * Page: license_modifiers.html provides #video, #log, #loadButton
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"

clpp.log.setLogLevel(clpp.log.Level.INFO);

const logEl = document.getElementById('log');
function log(message) {
  const item = document.createElement('li');
  item.textContent = `${new Date().toLocaleTimeString()} ${message}`;
  logEl.prepend(item);
}

// This sample talks to the DRMtoday demo license server directly instead of
// using the built-in 'DRMtoday' environment, so that the modifiers have
// something real to do. Replace the URLs and the modifier logic with what
// your license server needs.
const LICENSE_SERVER = 'https://lic-demo.staging.drmtoday.com';

// Stands in for a call to your own backend, which authorizes the user and
// returns the data the license server needs for this content.
async function fetchLicenseAuthorization() {
  await new Promise(resolve => setTimeout(resolve, 100));
  return {
    merchant: 'usp',
    userId: 'purchase',
    sessionId: 'default',
  };
}

// Runs before each license request. Async: the request waits until the
// authorization is available.
async function licenseRequest(config, request, sessionContext) {
  const authorization = await fetchLicenseAuthorization();
  // DRMtoday expects the authorization as Base64 encoded JSON in a header.
  // Your license server might want e.g. 'Authorization: Bearer <token>'.
  request.headers['dt-custom-data'] = btoa(JSON.stringify(authorization));

  // Data stored here is available to the other modifiers of this session.
  sessionContext.customData.requestedAt = Date.now();
  log(`License request to ${new URL(request.uris[0]).pathname}`);
}

// The DRMtoday Widevine proxy wraps the license in JSON:
// {"status": "OK", "license": "<Base64>"}. The CDM needs the raw license.
function unwrapJsonLicense(config, response, sessionContext) {
  const {fromUtf8} = clpp.utils.strings;
  const {fromBase64} = clpp.utils.Uint8ArrayUtils;
  const elapsed = Date.now() - sessionContext.customData.requestedAt;

  let body;
  try {
    body = JSON.parse(fromUtf8(response.data));
  } catch (e) {
    // Not JSON: the server sent the raw license, pass it on unchanged.
    log(`License response in ${elapsed} ms (raw)`);
    return;
  }
  if (body.status !== 'OK' || !body.license) {
    // The server answered with a JSON error. Throwing fails the license
    // request, and the player reports it as an error event.
    log(`License server error: ${JSON.stringify(body)}`);
    throw new Error(`License server returned status ${body.status}`);
  }
  response.data = fromBase64(body.license).buffer;
  log(`License response in ${elapsed} ms, unwrapped from JSON (status ${body.status})`);
}

// A custom DRM environment with one configuration per key system. The
// player picks the key system that the browser supports.
const environment = new clpp.drm.DrmEnvironment('sampleLicenseProxy');
environment.setDrmSystem(clpp.drm.KeySystem.WIDEVINE, {
  licenseUrl: `${LICENSE_SERVER}/license-proxy-widevine/cenc/`,
  modifiers: {
    licenseRequest,
    licenseResponse: unwrapJsonLicense,
  },
});
environment.setDrmSystem(clpp.drm.KeySystem.PLAYREADY, {
  licenseUrl: `${LICENSE_SERVER}/license-proxy-headerauth/drmtoday/RightsManager.asmx`,
  modifiers: {
    // The PlayReady license comes back raw, so no response modifier.
    licenseRequest,
  },
});
clpp.drm.registerDrmEnvironment(environment);

// A second environment, for FairPlay (HLS on Safari). Each environment needs
// a unique name; select one with drm.env in player.open(). Not used by the
// DASH stream below.
// TODO: Replace with the URLs of your FairPlay license server.
const fairPlayEnvironment = new clpp.drm.DrmEnvironment('sampleFairPlay');
fairPlayEnvironment.setDrmSystem(clpp.drm.KeySystem.FAIRPLAY, {
  licenseUrl: 'https://license.example.com/fairplay',
  certificateUrl: 'https://license.example.com/fairplay.cer',
  modifiers: {
    // Headers for the FairPlay certificate request.
    certificateRequest: (config, request) => {
      request.headers['Authorization'] = 'Bearer TODO';
    },
    licenseRequest,
    // By default the content ID is the host of the skd:// URI in the
    // #EXT-X-KEY tag, e.g. 'd192ebad-5097' for skd://d192ebad-5097. Return
    // a different value if your server expects one, here 'd192ebad'.
    extractContentId: (config, initData) => {
      const contentId = clpp.utils.FairplayUtils.extractContentId(initData);
      return contentId.split('-')[0];
    },
  },
});
clpp.drm.registerDrmEnvironment(fairPlayEnvironment);

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

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
      // The name of the custom DRM environment.
      env: 'sampleLicenseProxy',
    },
  }).catch((error) => {
    console.warn('Load failed:', error);
  });
});
