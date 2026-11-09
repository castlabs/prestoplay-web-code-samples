/**
 * Subtitle text styling: font, colors and edge style for subtitles.
 * Modules: cl.mse, cl.dash, cl.ttml
 * APIs: player.open({textStyle: {...}, preferredTextLanguage}),
 *   clpp.text.EdgeType
 * Page: text_style.html provides #video
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.ttml"

clpp.log.setLogLevel(clpp.log.Level.INFO);

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

document.querySelectorAll('[data-seek]').forEach(button => {
  button.addEventListener('click', () => {
    player.setPosition(Number(button.dataset.seek));
  });
});

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
  }
});

player.open({
  source: 'https://testcontent.castlabs.com/QA/tos_1080_clear/manifest.mpd',
  autoplay: false,
  startTime: 27,
  preferredTextLanguage: 'en',
  textStyle: {
    backgroundColor: 'rgba(207, 0, 15, 0.75)',
    windowColor: 'yellow',
    fontFamily: 'monospace',
    fontColor: 'green',
    fontSize: '1em',
    edgeType: clpp.text.EdgeType.DROP_SHADOW
  }
});
