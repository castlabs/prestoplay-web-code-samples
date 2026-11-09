/**
 * SRT subtitles: side-load a SubRip file for a DASH stream.
 * Modules: cl.mse, cl.dash, cl.vtt (parses WebVTT and SRT), cl.htmlcue (HTML
 *   subtitle renderer)
 * APIs: player.open({remoteTextTracks: [{url, mimeType: 'text/srt', kind,
 *   language, label}], preferredTextLanguage})
 * Gotchas: mimeType selects the parser; set preferredTextLanguage to the
 *   track's language to show it on start.
 * Page: srt.html provides #video
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
// The VTT module parses WebVTT and SubRip (SRT) subtitles.
import "@castlabs/prestoplay/cl.vtt"
// The HTML text displayer renders cues consistently across browsers.
import "@castlabs/prestoplay/cl.htmlcue"

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
  startTime: 23,
  // Side-load the SRT file. The mimeType selects the SRT parser; the
  // player converts the cues to WebVTT internally.
  remoteTextTracks: [
    {
      url: 'https://demo.cf.castlabs.com/media/TOS/TOS-ml.srt',
      mimeType: 'text/srt',
      kind: 'subtitles',
      language: 'mal',
      label: 'Malayalam',
    },
  ],
  // Select the side-loaded track when playback starts.
  preferredTextLanguage: 'mal',
});
