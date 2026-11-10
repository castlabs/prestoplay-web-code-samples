/**
 * 360° video: renders an equirectangular 360° stream on a WebGL sphere.
 * Look around by dragging the video with the mouse or a finger, or with the
 * buttons, which move the camera through the plugin API.
 * Modules: cl.mse, cl.hls, cl.vr
 * External: mux.js (global script; transmuxes the MPEG-TS segments of this
 *   HLS stream for MSE playback)
 * APIs: player.open({vr: {enable, attachMouseListener, fieldOfView,
 *   sensitivity, invertHorizontalControl, invertVerticalControl}}),
 *   player.getPlugin(clpp.vr.VrPlugin.Id), vrPlugin.getCameraCoordinates(),
 *   vrPlugin.moveCamera(x, y), vrPlugin.setCameraFieldOfView(degrees)
 * Gotchas: the plugin is off until vr.enable is true. It draws on a canvas
 *   that it puts over the video, so the player needs a container element.
 *   The stream must be equirectangular. Camera x is yaw and y is pitch, in
 *   degrees. Set attachMouseListener: false to control the camera only from
 *   your own code.
 * Page: vr.html provides #video, #left, #right, #up, #down, #zoomIn,
 *   #zoomOut, #camera
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.hls"
import "@castlabs/prestoplay/cl.vr"

clpp.log.setLogLevel(clpp.log.Level.INFO);

// Degrees to turn or zoom per button press.
const STEP = 10;
const DEFAULT_FIELD_OF_VIEW = 70;

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });
const vrPlugin = player.getPlugin(clpp.vr.VrPlugin.Id);

let fieldOfView = DEFAULT_FIELD_OF_VIEW;
const cameraEl = document.getElementById('camera');

function showCamera () {
  const {x, y} = vrPlugin.getCameraCoordinates();
  cameraEl.textContent =
    `yaw ${x.toFixed(0)}°, pitch ${y.toFixed(0)}°, field of view ${fieldOfView}°`;
}

function turn (dx, dy) {
  const {x, y} = vrPlugin.getCameraCoordinates();
  vrPlugin.moveCamera(x + dx, y + dy);
  showCamera();
}

function zoom (delta) {
  // A smaller field of view zooms in.
  fieldOfView = Math.min(120, Math.max(30, fieldOfView + delta));
  vrPlugin.setCameraFieldOfView(fieldOfView);
  showCamera();
}

document.getElementById('left').addEventListener('click', () => turn(STEP, 0));
document.getElementById('right').addEventListener('click', () => turn(-STEP, 0));
document.getElementById('up').addEventListener('click', () => turn(0, STEP));
document.getElementById('down').addEventListener('click', () => turn(0, -STEP));
document.getElementById('zoomIn').addEventListener('click', () => zoom(-STEP));
document.getElementById('zoomOut').addEventListener('click', () => zoom(STEP));
// Dragging moves the camera too, so refresh the readout after a drag.
containerEl.addEventListener('pointerup', showCamera);

try {
  await player.open({
    source: 'https://demo.cf.castlabs.com/public/Client/tmp/marathon-hls/playlist.m3u8',
    autoplay: true,
    muted: true,
    vr: {
      enable: true,
      // Move the camera by dragging (default true).
      attachMouseListener: true,
      fieldOfView: DEFAULT_FIELD_OF_VIEW,
      // Drag sensitivity multiplier (default 1).
      sensitivity: 1,
      invertHorizontalControl: false,
      invertVerticalControl: false,
    },
  });
  showCamera();
} catch (error) {
  console.error('Error initializing player:', error);
}
