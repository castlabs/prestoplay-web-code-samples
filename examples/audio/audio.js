/**
 * Audio player: audio-only HLS in an <audio> element with custom controls.
 * Modules: cl.mse, cl.dash, cl.hls
 * External: mux.js (transmuxes the raw AAC segments of the HLS stream)
 * APIs: new clpp.Player('audio', {}, {disableContainer: true}), play(), pause(),
 *   isPaused(), seek(), getSeekRange(), getPosition(), setVolume(), setMuted(),
 *   clpp.events.STATE_CHANGED
 * Gotchas: pass disableContainer: true for <audio>; the default container is
 *   absolutely positioned and an <audio> element gives it no size.
 * Page: audio.html provides #playButton, #seekBar, #time, #volumeBar,
 *   #muteButton, #loadButton, #sourceUrl
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.hls"

clpp.log.setLogLevel(clpp.log.Level.INFO);

// By default, the player wraps the media element in a container and
// positions it absolutely. An <audio> element doesn't give that container
// a size, so disable the container and keep the element in the layout.
const player = new clpp.Player('audio', { }, { disableContainer: true });

const playButton = document.getElementById('playButton');
const seekBar = document.getElementById('seekBar');
const timeLabel = document.getElementById('time');
const volumeBar = document.getElementById('volumeBar');
const muteButton = document.getElementById('muteButton');

const formatTime = (seconds) =>
  `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

document.getElementById('loadButton').addEventListener('click', () => {
  player.open({
    source: document.getElementById('sourceUrl').value,
    autoplay: true,
    muted: true,
  });
});

// Play and pause
playButton.addEventListener('click', () => {
  if (player.isPaused()) {
    player.play();
  } else {
    player.pause();
  }
});

player.on(clpp.events.STATE_CHANGED, (event) => {
  const playing = event.detail.currentState === clpp.Player.State.PLAYING;
  playButton.textContent = playing ? 'Pause' : 'Play';
});

// Seek bar and elapsed time. getSeekRange() also covers live streams.
player.on('timeupdate', () => {
  const {start, end} = player.getSeekRange();
  seekBar.min = start;
  seekBar.max = end;
  seekBar.value = player.getPosition();
  timeLabel.textContent = `${formatTime(player.getPosition())} / ${formatTime(end)}`;
});

seekBar.addEventListener('change', () => {
  player.seek(Number(seekBar.value));
});

// Volume and mute
volumeBar.addEventListener('input', () => {
  player.setVolume(Number(volumeBar.value));
});

muteButton.addEventListener('click', () => {
  player.setMuted(!player.isMuted());
});

player.on('volumechange', () => {
  volumeBar.value = player.getVolume();
  muteButton.textContent = player.isMuted() ? 'Unmute' : 'Mute';
});

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
  }
});
