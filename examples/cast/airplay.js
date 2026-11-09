/**
 * AirPlay: play HLS content on an AirPlay device (Apple TV, smart TV) from
 *   Safari.
 * Modules: cl.mse, cl.hls, cl.airplay
 * External: mux.js (global script, needed for HLS transmuxing in other
 *   browsers)
 * APIs: player.open({streaming: {preferNativeHlsOnSafari: true}}),
 *   player.getPlugin(clpp.airplay.AirPlayPlugin.Id).showCastMenu(),
 *   clpp.events.AIRPLAY_STATUS_CHANGED (event.canCast),
 *   AIRPLAY_CASTING_STARTED, AIRPLAY_CASTING_ENDED,
 *   player.setDrmCustomDataModifier()
 * Gotchas: AirPlay works only in Safari. Use the native HLS player on
 *   Safari (preferNativeHlsOnSafari) so the AirPlay device can take over
 *   the stream. For DRMtoday with single-use upfront auth tokens, the
 *   AirPlay device needs its own token: provide a fresh one with
 *   player.setDrmCustomDataModifier (see the comment below).
 * Page: airplay.html provides #video, #airplayButton, #availability, #casting
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.hls"
import "@castlabs/prestoplay/cl.airplay"

clpp.log.setLogLevel(clpp.log.Level.INFO);

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

const airplayButton = document.getElementById('airplayButton');
const availabilityEl = document.getElementById('availability');
const castingEl = document.getElementById('casting');

player.on(clpp.events.AIRPLAY_STATUS_CHANGED, (event) => {
  airplayButton.disabled = !event.canCast;
  availabilityEl.textContent = event.canCast
    ? 'AirPlay device available.'
    : 'No AirPlay device available.';
});

player.on(clpp.events.AIRPLAY_CASTING_STARTED, () => {
  castingEl.textContent = 'Playing on the AirPlay device.';
});

player.on(clpp.events.AIRPLAY_CASTING_ENDED, () => {
  castingEl.textContent = 'Playing locally.';
});

airplayButton.addEventListener('click', () => {
  // Opens the system menu to choose an AirPlay device.
  player.getPlugin(clpp.airplay.AirPlayPlugin.Id).showCastMenu();
});

// For DRM-protected content with single-use DRMtoday auth tokens, the
// player calls this before each license request, including the one from
// the AirPlay device. Fetch a fresh token from your backend here:
//
// player.setDrmCustomDataModifier(async (customData) => {
//   customData.authToken = await fetchAuthTokenFromYourBackend();
// });

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
  }
});

player.open({
  source: 'https://content.players.castlabs.com/demos/clear-segmented/master.m3u8',
  muted: true,
  streaming: {
    // Let Safari play HLS natively, which AirPlay needs.
    preferNativeHlsOnSafari: true,
  },
}).catch((error) => {
  console.warn('Load failed:', error);
});
