/**
 * Playlist: play DASH and HLS items back-to-back.
 * Modules: cl.mse, cl.dash, cl.hls, cl.playlist
 * External: mux.js (HLS)
 * APIs: new clpp.Playlist(player), append({title, description, configuration}),
 *   start(), next(), previous(), goTo(), getQueue(), getPosition(),
 *   clpp.events.PLAYLIST_ITEM_CHANGED, clpp.events.PLAYLIST_MODIFIED
 * Gotchas: each item's `configuration` is what player.open() would receive;
 *   call playlist.start() instead of player.open().
 * Page: playlist.html provides #video, #playlist, #previousButton, #nextButton
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.hls"
import "@castlabs/prestoplay/cl.playlist"

clpp.log.setLogLevel(clpp.log.Level.INFO);

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

// A playlist plays its items back-to-back and can mix stream formats.
const playlist = new clpp.Playlist(player);

playlist.append({
  title: 'PRESTOplay demo',
  description: 'DASH',
  configuration: {
    source: 'https://demo.cf.castlabs.com/media/prestodash/Manifest.mpd',
    autoplay: true,
    muted: true,
  },
});
playlist.append({
  title: 'PRESTOplay demo',
  description: 'HLS',
  configuration: {
    source: 'https://demo.cf.castlabs.com/media/prestohls/master.m3u8',
    autoplay: true,
    muted: true,
  },
});
playlist.append({
  title: 'Tears of Steel',
  description: 'DASH, 1080p',
  configuration: {
    source: 'https://testcontent.castlabs.com/QA/tos_1080_clear/manifest.mpd',
    autoplay: true,
    muted: true,
  },
});

// Render the queue and let viewers jump to any item.
const listEl = document.getElementById('playlist');

function render () {
  const position = playlist.getPosition();
  listEl.replaceChildren(...playlist.getQueue().map((item, index) => {
    const li = document.createElement('li');
    li.classList.toggle('active', index === position);
    li.innerHTML = `<span>${item.title} <span class="desc">— ${item.description}</span></span>`;
    li.addEventListener('click', () => playlist.goTo(index));
    return li;
  }));
}

// The active item changed, either automatically at the end of an item or
// through next(), previous(), or goTo().
playlist.on(clpp.events.PLAYLIST_ITEM_CHANGED, render);
// An item was added, removed, or reordered.
playlist.on(clpp.events.PLAYLIST_MODIFIED, render);

document.getElementById('previousButton').addEventListener('click', () => playlist.previous());
document.getElementById('nextButton').addEventListener('click', () => playlist.next());

// Load the first item and switch to the next one when each item ends.
playlist.start();
render();

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
  }
});
