/**
 * Thumbnails embedded in a DASH manifest: seek-bar preview thumbnails from
 * the stream's image AdaptationSet. No thumbnails config is needed.
 * Modules: cl.mse, cl.dash, cl.thumbnails
 * APIs: see thumbnail_preview.js
 * Gotchas: the manifest must declare thumbnails (an image AdaptationSet with
 *   the http://dashif.org/guidelines/thumbnail_tile essential property).
 *   Don't set thumbnails.url, or the plugin uses the URL instead.
 * Page: thumbnails.html provides #video, #thumbnailPreview
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
    // Thumbnails come from this MPD's image AdaptationSet (10x10 JPEG tiles).
    source: 'https://testcontent.castlabs.com/QA/tos_1080_clear/manifest.mpd',
    autoplay: true,
    muted: true,
  });
} catch (error) {
  console.error('Error initializing player:', error);
}
