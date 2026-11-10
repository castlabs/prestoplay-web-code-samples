/**
 * Simple UI: a container around the video, a poster shown before playback
 *   starts, and a big play button.
 * Modules: cl.mse, cl.dash
 * APIs: new clpp.Player(videoEl, config, {containerEl}), player.open({source}),
 *   player.play(), player.on('playing')
 * Gotchas: containerEl must be the direct parent of the <video> element, and
 *   the player makes it position: relative, so the poster and the play button
 *   can be absolute on top of the video. Hide them on 'playing', not on click,
 *   so the poster stays up until the first frame is shown. Starting playback
 *   from a click counts as a user gesture, so it can play with sound.
 * Page: simple_ui.html provides #video inside .ui-container, .ui-poster,
 *   .ui-play-btn
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"

clpp.log.setLogLevel(clpp.log.Level.INFO);

const videoEl = document.getElementById('video');
const containerEl = document.querySelector('.ui-container');
const player = new clpp.Player(videoEl, { }, { containerEl });

// Hide the poster and the play button once playback begins, and show the
// native controls so the viewer can pause and seek.
player.on('playing', () => {
  containerEl.classList.add('ui-started');
  videoEl.controls = true;
});

document.querySelector('.ui-play-btn').addEventListener('click', () => {
  player.play().catch((error) => {
    console.warn('Play failed:', error);
  });
});

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
  }
});

// Load the content without autoplay. The play button starts playback.
player.open({
  source: 'https://testcontent.castlabs.com/QA/tos_1080_clear/manifest.mpd',
}).catch((error) => {
  console.warn('Load failed:', error);
});
