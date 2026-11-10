/**
 * BIF thumbnails: one binary BIF (Base Index Frames) file that packs every
 * thumbnail and its timestamp. The format comes from Roku, so reuse an
 * existing Roku BIF file for the web player.
 * Modules: cl.mse, cl.dash, cl.thumbnails
 * APIs: thumbnails config {mode: 'BIF', url};
 *   the preview itself: see thumbnail_preview.js
 * Gotchas: the whole file is downloaded before the first thumbnail shows
 *   (3.3 MB here), so it's slower to start than the other formats.
 * Page: bif.html provides #video, #thumbnailPreview
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.thumbnails"
import {showThumbnailsOnHover} from "./thumbnail_preview.js"

clpp.log.setLogLevel(clpp.log.Level.INFO);

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

showThumbnailsOnHover(player, videoEl, document.getElementById('thumbnailPreview'));

try {
  await player.open({
    source: 'https://demo.cf.castlabs.com/media/Route66/dash/Manifest.mpd',
    autoplay: true,
    muted: true,
    thumbnails: {
      mode: 'BIF',
      url: 'https://demo.cf.castlabs.com/media/Route66/dash/thumbs/thumbs.bif',
    },
  });
} catch (error) {
  console.error('Error initializing player:', error);
}
