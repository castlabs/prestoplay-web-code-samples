/**
 * SINGLE thumbnails: one image file per thumbnail, each covering a fixed
 * duration of the video. The image URLs come from a URL template.
 * Modules: cl.mse, cl.dash, cl.thumbnails
 * APIs: thumbnails config {mode: 'SINGLE', url, duration, templateKey, preload};
 *   the preview itself: see thumbnail_preview.js
 * Gotchas: $index$ is replaced by 1, 2, 3, ... (numbering starts at 1, so
 *   image 1 covers 0-10 s). `duration` is required. Set templateKey if your
 *   template uses a placeholder other than $index$.
 * Page: single.html provides #video, #thumbnailPreview
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
      mode: 'SINGLE',
      // .../thumbs/1.jpg, .../thumbs/2.jpg, ...
      url: 'https://demo.cf.castlabs.com/media/Route66/dash/thumbs/$index$.jpg',
      // Each image covers 10 seconds of the video.
      duration: 10,
      // The placeholder in `url` (this is the default).
      templateKey: '$index$',
      // Preload every 60th thumbnail first, then every 30th, then the rest.
      preload: [60, 30, 1],
    },
  });
} catch (error) {
  console.error('Error initializing player:', error);
}
