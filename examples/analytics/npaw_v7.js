/**
 * NPAW v7 analytics: DASH playback reported to NPAW (Youbora).
 * Modules: cl.mse, cl.dash, cl.youbora
 * External: NPAW plugin 7.x (NpawPlugin-es5.js and NpawPluginAdapters-es5.js,
 *   global scripts)
 * APIs: player config `npaw: {accountCode, errorFilter}`, clpp.Error,
 *   player.onError() (used here to simulate errors)
 * Gotchas: the module is cl.youbora but the config key is `npaw`; accountCode
 *   is a TODO placeholder.
 * Page: npaw_v7.html provides #video, #sourceUrl,
 *   #triggerRecoverableErrorButton, #triggerFatalErrorButton, #loadButton
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
const player = new clpp.Player(videoEl, {
  npaw: {
    // Fill in your accountCode here, see more at https://npaw.com/
    accountCode: 'TODO',
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

const sourceUrlEl = document.getElementById('sourceUrl');
const triggerRecoverableErrorButtonEl =
  document.getElementById('triggerRecoverableErrorButton');
const triggerFatalErrorButtonEl =
  document.getElementById('triggerFatalErrorButton');

document.getElementById('loadButton').addEventListener('click', () => {
  player.open({
    source: {
      url: sourceUrlEl.value,
      type: clpp.Type.DASH,
      name: defaultSource.name
    },
    autoplay: true,
  });
});

triggerRecoverableErrorButtonEl.addEventListener('click', () => {
  player.onError(new clpp.Error(
    clpp.Error.Severity.RECOVERABLE,
    clpp.Error.Category.PLAYER,
    clpp.Error.Code.HTTP_ERROR,
  ));
});

triggerFatalErrorButtonEl.addEventListener('click', () => {
  player.onError(new clpp.Error(
    clpp.Error.Severity.FATAL,
    clpp.Error.Category.PLAYER,
    clpp.Error.Code.HTTP_ERROR,
  ));
});

player.on('error', event => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
  }
});
