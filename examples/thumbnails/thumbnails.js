/**
 * Thumbnails: seek-bar preview thumbnails for a DASH stream.
 * Modules: cl.mse, cl.dash, cl.thumbnails
 * APIs: player.getPlugin(clpp.thumbnails.ThumbnailsPlugin.Id), plugin.get(time),
 *   thumb.load(), thumb.element(width)
 * Gotchas: the stream must provide thumbnails (e.g. DASH image adaptation sets);
 *   plugin.get() rejects when none is available, so handle the error.
 * Page: thumbnails.html provides #video, #thumbnailPreview
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.thumbnails"

clpp.log.setLogLevel(clpp.log.Level.INFO);

const videoEl = document.getElementById('video');
const thumbnailPreviewEl = document.getElementById('thumbnailPreview');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

async function initPlayer() {
  try {
    await player.open({
      source: 'https://testcontent.castlabs.com/QA/tos_1080_clear/manifest.mpd',
      autoplay: true,
      muted: true,
      preferredTextLanguage: 'en',
    });
  } catch (error) {
    console.error('Error initializing player:', error);
  }
}

async function renderThumbnailForPosition(position, x) {
  const thumbPlugin = player.getPlugin(clpp.thumbnails.ThumbnailsPlugin.Id);
  const thumb = await thumbPlugin.get(position);
  await thumb.load();

  // 180px wide
  thumbnailPreviewEl.replaceChildren(thumb.element(180));
  thumbnailPreviewEl.style.left = `clamp(90px, ${x}px, calc(100% - 90px))`;
  thumbnailPreviewEl.hidden = false;
}

videoEl.addEventListener('mousemove', async event => {
  const rect = videoEl.getBoundingClientRect();
  const navBarHeight = 45;
  const y = event.clientY - rect.top;

  // Show thumbnail only when user is hovering over the seek bar.
  if (y < rect.height - navBarHeight) {
    thumbnailPreviewEl.hidden = true;
    return;
  }

  // Calculate the playback position from the mousemove event.
  const x = event.clientX - rect.left;
  const duration = player.getDuration();
  const position = (x / rect.width) * duration;

  try {
    await renderThumbnailForPosition(position, x);
  } catch (error) {
    thumbnailPreviewEl.hidden = true;
  }
});

videoEl.addEventListener('mouseleave', () => {
  thumbnailPreviewEl.hidden = true;
});

initPlayer();
