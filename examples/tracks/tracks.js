/**
 * Audio and subtitle tracks: pick the initial audio and subtitle languages
 *   with fallbacks, then list and switch audio, subtitle and video tracks
 *   during playback.
 * Modules: cl.mse, cl.dash, cl.ttml (TTML parser for the subtitles in this
 *   stream), cl.htmlcue (HTML subtitle renderer)
 * APIs: player.open({preferredAudioLanguage, preferredTextLanguage}),
 *   player.getTrackManager(), trackManager.getAudioTracks/getTextTracks/
 *   getVideoTracks(), getAudioTrack/getTextTrack(), setAudioTrack(track),
 *   setTextTrack(track | null), getVideoRendition(),
 *   setVideoRendition(rendition | null, clearBuffer), isAbrEnabled(),
 *   clpp.Track (id, language, label, kind, renditions), clpp.Rendition
 *   (id, width, height, bandwidth, codec), clpp.events.TRACKS_ADDED,
 *   AUDIO_TRACK_CHANGED, TEXT_TRACK_CHANGED, VIDEO_TRACK_CHANGED (detail:
 *   abrSelection, width, height, bandwidth), BITRATE_CHANGED (detail: width,
 *   height, bandwidth)
 * Gotchas: preferredAudioLanguage and preferredTextLanguage take a language
 *   code or an array; the player selects the first available language.
 *   Setting preferredTextLanguage also turns subtitles on. Tracks are
 *   available after TRACKS_ADDED; getTrackManager() returns null before the
 *   content is loaded. setTextTrack(null) turns subtitles off.
 *   setVideoRendition(null) turns ABR back on. VIDEO_TRACK_CHANGED fires
 *   when a rendition is selected for download; BITRATE_CHANGED fires when it
 *   is actually on screen. VIDEO_TRACK_CHANGED puts its data in
 *   event.details (not event.detail) in SDK 6.36. Each subtitle format needs its
 *   parser module. On Safari with native HLS, track metadata is limited and
 *   video track selection isn't supported.
 * Page: tracks.html provides #video, #log, #loadButton, #audioSelect,
 *   #textSelect, #videoSelect
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
// Parser for the TTML subtitles in the manifest.
import "@castlabs/prestoplay/cl.ttml"
// The HTML text displayer renders cues consistently across browsers.
import "@castlabs/prestoplay/cl.htmlcue"

clpp.log.setLogLevel(clpp.log.Level.INFO);

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

const audioSelect = document.getElementById('audioSelect');
const textSelect = document.getElementById('textSelect');
const videoSelect = document.getElementById('videoSelect');

const logEl = document.getElementById('log');
function log(message) {
  const item = document.createElement('li');
  item.textContent = `${new Date().toLocaleTimeString()} ${message}`;
  logEl.prepend(item);
}

function describeTrack(track) {
  const codec = track.renditions[0]?.codec;
  return [track.language || 'und', track.label, codec].filter(Boolean).join(' · ');
}

function describeRendition(rendition) {
  const kbps = rendition.bandwidth ? `${Math.round(rendition.bandwidth / 1000)} kbps` : '';
  return `${rendition.height}p ${kbps}`.trim();
}

function fillSelect(select, options, selectedValue) {
  select.replaceChildren(...options.map(({value, label}) => new Option(label, value)));
  select.value = selectedValue;
  select.disabled = options.length < 2;
}

// Rebuilds the three selects from the track manager. Called when tracks are
// added and whenever the player or the user changes a track.
function updateTrackUi() {
  const trackManager = player.getTrackManager();
  if (!trackManager) {
    return;
  }

  fillSelect(audioSelect,
    trackManager.getAudioTracks().map(track => ({value: track.id, label: describeTrack(track)})),
    trackManager.getAudioTrack()?.id ?? '');

  fillSelect(textSelect,
    [{value: '', label: 'Off'},
     ...trackManager.getTextTracks().map(track => ({value: track.id, label: describeTrack(track)}))],
    trackManager.getTextTrack()?.id ?? '');

  // Video tracks usually have one track with several renditions (qualities).
  const renditions = trackManager.getVideoTracks()
    .flatMap(track => track.renditions)
    .sort((a, b) => (b.bandwidth ?? 0) - (a.bandwidth ?? 0));
  const current = trackManager.getVideoRendition();
  const autoLabel = `Auto${current ? ` (${describeRendition(current)})` : ''}`;
  fillSelect(videoSelect,
    [{value: '', label: autoLabel},
     ...renditions.map(rendition => ({value: rendition.id, label: describeRendition(rendition)}))],
    trackManager.isAbrEnabled() ? '' : current?.id ?? '');
}

player.on(clpp.events.TRACKS_ADDED, () => {
  const trackManager = player.getTrackManager();
  log(`TRACKS_ADDED: audio ${trackManager.getAudioTracks().map(t => t.language).join(', ')}; ` +
    `text ${trackManager.getTextTracks().map(t => t.language).join(', ')}`);
  updateTrackUi();
});

player.on(clpp.events.AUDIO_TRACK_CHANGED, () => {
  const track = player.getTrackManager().getAudioTrack();
  log(`AUDIO_TRACK_CHANGED: ${track ? describeTrack(track) : 'none'}`);
  updateTrackUi();
});

player.on(clpp.events.TEXT_TRACK_CHANGED, () => {
  const track = player.getTrackManager().getTextTrack();
  log(`TEXT_TRACK_CHANGED: ${track ? describeTrack(track) : 'off'}`);
  updateTrackUi();
});

// Fires when a rendition is selected for download, by ABR or by the user.
// In SDK 6.36 this event carries its data in `details`, not `detail`.
player.on(clpp.events.VIDEO_TRACK_CHANGED, (event) => {
  const {abrSelection, height, bandwidth} = event.detail ?? event.details ?? {};
  log(`VIDEO_TRACK_CHANGED: ${describeRendition({height, bandwidth})} ` +
    `${abrSelection ? '(ABR)' : '(manual)'}`);
  updateTrackUi();
});

// Fires when the new rendition is actually on screen, after the buffered
// content of the previous rendition has played out.
player.on(clpp.events.BITRATE_CHANGED, (event) => {
  log(`BITRATE_CHANGED: ${describeRendition(event.detail)}`);
});

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
    log(`Error ${error.code}`);
  }
});

audioSelect.addEventListener('change', () => {
  const trackManager = player.getTrackManager();
  const track = trackManager.getAudioTracks().find(t => t.id === audioSelect.value);
  trackManager.setAudioTrack(track ?? null);
});

textSelect.addEventListener('change', () => {
  const trackManager = player.getTrackManager();
  // null turns subtitles off.
  const track = trackManager.getTextTracks().find(t => t.id === textSelect.value);
  trackManager.setTextTrack(track ?? null);
});

videoSelect.addEventListener('change', () => {
  const trackManager = player.getTrackManager();
  const rendition = trackManager.getVideoTracks()
    .flatMap(track => track.renditions)
    .find(r => r.id === videoSelect.value);
  // A rendition locks the quality and turns ABR off; null turns ABR back on.
  // clearBuffer = true switches right away instead of after the buffer.
  trackManager.setVideoRendition(rendition ?? null, true);
});

document.getElementById('loadButton').addEventListener('click', () => {
  player.open({
    // Audio: English (AC-3 and AAC) and Italian. Subtitles: English, German
    // and 'ch'.
    source: 'https://testcontent.castlabs.com/QA/tos_1080_clear/manifest.mpd',
    autoplay: true,
    muted: true,
    // The player picks the first available language in each list. There is
    // no French in this stream, so it falls back to Italian audio and German
    // subtitles. Setting preferredTextLanguage also turns subtitles on.
    preferredAudioLanguage: ['fr', 'it', 'en'],
    preferredTextLanguage: ['fr', 'de', 'en'],
  }).catch((error) => {
    console.warn('Load failed:', error);
  });
});
