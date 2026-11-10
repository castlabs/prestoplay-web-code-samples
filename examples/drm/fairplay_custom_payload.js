/**
 * Custom FairPlay key request: build the FairPlay key request payload with a
 * content ID from your own data instead of the playlist, and talk to a
 * license server with a JSON API. From the "Build a custom FairPlay key
 * request" section of the "Customizing license requests" manual page.
 * Modules: cl.mse, cl.hls
 * APIs: new clpp.drm.DrmEnvironment(name),
 *   environment.setDrmSystem(clpp.drm.KeySystem.FAIRPLAY, {licenseUrl,
 *   certificateUrl, modifiers: {transformInitData, licenseRequest,
 *   licenseResponse}}), clpp.drm.registerDrmEnvironment(),
 *   clpp.drm.eme.EmeFactory.Apis.APPLE, clpp.utils.FairplayUtils
 *   (extractContentId, createFairplayPayload), clpp.utils.BufferUtils.toUint8Array,
 *   clpp.utils.Uint8ArrayUtils (toStandardBase64, fromBase64),
 *   clpp.utils.strings.toUtf8, sessionContext.customData
 * Gotchas: FairPlay only works in Safari, with an HLS stream whose
 *   #EXT-X-KEY tag has an skd:// URI. transformInitData runs before the init
 *   data goes to the CDM; return the init data unchanged for anything that
 *   isn't FairPlay 'skd' init data on the Apple EME API. Values stored in
 *   sessionContext.customData (here the key ID) are available to the
 *   license modifiers of the same session. Throwing in a modifier fails the
 *   license request. Register the environment before the player.open() that
 *   uses it; registering the same name again replaces it. The license server
 *   must allow your auth header through CORS.
 * Page: fairplay_custom_payload.html provides #video, #log, #loadForm,
 *   #sourceUrl, #licenseUrl, #certificateUrl, #pid, #authorization
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.hls"

clpp.log.setLogLevel(clpp.log.Level.INFO);

const logEl = document.getElementById('log');
function log(message) {
  const item = document.createElement('li');
  item.textContent = `${new Date().toLocaleTimeString()} ${message}`;
  logEl.prepend(item);
}

const value = id => document.getElementById(id).value.trim();

// Your own data, e.g. fetched from your backend. Here it comes from the page.
function getVideoConfig() {
  return {
    // The content ID your license server knows the asset by.
    pid: value('pid'),
    authHeaders: {
      Authorization: value('authorization'),
    },
  };
}

function registerEnvironment(videoConfig) {
  const environment = new clpp.drm.DrmEnvironment('myDrmEnv');
  environment.setDrmSystem(clpp.drm.KeySystem.FAIRPLAY, {
    licenseUrl: value('licenseUrl'),
    certificateUrl: value('certificateUrl'),
    modifiers: {
      // Builds the payload that the CDM turns into the key request (SPC).
      transformInitData: ({
        initData,
        initDataType,
        drmInfo: {serverCertificate},
        sessionContext: {customData},
        emeApi,
      }) => {
        if (initDataType === 'skd' &&
            emeApi === clpp.drm.eme.EmeFactory.Apis.APPLE) {
          const {extractContentId, createFairplayPayload} =
            clpp.utils.FairplayUtils;

          // The host of the skd:// URI in the #EXT-X-KEY tag.
          customData.keyId = extractContentId(initData);
          // The payload with your content ID instead of the one from the
          // playlist.
          initData = createFairplayPayload(
            initData,
            videoConfig.pid,
            serverCertificate,
          );
          log(`transformInitData: payload for key ID ${customData.keyId}`);
        }
        return initData;
      },

      // Wraps the SPC in the JSON body your license server expects.
      licenseRequest: (config, request, {customData}) => {
        const {toUint8Array} = clpp.utils.BufferUtils;
        const {toStandardBase64} = clpp.utils.Uint8ArrayUtils;
        const {toUtf8} = clpp.utils.strings;

        const requestBody = {
          getFairplayLicense: {
            spcMessage: toStandardBase64(toUint8Array(request.body)),
            releasePid: videoConfig.pid,
            keyId: customData.keyId,
          },
        };
        Object.assign(request.headers, videoConfig.authHeaders);
        request.headers['Content-Type'] = 'application/json';
        request.body = toUtf8(JSON.stringify(requestBody)).buffer;
        log('licenseRequest: SPC sent in a JSON body');
      },

      // Unwraps the CKC (the license) from the JSON response.
      licenseResponse: (config, response, {customData}) => {
        const {fromBase64} = clpp.utils.Uint8ArrayUtils;

        let licenseResponse;
        try {
          licenseResponse = JSON.parse(new TextDecoder().decode(response.data));
        } catch (e) {
          throw new Error(
            `Can't parse the license response for key ID ${customData.keyId}: ${e}`,
          );
        }

        const {ckcResponse} = licenseResponse.getFairplayLicenseResponse;
        response.data = fromBase64(ckcResponse).buffer;
        log('licenseResponse: CKC unwrapped from JSON');
      },
    },
  });
  clpp.drm.registerDrmEnvironment(environment);
}

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

document.getElementById('loadForm').addEventListener('submit', (event) => {
  event.preventDefault();
  registerEnvironment(getVideoConfig());
  player.open({
    source: value('sourceUrl'),
    autoplay: true,
    muted: true,
    drm: {
      env: 'myDrmEnv',
    },
  }).catch((error) => {
    console.warn('Load failed:', error);
  });
});
