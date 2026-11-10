/**
 * NPAW v7 analytics: DASH playback reported to NPAW (Youbora).
 * Modules: cl.mse, cl.dash, cl.youbora
 * External: NPAW plugin 7.x (NpawPlugin-es5.js and NpawPluginAdapters-es5.js,
 *   global scripts)
 * APIs: player config `npaw: {accountCode, errorFilter}`, clpp.Error,
 *   player.onError() (used here to simulate errors), player.release()
 * Gotchas: the module is cl.youbora but the config key is `npaw`. The plugin
 *   reads accountCode when the player is created, so the player is created
 *   on Load with the account code from the form, and the previous player is
 *   released first.
 * Page: npaw_v7.html provides #video, #loadForm, #accountCode, #sourceUrl,
 *   #triggerRecoverableErrorButton, #triggerFatalErrorButton
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.youbora"

const defaultSource = {
  name: 'DASH VOD',
  url: 'https://demo.cf.castlabs.com/media/prestodash/Manifest.mpd'
};

clpp.log.setLogLevel(clpp.log.Level.INFO);

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
let player = null;

function createPlayer({accountCode}) {
  const newPlayer = new clpp.Player(videoEl, {
    npaw: {
      // The account code from your NPAW account, see https://npaw.com/
      accountCode,
      errorFilter: (error) => {
        // A custom function that converts clpp.Error to a NPAW payload.
        // Use this if you are not satisfied with the default error reporting.
        const getEnumValueName = (enumObject, value) =>
          Object.keys(enumObject).find((key) => enumObject[key] === value);

        const categoryName = getEnumValueName(clpp.Error.Category, error.category);
        const errorCodeName = getEnumValueName(clpp.Error.Code, error.code);

        return {
          code: `${categoryName} - ${errorCodeName}`,
          message: error.message,
          severity: error.severity,
          metadata: {
            // Fill in metadata based on opt_data according to your needs.
          }
        };
      },
    }
  }, { containerEl });

  newPlayer.on('error', event => {
    const error = event.detail;
    if (error) {
      console.warn('Error:', error);
    }
  });
  return newPlayer;
}

document.getElementById('loadForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  // Release the previous player, which also ends its NPAW view.
  await player?.release();
  // Controls stay hidden until there is something to play.
  videoEl.controls = true;
  player = createPlayer({
    accountCode: document.getElementById('accountCode').value.trim(),
  });
  player.open({
    source: {
      url: document.getElementById('sourceUrl').value,
      type: clpp.Type.DASH,
      name: defaultSource.name
    },
    autoplay: true,
    muted: true,
  }).catch((error) => {
    console.warn('Load failed:', error);
  });
});

document.getElementById('triggerRecoverableErrorButton').addEventListener('click', () => {
  player?.onError(new clpp.Error(
    clpp.Error.Severity.RECOVERABLE,
    clpp.Error.Category.PLAYER,
    clpp.Error.Code.HTTP_ERROR,
  ));
});

document.getElementById('triggerFatalErrorButton').addEventListener('click', () => {
  player?.onError(new clpp.Error(
    clpp.Error.Severity.FATAL,
    clpp.Error.Category.PLAYER,
    clpp.Error.Code.HTTP_ERROR,
  ));
});
