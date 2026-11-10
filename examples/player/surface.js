/**
 * Player surface: pass your own container element, add an overlay to it,
 *   and override the default container and video styles.
 * Modules: cl.mse, cl.dash
 * APIs: new clpp.Player(videoEl, config, {containerEl}), player.getSurface(),
 *   surface.getContainer(), surface.getMedia(),
 *   surface.addElementToContainer(el), surface.removeElementFromContainer(el)
 * Gotchas: containerEl must be the direct parent of the <video> element.
 *   Without containerEl, the player wraps the video in a new <div> and moves
 *   the video's classes, inline styles and width/height to it. The player
 *   adds the clpp-container class to the container and clpp-video to the
 *   video; extend these classes to restyle the surface. Overlays need
 *   position: absolute inside the container (clpp.styles.css makes it
 *   position: relative). With {disableContainer: true} there is no
 *   container: getContainer() returns null, addElementToContainer() throws,
 *   and subtitles, ad overlays and the HtmlTextDisplayer may not work. Use it
 *   only for audio-only or fully custom rendering (see the audio sample).
 * Page: surface.html provides #video inside #playerContainer, #title,
 *   #overlayButton, #fitButton, #loadButton
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"

clpp.log.setLogLevel(clpp.log.Level.INFO);

const videoEl = document.getElementById('video');
// Your own element, the direct parent of the <video> element. The player
// uses it as the surface container instead of creating one.
const containerEl = document.getElementById('playerContainer');
const player = new clpp.Player(videoEl, { }, { containerEl });

const surface = player.getSurface();
console.info('Container:', surface.getContainer(), 'Media:', surface.getMedia());

// An overlay that shows the title of the content on top of the video.
const overlayEl = document.createElement('div');
overlayEl.className = 'title-overlay';
overlayEl.textContent = document.getElementById('title').value;

function showOverlay() {
  // getContainer() returns null when the player runs with
  // disableContainer: true. Check it before adding overlays.
  if (!surface.getContainer()) {
    console.warn('No player container, the overlay is not shown');
    return;
  }
  surface.addElementToContainer(overlayEl);
}

function hideOverlay() {
  surface.removeElementFromContainer(overlayEl);
}

showOverlay();

document.getElementById('title').addEventListener('input', (event) => {
  overlayEl.textContent = event.target.value;
});

document.getElementById('overlayButton').addEventListener('click', () => {
  if (overlayEl.isConnected) {
    hideOverlay();
  } else {
    showOverlay();
  }
});

// Switch between letterboxing (contain) and filling the container (cover).
// The page styles .clpp-container.fill .clpp-video to override the default.
document.getElementById('fitButton').addEventListener('click', () => {
  containerEl.classList.toggle('fill');
});

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
  }
});

document.getElementById('loadButton').addEventListener('click', () => {
  player.open({
    source: 'https://testcontent.castlabs.com/QA/tos_1080_clear/manifest.mpd',
    autoplay: true,
    muted: true,
  }).catch((error) => {
    console.warn('Load failed:', error);
  });
});
