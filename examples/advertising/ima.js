/**
 * Google IMA ads: client-side pre-, mid- and post-roll ads from a VMAP tag.
 * Modules: cl.mse, cl.dash, cl.ima
 * External: Google IMA SDK (ima3.js, global script, load before the SDK)
 * APIs: player.open({ima: {adTagUrl}}), clpp.events.ADS_TIMELINE_CHANGED,
 *   clpp.events.AD_* events, clpp.ads.IAd, clpp.ads.PodType
 * Gotchas: the ad tag goes in open(), not in the player config; the correlator
 *   must be unique per ad request; ad blockers stop the IMA SDK from loading.
 * Page: ima.html provides #video, #adLog, #loadButton, #sourceUrl
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.ima"

// Google's public VMAP sample ad tag with a pre-roll, a mid-roll pod, and
// a post-roll. Replace it with your own ad tag.
const AD_TAG_URL = 'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&' +
  'iu=/124319096/external/ad_rule_samples&ciu_szs=300x250&ad_rule=1&' +
  'impl=s&gdfp_req=1&env=vp&output=vmap&unviewed_position_start=1&' +
  'cust_params=deployment%3Ddevsite%26sample_ar%3Dpremidpostpod&cmsid=496&' +
  'vid=short_onecue&correlator=';

clpp.log.setLogLevel(clpp.log.Level.INFO);

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

// Log ad events to the page so the ad lifecycle is easy to follow.
const logEl = document.getElementById('adLog');

function log (eventName, detail = '') {
  const li = document.createElement('li');
  li.innerHTML = '<span class="event"></span> <span class="detail"></span>';
  li.querySelector('.event').textContent = eventName;
  li.querySelector('.detail').textContent = detail;
  logEl.prepend(li);
}

const POD_TYPE_NAMES = {
  [clpp.ads.PodType.PREROLL]: 'pre-roll',
  [clpp.ads.PodType.MIDROLL]: 'mid-roll',
  [clpp.ads.PodType.POSTROLL]: 'post-roll',
};

// Describe an ad using the clpp.ads.IAd interface.
function describeAd (ad) {
  if (!ad) {
    return '';
  }
  return `${POD_TYPE_NAMES[ad.getPodType()]}, ${ad.getDuration()} s, ` +
    `${ad.getMediaWidth()}×${ad.getMediaHeight()}, id ${ad.getId()}, ` +
    `${ad.getAdManagerName()} ${ad.getAdManagerVersion()}`;
}

player.on(clpp.events.ADS_TIMELINE_CHANGED, (event) => {
  // Cue points are in seconds; IMA reports a post-roll as -1.
  const cuePoints = event.adsTimeline.getCuePoints()
    .map(time => time === -1 ? 'post-roll' : `${time} s`);
  log('ads-timeline-changed', `cue points: ${cuePoints.join(', ')}`);
});

player.on(clpp.events.AD_STARTED, (event) => log('ad-started', describeAd(event.ad)));

for (const eventName of [
  clpp.events.AD_BREAK_STARTED,
  clpp.events.AD_FIRST_QUARTILE,
  clpp.events.AD_MIDPOINT,
  clpp.events.AD_THIRD_QUARTILE,
  clpp.events.AD_SKIPPED,
  clpp.events.AD_CLICKED,
  clpp.events.AD_COMPLETED,
  clpp.events.AD_BREAK_STOPPED,
]) {
  player.on(eventName, () => log(eventName));
}

document.getElementById('loadButton').addEventListener('click', () => {
  logEl.replaceChildren();
  player.open({
    source: document.getElementById('sourceUrl').value,
    autoplay: true,
    ima: {
      // The correlator must be unique for each ad request.
      adTagUrl: AD_TAG_URL + Date.now(),
    },
  });
});

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
  }
});
