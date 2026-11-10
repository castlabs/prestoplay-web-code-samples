/**
 * Broadpeak: analytics and SSAI (server-side ad insertion) ad tracking for
 * streams delivered by a Broadpeak CDN, through Broadpeak SmartLib.
 * Modules: cl.mse, cl.dash, cl.broadpeak
 * External: Broadpeak SmartLib (global scripts base.smartlib.js,
 *   analytics.smartlib.js and ad.smartlib.js from
 *   @broadpeak/smartlib-all-compatibility, published on Broadpeak's own npm
 *   registry, see .npmrc). It defines the SmartLib, LoggerManager and
 *   StreamingSessionOptions globals.
 * APIs: player config `broadpeak: {broadpeakDomainNames, analyticsAddress,
 *   nanoCDNHost, uuid, customParameters, sessionOptions, adTracking,
 *   adParameters}`, clpp.events.AD_* events, clpp.ads.IAd,
 *   player.getAdsManager().skip(), player.release()
 * Gotchas: a Broadpeak session starts only for source URLs whose domain is
 *   in broadpeakDomainNames ("*" for all, "" for none); other sources play
 *   without Broadpeak. With "*", loading a source that is not on a Broadpeak
 *   CDN fails, because SmartLib requests a session from that server. The plugin rewrites the source URL to the session
 *   URL that SmartLib returns. The player is created on Load with the values
 *   from the form, and the previous player is released first, which ends
 *   its session. adTracking must be in the player config: the ads manager is
 *   chosen when the player is created. SSAI ads are part of the stream, so
 *   block seeking in your UI while an ad plays. Clicking the video during an
 *   ad with a click-through URL opens it and pauses playback.
 * Page: broadpeak.html provides #video, #loadForm, #sourceUrl,
 *   #domainNames, #analyticsAddress, #adTracking, #adOverlay, #adCount,
 *   #adCountdown, #skipButton, #adLog
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.broadpeak"

clpp.log.setLogLevel(clpp.log.Level.INFO);

// SmartLib logging: 0 = basic (sessions, errors), 1 = verbose (player
// events, metrics). Use 0 or remove this line in production.
// eslint-disable-next-line no-undef
LoggerManager.getInstance().setLogLevel(1);

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
let player = null;

function createPlayer({domainNames, analyticsAddress, adTracking}) {
  const newPlayer = new clpp.Player(videoEl, {
    broadpeak: {
      // Domains of your Broadpeak CDN, comma-separated. A session starts
      // only for sources on these domains. "*" means all domains.
      broadpeakDomainNames: domainNames,
      // Your Broadpeak analytics server. Leave empty to send no analytics.
      analyticsAddress: analyticsAddress || undefined,
      // Unique user ID reported with the session.
      uuid: 'example-user',
      // Key/value pairs whose meaning depends on your Broadpeak setup.
      customParameters: {},
      // SmartLib session options, keyed by the StreamingSessionOptions global:
      // sessionOptions: {
      //   [StreamingSessionOptions.GDPR_PREFERENCE]: StreamingSessionOptions.GDPR_CLEAR,
      //   [StreamingSessionOptions.SESSION_KEEPALIVE_FREQUENCY]: 5000,
      // },
      // Track SSAI ads and fire the clpp.events.AD_* events.
      adTracking,
      // Key/value pairs for personalizing SSAI ads. Their meaning depends
      // on your ad server setup.
      adParameters: {
        deviceType: 'desktop',
      },
    }
  }, { containerEl });

  newPlayer.on('error', event => {
    const error = event.detail;
    if (error) {
      console.warn('Error:', error);
    }
  });
  listenToAds(newPlayer);
  return newPlayer;
}

// --- Ad UI: overlay with the ad count and countdown, skip button, event log.

const adOverlayEl = document.getElementById('adOverlay');
const adCountEl = document.getElementById('adCount');
const adCountdownEl = document.getElementById('adCountdown');
const skipButtonEl = document.getElementById('skipButton');
const logEl = document.getElementById('adLog');

function log(eventName, detail = '') {
  const li = document.createElement('li');
  li.innerHTML = '<span class="event"></span> <span class="detail"></span>';
  li.querySelector('.event').textContent = eventName;
  li.querySelector('.detail').textContent = detail;
  logEl.prepend(li);
}

function showAd(ad) {
  const total = ad.getSequenceLength();
  adCountEl.textContent = total ? `Ad ${ad.getPositionInSequence()} of ${total}` : 'Ad';
  adOverlayEl.hidden = false;
  // Seeking is not allowed during SSAI ads.
  videoEl.controls = false;
  updateAd(ad);
}

function updateAd(ad) {
  const remaining = Math.max(0, Math.ceil(ad.getDuration() - ad.getPosition()));
  adCountdownEl.textContent = `${remaining} s`;

  // -1 means the ad can't be skipped.
  const skipOffset = ad.getSkipTimeOffset();
  if (skipOffset === -1) {
    skipButtonEl.hidden = true;
    return;
  }
  const untilSkip = Math.ceil(skipOffset - ad.getPosition());
  skipButtonEl.hidden = false;
  skipButtonEl.disabled = untilSkip > 0;
  skipButtonEl.textContent = untilSkip > 0 ? `Skip in ${untilSkip} s` : 'Skip ad';
}

function hideAd() {
  adOverlayEl.hidden = true;
  skipButtonEl.hidden = true;
  videoEl.controls = true;
}

function listenToAds(p) {
  p.on(clpp.events.AD_BREAK_STARTED, () => log('AD_BREAK_STARTED'));
  p.on(clpp.events.AD_STARTED, ({ad}) => {
    log('AD_STARTED', `${ad.getTitle() || ad.getId()}, ${ad.getDuration()} s`);
    showAd(ad);
  });
  p.on(clpp.events.AD_PROGRESS, ({ad}) => updateAd(ad));
  p.on(clpp.events.AD_FIRST_QUARTILE, () => log('AD_FIRST_QUARTILE'));
  p.on(clpp.events.AD_MIDPOINT, () => log('AD_MIDPOINT'));
  p.on(clpp.events.AD_THIRD_QUARTILE, () => log('AD_THIRD_QUARTILE'));
  p.on(clpp.events.AD_CLICKED, ({ad}) => log('AD_CLICKED', ad.getClickThroughUrl()));
  p.on(clpp.events.AD_SKIPPED, () => {
    log('AD_SKIPPED');
    hideAd();
  });
  p.on(clpp.events.AD_COMPLETED, () => {
    log('AD_COMPLETED');
    hideAd();
  });
  p.on(clpp.events.AD_BREAK_STOPPED, () => {
    log('AD_BREAK_STOPPED');
    hideAd();
  });
}

skipButtonEl.addEventListener('click', () => {
  // Skips the current ad once its skip offset has passed.
  player?.getAdsManager().skip();
});

// --- Load

document.getElementById('loadForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  hideAd();
  logEl.replaceChildren();
  // Release the previous player, which also ends its Broadpeak session.
  await player?.release();
  player = createPlayer({
    domainNames: document.getElementById('domainNames').value.trim(),
    analyticsAddress: document.getElementById('analyticsAddress').value.trim(),
    adTracking: document.getElementById('adTracking').checked,
  });
  player.open({
    source: document.getElementById('sourceUrl').value.trim(),
    autoplay: true,
    muted: true,
  }).catch((error) => {
    console.warn('Load failed:', error);
  });
});
