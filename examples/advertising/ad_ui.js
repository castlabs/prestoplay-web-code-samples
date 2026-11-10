/**
 * Ad UI: a custom player UI that reacts to ads, following the "Rendering UI"
 * section of the Advertising manual page: an ad label with the position in
 * the ad break and the time left, a play/pause button that stays correct
 * while ads play, seek and playback rate controls that are disabled when the
 * ad does not allow seeking, and a skip button for skippable ads.
 * Modules: cl.mse, cl.dash, cl.ima
 * External: Google IMA SDK (ima3.js, global script, load before the SDK)
 * APIs: clpp.events.AD_STARTED, AD_PROGRESS, AD_PAUSED, AD_RESUMED,
 *   AD_SKIPPED, AD_BREAK_STOPPED, clpp.ads.IAd (getPositionInSequence,
 *   getSequenceLength, getDuration, getPosition, canSeek,
 *   getSkipTimeOffset), player.isPaused(), player.getAdsManager() (skip,
 *   getPosition),
 *   player.setPosition(), player.setPlaybackRate()
 * Gotchas: player.isPaused() covers ads too, so re-render play/pause on
 *   play, pause, AD_STARTED, AD_PAUSED and AD_RESUMED. getSkipTimeOffset()
 *   is -1 for ads that can't be skipped. Read the time into the ad from
 *   player.getAdsManager().getPosition(): with IMA, IAd.getPosition()
 *   always returns 0. IMA ads never allow seeking
 *   (canSeek() is false). IMA draws its own ad UI over the video, including
 *   its own skip button, so this sample puts its controls below the video.
 *   Ad blockers stop the IMA SDK from loading.
 * Page: ad_ui.html provides #video, #adTag, #loadButton, #playButton,
 *   #seekBar, #time, #rateSelect, #skipButton, #adLabel
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.ima"

clpp.log.setLogLevel(clpp.log.Level.INFO);

// Google's public sample ad tags. Replace them with your own.
const AD_TAGS = {
  // A single skippable pre-roll (skippable after 5 s).
  skippable: 'https://pubads.g.doubleclick.net/gampad/ads?' +
    'iu=/21775744923/external/single_preroll_skippable&sz=640x480&' +
    'ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&' +
    'unviewed_position_start=1&env=vp&impl=s&correlator=',
  // VMAP with a pre-roll, a mid-roll pod of several ads, and a post-roll.
  pods: 'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&' +
    'iu=/124319096/external/ad_rule_samples&ciu_szs=300x250&ad_rule=1&' +
    'impl=s&gdfp_req=1&env=vp&output=vmap&unviewed_position_start=1&' +
    'cust_params=deployment%3Ddevsite%26sample_ar%3Dpremidpostpod&cmsid=496&' +
    'vid=short_onecue&correlator=',
};

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

const playButton = document.getElementById('playButton');
const seekBar = document.getElementById('seekBar');
const timeEl = document.getElementById('time');
const rateSelect = document.getElementById('rateSelect');
const skipButton = document.getElementById('skipButton');
const adLabel = document.getElementById('adLabel');

// The ad that is playing, or null during content.
let currentAd = null;

// Seconds into the current ad. Use the ads manager rather than
// currentAd.getPosition(): with IMA, IAd.getPosition() always returns 0.
function adPosition() {
  return Math.max(0, player.getAdsManager()?.getPosition() ?? 0);
}

// --- Ad label: "Ad 1 / 3 · 12 s" --------------------------------------------

function renderAdLabel() {
  if (!currentAd) {
    adLabel.hidden = true;
    return;
  }
  const position = currentAd.getPositionInSequence();
  const count = currentAd.getSequenceLength();
  const remaining = Math.max(0, Math.ceil(currentAd.getDuration() - adPosition()));
  adLabel.textContent = `Ad ${position} / ${count} · ${remaining} s`;
  adLabel.hidden = false;
}

// --- Play/pause -------------------------------------------------------------
// player.isPaused() also reflects the ad, so re-render whenever playback of
// the content or of an ad starts, pauses or resumes.

function renderPlayButton() {
  playButton.textContent = player.isPaused() ? 'Play' : 'Pause';
}

playButton.addEventListener('click', () => {
  if (player.isPaused()) {
    player.play();
  } else {
    player.pause();
  }
});

// --- Seek bar and playback rate ---------------------------------------------
// Disabled while an ad that doesn't allow seeking plays.

function renderSeekControls() {
  const seekEnabled = currentAd ? currentAd.canSeek() : true;
  seekBar.disabled = !seekEnabled;
  rateSelect.disabled = !seekEnabled;
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function renderTime() {
  const duration = player.getDuration();
  const position = player.getPosition();
  if (Number.isFinite(duration) && duration > 0 && !seekBar.matches(':active')) {
    seekBar.max = String(duration);
    seekBar.value = String(position);
  }
  timeEl.textContent = `${formatTime(position)} / ${formatTime(duration)}`;
}

seekBar.addEventListener('input', () => {
  player.setPosition(Number(seekBar.value));
});

rateSelect.addEventListener('change', () => {
  player.setPlaybackRate(Number(rateSelect.value));
});

videoEl.addEventListener('timeupdate', renderTime);
videoEl.addEventListener('durationchange', renderTime);

// --- Skip button ------------------------------------------------------------

function renderSkipButton() {
  if (!currentAd) {
    skipButton.hidden = true;
    return;
  }
  // Seconds of the ad before it can be skipped, or -1 if it can't be.
  const skipOffset = currentAd.getSkipTimeOffset();
  if (skipOffset === -1) {
    skipButton.hidden = true;
    return;
  }
  const remaining = skipOffset - adPosition();
  if (remaining <= 0) {
    skipButton.textContent = 'Skip ad';
    skipButton.disabled = false;
  } else {
    skipButton.textContent = `Skip in ${Math.ceil(remaining)} s`;
    skipButton.disabled = true;
  }
  skipButton.hidden = false;
}

skipButton.addEventListener('click', () => {
  player.getAdsManager().skip();
});

// --- Ad events --------------------------------------------------------------

function renderAll() {
  renderAdLabel();
  renderPlayButton();
  renderSeekControls();
  renderSkipButton();
}

player.on('play', renderPlayButton);
player.on('pause', renderPlayButton);

player.on(clpp.events.AD_STARTED, (event) => {
  currentAd = event.ad;
  renderAll();
});

player.on(clpp.events.AD_PROGRESS, () => {
  renderAdLabel();
  renderSkipButton();
});

player.on(clpp.events.AD_PAUSED, renderPlayButton);
player.on(clpp.events.AD_RESUMED, renderPlayButton);

// An ad that ends or is skipped. The next ad of the break, if any, fires
// AD_STARTED again.
for (const eventName of [clpp.events.AD_SKIPPED, clpp.events.AD_COMPLETED]) {
  player.on(eventName, () => {
    currentAd = null;
    renderAll();
  });
}

player.on(clpp.events.AD_BREAK_STOPPED, () => {
  currentAd = null;
  renderAll();
});

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
  }
});

// --- Load -------------------------------------------------------------------

document.getElementById('loadButton').addEventListener('click', () => {
  currentAd = null;
  renderAll();
  rateSelect.value = '1';
  player.open({
    source: 'https://demo.cf.castlabs.com/media/prestodash/Manifest.mpd',
    autoplay: true,
    muted: true,
    ima: {
      // The correlator must be unique for each ad request.
      adTagUrl: AD_TAGS[document.getElementById('adTag').value] + Date.now(),
    },
  }).catch((error) => {
    console.warn('Load failed:', error);
  });
});

renderAll();
