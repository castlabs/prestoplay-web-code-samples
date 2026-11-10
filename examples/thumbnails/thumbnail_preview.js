/**
 * Thumbnail preview: shows the thumbnail for the hovered seek-bar position.
 * The thumbnail samples share this module. It is the same for every
 * thumbnail format, because the thumbnails plugin hides the format behind
 * plugin.get(time).
 * APIs: player.getPlugin(clpp.thumbnails.ThumbnailsPlugin.Id), plugin.get(time),
 *   thumb.load(), thumb.element(width)
 * Gotchas: plugin.get() rejects when there is no thumbnail for the position
 *   (e.g. while the thumbnail index is still loading), so handle the error.
 *   get() and load() are async and can resolve out of order while the mouse
 *   moves, so drop results older than the thumbnail on screen.
 */
import {clpp} from "@castlabs/prestoplay"

// Width of the rendered thumbnail in pixels.
const THUMBNAIL_WIDTH = 180;
// Approximate height of the native video controls.
const CONTROLS_HEIGHT = 45;

/**
 * @param {clpp.Player} player
 * @param {HTMLVideoElement} videoEl
 * @param {HTMLElement} previewEl absolutely positioned element above the video
 */
export function showThumbnailsOnHover(player, videoEl, previewEl) {
  const half = THUMBNAIL_WIDTH / 2;
  // Latest hovered position; null when not hovering over the seek bar.
  /** @type {number | null} */
  let pendingPosition = null;
  let frameRequested = false;
  // Increases with each lookup. Results that arrive out of order (older
  // than the thumbnail on screen) are dropped.
  let requestId = 0;
  let renderedId = 0;

  function hide() {
    pendingPosition = null;
    // Drop lookups that are still loading.
    renderedId = ++requestId;
    previewEl.hidden = true;
  }

  async function update() {
    frameRequested = false;
    if (pendingPosition === null) {
      return;
    }
    const id = ++requestId;
    try {
      const thumbPlugin = player.getPlugin(clpp.thumbnails.ThumbnailsPlugin.Id);
      const thumb = await thumbPlugin.get(pendingPosition);
      await thumb.load();
      if (id <= renderedId) {
        return;
      }
      renderedId = id;
      previewEl.replaceChildren(thumb.element(THUMBNAIL_WIDTH));
      previewEl.hidden = false;
    } catch (error) {
      // No thumbnail for this position (e.g. still loading).
      if (id === requestId) {
        previewEl.hidden = true;
      }
    }
  }

  videoEl.addEventListener('mousemove', event => {
    const rect = videoEl.getBoundingClientRect();
    const y = event.clientY - rect.top;

    // Show a thumbnail only when the user hovers over the seek bar.
    if (y < rect.height - CONTROLS_HEIGHT) {
      hide();
      return;
    }

    // Follow the mouse right away, without waiting for the image.
    const x = event.clientX - rect.left;
    previewEl.style.left = `clamp(${half}px, ${x}px, calc(100% - ${half}px))`;

    // Map the mouse position to a playback position, and look up the
    // thumbnail at most once per animation frame.
    pendingPosition = (x / rect.width) * player.getDuration();
    if (!frameRequested) {
      frameRequested = true;
      requestAnimationFrame(update);
    }
  });

  videoEl.addEventListener('mouseleave', hide);
}
