/**
 * WEBVTT thumbnails: a WebVTT file whose cues map time ranges to images.
 * A cue's payload is an image URL, optionally with a #xywh=x,y,w,h fragment
 * that cuts the thumbnail out of a sprite sheet:
 *
 *   00:00:10.000 --> 00:00:20.000
 *   1_7.jpg#xywh=262,0,262,180
 *
 * Modules: cl.mse, cl.dash, cl.thumbnails
 * APIs: thumbnails config {mode: 'WEBVTT', url, preload};
 *   the preview itself: see thumbnail_preview.js
 * Gotchas: no duration or gridSize, the VTT carries the timing and regions.
 *   Relative image URLs resolve against the VTT URL. The VTT and the images
 *   need CORS headers.
 * Page: webvtt.html provides #video, #thumbnailPreview
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
      mode: 'WEBVTT',
      url: 'https://demo.cf.castlabs.com/media/Route66/dash/thumbs/thumbs.vtt',
    },
  });
} catch (error) {
  console.error('Error initializing player:', error);
}
