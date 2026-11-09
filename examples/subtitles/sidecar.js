/**
 * WebVTT and TTML subtitles: side-load a WebVTT or TTML file for a DASH or
 *   HLS stream.
 * Modules: cl.mse, cl.dash, cl.hls, cl.vtt (WebVTT and SRT parser),
 *   cl.ttml (TTML parser), cl.htmlcue (HTML subtitle renderer)
 * External: mux.js (global script, needed for HLS transmuxing)
 * APIs: player.open({remoteTextTracks: [{url, mimeType, kind, language,
 *   label}], preferredTextLanguage})
 * Gotchas: mimeType selects the parser: 'text/vtt' needs cl.vtt and
 *   'application/ttml+xml' needs cl.ttml. Subtitles that are part of the
 *   manifest need the same parser modules but no remoteTextTracks. On
 *   Safari, HLS may play through the native player, which renders
 *   subtitles differently.
 * Page: sidecar.html provides #video, #loadButton, #configSelect
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.hls"
// Parser for WebVTT (and SRT) subtitles.
import "@castlabs/prestoplay/cl.vtt"
// Parser for TTML subtitles.
import "@castlabs/prestoplay/cl.ttml"
// The HTML text displayer renders cues consistently across browsers.
import "@castlabs/prestoplay/cl.htmlcue"

clpp.log.setLogLevel(clpp.log.Level.INFO);

const DASH_SOURCE = 'https://demo.cf.castlabs.com/media/TOS/abr/Manifest_clean_sizes.mpd';
const HLS_SOURCE = 'https://content.players.castlabs.com/demos/clear-segmented/master.m3u8';

const WEBVTT_TRACK = {
  url: 'https://demo.cf.castlabs.com/media/tos_new/tearsofsteel_4k_deu/tearsofsteel_4k_deu.vtt',
  mimeType: 'text/vtt',
  kind: 'subtitles',
  language: 'de',
  label: 'German (WebVTT)',
};

const TTML_TRACK = {
  url: 'https://demo.cf.castlabs.com/media/TOS/abr/TOS-fr.xml',
  mimeType: 'application/ttml+xml',
  kind: 'subtitles',
  language: 'fr',
  label: 'French (TTML)',
};

const CONFIGS = {
  webvtt_dash: {source: DASH_SOURCE, track: WEBVTT_TRACK},
  webvtt_hls: {source: HLS_SOURCE, track: WEBVTT_TRACK},
  ttml_dash: {source: DASH_SOURCE, track: TTML_TRACK},
  ttml_hls: {source: HLS_SOURCE, track: TTML_TRACK},
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
  const {source, track} = CONFIGS[document.getElementById('configSelect').value];
  player.open({
    source,
    autoplay: true,
    muted: true,
    // The Tears of Steel subtitles start with dialogue at about 0:23.
    // The HLS stream is a different video, so the cues do not match it.
    startTime: 20,
    remoteTextTracks: [track],
    // Select the side-loaded track when playback starts.
    preferredTextLanguage: track.language,
  }).catch((error) => {
    console.warn('Load failed:', error);
  });
});
