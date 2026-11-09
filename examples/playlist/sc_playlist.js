/**
 * Seamless playlist: play several DASH items back-to-back with one player
 *   (the single-controller playlist), with timeline windows, cropping,
 *   timeline cues and a timeline readout.
 * Modules: cl.mse, cl.dash
 * APIs: new clpp.playlist.ScPlaylist(videoEl, {playlist: {timeline}},
 *   {containerEl}), openPlaylist(0, configs), addItem(config),
 *   seekWith(offset), getTimeline(), getCurrentItem(),
 *   getCurrentItemIndex(), getSize(), release(), clpp.media.Timeline
 *   (getWindows(), getCurrentWindowIndex()), clpp.media.TimelineWindow
 *   (getId(), getStart(), getDuration()), PlaylistConfiguration
 *   {timeline, startTime, endTime, cropTimeline},
 *   clpp.events.SC_PLAYLIST_TIMELINE_CHANGED, SC_PLAYLIST_ITEM_CHANGED,
 *   SC_PLAYLIST_ENDED, TIMELINE_CUE_ADDED/ENTER/EXIT, getTimelineCues()
 * Gotchas: ScPlaylist is experimental and may change. It is in cl.core, so
 *   no extra module is needed. It extends clpp.Player, so on(), seek(),
 *   getPosition() etc. work on the playlist; use openPlaylist() instead of
 *   open(). Every item needs a unique `id`. Options such as autoplay and
 *   the playlist start/end/crop settings go in the first item (or the
 *   constructor); playlist.timeline goes in the constructor, which is why
 *   this page reloads to switch modes. In 'basic' mode, positions and cues
 *   are relative to the current item; in 'flat' mode, to the start of the
 *   first item. openPlaylist() only supports index 0. Plugins are
 *   disabled, and encrypted items must all use the same method and key.
 *   SC_PLAYLIST_ITEM_CHANGED carries the item id as event.id (not in
 *   event.detail).
 * Page: sc_playlist.html provides #video, #timeline, #position, #item,
 *   #log, #modeForm (timeline select, crop checkbox), #backButton,
 *   #forwardButton, #addButton
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"

clpp.log.setLogLevel(clpp.log.Level.INFO);

// The form on the page sets these as query parameters.
const params = new URLSearchParams(location.search);
const timelineMode = params.get('timeline') === 'flat' ? 'flat' : 'basic';
const crop = params.has('crop');
document.querySelector(`#modeForm [name="timeline"]`).value = timelineMode;
document.querySelector(`#modeForm [name="crop"]`).checked = crop;

// Use items with the same codecs (here AVC and AAC). This sample plays the
// same 62 s stream twice; the query parameter only makes the second
// manifest URL distinct for the response modifier below.
const ITEMS = [
  {id: 'PRESTO', source: {url: 'https://demo.cf.castlabs.com/media/prestodash/Manifest.mpd'}},
  {id: 'PRESTO_2', source: {url: 'https://demo.cf.castlabs.com/media/prestodash/Manifest.mpd?item=2'}},
];
const EXTRA_ITEM = {id: 'TOS', source: {url: 'https://testcontent.castlabs.com/QA/tos_1080_clear/manifest.mpd'}}; // 734 s

// The second item has no events, so this sample adds two "chapter"
// events to its MPD. In a real stream, the packager puts them there.
const EVENT_STREAM = `
  <EventStream schemeIdUri="urn:example:chapter" timescale="1">
    <Event presentationTime="5" duration="10" id="chapter-1"/>
    <Event presentationTime="30" duration="10" id="chapter-2"/>
  </EventStream>`;

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
// ScPlaylist takes the same arguments as clpp.Player.
const playlist = new clpp.playlist.ScPlaylist(videoEl, {
  // license: '<your_license_key>', // TODO: needed outside localhost
  // viewerId: '<user_id>',
  playlist: {
    // 'basic': every item has its own timeline (one window per item).
    // 'flat': the items form one continuous timeline.
    timeline: timelineMode,
  },
}, { containerEl });

playlist.getNetworkEngine().addResponseModifier((response) => {
  if (response.request?.type !== clpp.net.RequestType.MANIFEST ||
      !response.uri.startsWith(ITEMS[1].source.url)) {
    return;
  }
  const mpd = new TextDecoder().decode(response.data);
  response.data = new TextEncoder().encode(
    mpd.replace(/(<Period[^>]*>)/, `$1${EVENT_STREAM}`)).buffer;
});

const logEl = document.getElementById('log');
function log(event, detail = '') {
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

const timelineEl = document.getElementById('timeline');
const positionEl = document.getElementById('position');
const itemEl = document.getElementById('item');

const format = (seconds) => Number.isFinite(seconds) ? seconds.toFixed(1) : '--';

// Draw one block per timeline window, sized by its duration.
function renderTimeline() {
  const timeline = playlist.getTimeline();
  const windows = timeline ? timeline.getWindows() : [];
  const current = timeline ? timeline.getCurrentWindowIndex() : -1;
  timelineEl.replaceChildren(...windows.map((win, index) => {
    const block = document.createElement('div');
    block.className = 'window';
    block.classList.toggle('active', index === current);
    block.style.flexGrow = String(Math.max(win.getDuration(), 1));
    // The window ID is the `id` of the item.
    block.textContent = `${win.getId()} ${format(win.getStart())}+${format(win.getDuration())}s`;
    return block;
  }));
}

// Position and duration are per item in 'basic' mode and for the whole
// playlist in 'flat' mode.
function renderPosition() {
  positionEl.textContent = `${format(playlist.getPosition())} / ${format(playlist.getDuration())} s`;
  const item = playlist.getCurrentItem();
  itemEl.textContent = item
    ? `${item.id} (${playlist.getCurrentItemIndex() + 1} of ${playlist.getSize()})`
    : '--';
}

// A window was added to the timeline or its duration changed.
playlist.on(clpp.events.SC_PLAYLIST_TIMELINE_CHANGED, () => {
  log('SC_PLAYLIST_TIMELINE_CHANGED', `${playlist.getTimeline()?.getWindows().length} windows`);
  renderTimeline();
});

// Playback moved to another item.
playlist.on(clpp.events.SC_PLAYLIST_ITEM_CHANGED, (event) => {
  log('SC_PLAYLIST_ITEM_CHANGED', event.id);
  renderTimeline();
  renderPosition();
});

// Playback reached the end of the last item, or playlist.endTime.
playlist.on(clpp.events.SC_PLAYLIST_ENDED, () => {
  log('SC_PLAYLIST_ENDED');
});

// Cues of every item are parsed when the item is added, not only those of
// the current item. configurationId is the id of the item.
function describeCue(cue) {
  return `${cue.id} of ${cue.configurationId} ${format(cue.startTime)}-${format(cue.endTime)}`;
}
playlist.on(clpp.events.TIMELINE_CUE_ADDED, (event) => log('TIMELINE_CUE_ADDED', describeCue(event.detail)));
playlist.on(clpp.events.TIMELINE_CUE_ENTER, (event) => log('TIMELINE_CUE_ENTER', describeCue(event.detail)));
playlist.on(clpp.events.TIMELINE_CUE_EXIT, (event) => log('TIMELINE_CUE_EXIT', describeCue(event.detail)));

playlist.on('timeupdate', renderPosition);

playlist.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
    log('error', String(error.code));
  }
});

// seekWith() seeks relative to the position and can cross item borders.
document.getElementById('backButton').addEventListener('click', () => {
  playlist.seekWith(-30).catch(error => console.warn('Seek failed:', error));
});
document.getElementById('forwardButton').addEventListener('click', () => {
  playlist.seekWith(30).catch(error => console.warn('Seek failed:', error));
});

// Items can be appended while the playlist plays.
const addButton = document.getElementById('addButton');
addButton.addEventListener('click', async () => {
  addButton.disabled = true;
  try {
    await playlist.addItem(EXTRA_ITEM);
    log('addItem', EXTRA_ITEM.id);
  } catch (error) {
    console.warn('addItem failed:', error);
    addButton.disabled = false;
  }
});

// Release the player when the page goes away. Keep it when the page goes
// into the back/forward cache (persisted), so it still works when the user
// comes back.
window.addEventListener('pagehide', (event) => {
  if (!event.persisted) {
    playlist.destroy();
  }
});

const first = {
  ...ITEMS[0],
  // Playback options go in the first item.
  autoplay: true,
  muted: true,
  playlist: crop
    ? {
      // Start 20 s into the first item and stop 100 s after the start of
      // the first item (38 s into the second one). cropTimeline cuts the
      // rest off the timeline, so the playlist starts at position 0.
      startTime: 20,
      endTime: 100,
      cropTimeline: true,
    }
    : {},
};

playlist.openPlaylist(0, [first, ...ITEMS.slice(1)]).then(() => {
  log('openPlaylist', `${timelineMode} timeline${crop ? ', cropped' : ''}`);
  renderTimeline();
  renderPosition();
}).catch((error) => {
  console.warn('Load failed:', error);
});
