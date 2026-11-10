/**
 * GRID thumbnails: sprite sheets that each hold a grid of thumbnails
 * (here 10x10 = 100 thumbnails per image). The image URLs come from a URL
 * template. Fewer requests than SINGLE.
 * Modules: cl.mse, cl.dash, cl.thumbnails
 * APIs: thumbnails config {mode: 'GRID', url, duration, gridSize, preload};
 *   the preview itself: see thumbnail_preview.js
 * Gotchas: `duration` is per thumbnail, not per sheet (one sheet here covers
 *   100 x 10 s). gridSize is 'COLUMNSxROWS'. $index$ counts sheets from 1.
 * Page: grid.html provides #video, #thumbnailPreview
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
      mode: 'GRID',
      // .../thumbs/1_7.jpg, .../thumbs/2_7.jpg, ...
      url: 'https://demo.cf.castlabs.com/media/Route66/dash/thumbs/$index$_7.jpg',
      // Each thumbnail in the grid covers 10 seconds of the video.
      duration: 10,
      // Each sheet holds 10 columns x 10 rows of thumbnails.
      gridSize: '10x10',
    },
  });
} catch (error) {
  console.error('Error initializing player:', error);
}
