/**
 * Timeline cues: react to timed metadata in the stream: DASH EventStream
 *   events in the MPD, or HLS EXT-X-DATERANGE tags.
 * Modules: cl.mse, cl.dash, cl.hls
 * External: mux.js (global script, needed for HLS transmuxing)
 * APIs: clpp.events.TIMELINE_CUE_ADDED, TIMELINE_CUE_ENTER,
 *   TIMELINE_CUE_EXIT, TIMELINE_CUES_CHANGED, player.getTimelineCues(),
 *   clpp.TimelineCue ({id, type, schemeIdUri, startTime, endTime,
 *   customAttributes, eventElement}), clpp.TimelineCueType,
 *   networkEngine.addResponseModifier (only to add events to the demo MPD)
 * Gotchas: for DASH, cues come from EventStream elements in the MPD;
 *   the type is SCTE35 for urn:scte:scte35 schemes and UNKNOWN for custom
 *   schemes (read the XML from eventElement). For live streams, startTime
 *   and endTime are on the live timeline, not relative to the start of
 *   playback. A cue with
 *   startTime === endTime is a point in time. The player handles HLS
 *   interstitial date ranges as ads; this sample turns that off with
 *   ads.hls.enable = false to get the plain cue events.
 * Page: timeline_cues.html provides #video, #log, #loadButton, #sourceSelect
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.hls"

clpp.log.setLogLevel(clpp.log.Level.INFO);

const SOURCES = {
  dash: 'https://testcontent.castlabs.com/QA/tos_1080_clear/manifest.mpd',
  hls: 'https://content.players.castlabs.com/media/HLS/A1/index4.m3u8',
};

// The public DASH stream has no events, so this sample adds an
// EventStream with two SCTE-35 events (placeholder payloads) to the MPD. In a real
// stream, the packager or SSAI server puts them there.
const EVENT_STREAM = `
  <EventStream schemeIdUri="urn:scte:scte35:2014:xml+bin" timescale="1">
    <Event presentationTime="10" duration="10" id="1001"><Signal xmlns="http://www.scte.org/schemas/35/2016"><Binary>/DAlAAAAAAAAAP/wFAUAAAPpf+/+AA3bqP4ADbugAAAAAAAA7VXYcw==</Binary></Signal></Event>
    <Event presentationTime="30" duration="5" id="1002"><Signal xmlns="http://www.scte.org/schemas/35/2016"><Binary>/DAlAAAAAAAAAP/wFAUAAAPqf+/+AClGsP4ABHGgAAAAAAAAuEvt/Q==</Binary></Signal></Event>
  </EventStream>`;

function addEventStream(response) {
  if (response.request?.type !== clpp.net.RequestType.MANIFEST ||
      !response.uri.startsWith(SOURCES.dash)) {
    return;
  }
  const mpd = new TextDecoder().decode(response.data);
  const patched = mpd.replace(/(<Period[^>]*>)/, `$1${EVENT_STREAM}`);
  response.data = new TextEncoder().encode(patched).buffer;
}

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });
player.getNetworkEngine().addResponseModifier(addEventStream);

const logEl = document.getElementById('log');
function log(event, detail) {
  const item = document.createElement('li');
  const eventEl = document.createElement('span');
  eventEl.className = 'event';
  eventEl.textContent = event;
  const detailEl = document.createElement('span');
  detailEl.className = 'detail';
  detailEl.textContent = ` ${detail}`;
  item.append(eventEl, detailEl);
  logEl.prepend(item);
}

function describeCue(cue) {
  const time = cue.startTime === cue.endTime
    ? `at ${cue.startTime.toFixed(1)}`
    : `${cue.startTime.toFixed(1)}-${cue.endTime.toFixed(1)}`;
  return `${cue.type} id=${cue.id} ${time} scheme=${cue.schemeIdUri || '-'}`;
}

player.on(clpp.events.TIMELINE_CUE_ADDED, (event) => {
  log('TIMELINE_CUE_ADDED', describeCue(event.detail));
});

player.on(clpp.events.TIMELINE_CUE_ENTER, (event) => {
  const cue = event.detail;
  log('TIMELINE_CUE_ENTER', describeCue(cue));
  // DASH: the <Event> element from the MPD, with any custom payload.
  if (cue.eventElement) {
    log('  event', cue.eventElement.outerHTML.slice(0, 200));
  }
  // HLS EXT-X-DATERANGE client attributes (X-...) are in customAttributes.
  if (cue.type === clpp.TimelineCueType.HLS_DATERANGE && cue.customAttributes) {
    log('  attributes', JSON.stringify(cue.customAttributes));
  }
});

player.on(clpp.events.TIMELINE_CUE_EXIT, (event) => {
  log('TIMELINE_CUE_EXIT', describeCue(event.detail));
});

player.on(clpp.events.TIMELINE_CUES_CHANGED, () => {
  // All cues the player currently knows about.
  log('TIMELINE_CUES_CHANGED', `${player.getTimelineCues().length} cues`);
});

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
  }
});

document.getElementById('loadButton').addEventListener('click', () => {
  logEl.textContent = '';
  player.open({
    source: SOURCES[document.getElementById('sourceSelect').value],
    autoplay: true,
    muted: true,
    ads: {
      hls: {
        enable: false,
      },
    },
  }).catch((error) => {
    console.warn('Load failed:', error);
  });
});
