/**
 * Chromecast sender: cast the content of a player to a Chromecast device
 *   and control playback from the page.
 * Modules: cl.mse, cl.dash, cl.cast
 * External: Google Cast sender SDK (cast_sender.js, loaded after cl.cast)
 * APIs: clpp.cast.onReady(callback), new clpp.cast.CastProxy(player,
 *   receiverAppId), proxy.canCast(), proxy.cast(), proxy.isCasting(),
 *   proxy.forceDisconnect(), proxy.setContentTitle(),
 *   proxy.setContentImage(), proxy.sendMessage(),
 *   proxy.addMessageListener(), clpp.events.CAST_STATUS_CHANGED,
 *   CASTING_STARTED, CASTING_ENDED
 * Gotchas: load the Cast sender SDK after cl.cast, which registers the
 *   SDK's ready callback, and create the CastProxy in clpp.cast.onReady.
 *   The receiver app must be able to play PRESTOplay configurations (e.g.
 *   a receiver built with PRESTOplay, see chromecast_receiver.js). Casting works in Chrome and Edge
 *   only, and needs a Cast device on the same network. While casting, the
 *   player methods (play, pause, setPosition, ...) control the receiver.
 *   Set content metadata before cast() or open().
 * Page: chromecast_sender.html provides #video, #castButton, #status,
 *   #playPauseButton
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.cast"

clpp.log.setLogLevel(clpp.log.Level.INFO);

// TODO: Replace with the ID of your Cast receiver app, or pass it in the
// page URL as ?receiver_id=XXXXXXXX.
const RECEIVER_APP_ID = new URLSearchParams(location.search).get('receiver_id') || 'TODO';

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

const castButton = document.getElementById('castButton');
const statusEl = document.getElementById('status');

function loadCastSenderSdk() {
  const script = document.createElement('script');
  script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
  document.head.appendChild(script);
}

clpp.cast.onReady(() => {
  // The Cast sender SDK is ready, create the proxy for the player.
  const proxy = new clpp.cast.CastProxy(player, RECEIVER_APP_ID);

  // Metadata shown on the receiver and in the Cast controls.
  proxy.setContentTitle('Tears of Steel');
  proxy.setContentImage('https://castlabs.com/wp-content/uploads/castlabs-logo.svg');

  function updateCastButton() {
    castButton.disabled = !proxy.canCast();
    castButton.textContent = proxy.isCasting() ? 'Stop casting' : 'Cast';
  }

  updateCastButton();
  statusEl.textContent = 'Cast SDK ready. Looking for Cast devices.';

  player.on(clpp.events.CAST_STATUS_CHANGED, () => {
    updateCastButton();
    if (!proxy.isCasting()) {
      statusEl.textContent = proxy.canCast()
        ? 'Cast device available.'
        : 'No Cast device available.';
    }
  });

  player.on(clpp.events.CASTING_STARTED, () => {
    updateCastButton();
    statusEl.textContent = `Casting to ${proxy.getReceiverName()}.`;
    // The receiver in chromecast_receiver.js answers with a 'pong' message.
    proxy.sendMessage({type: 'ping'}).catch((error) => {
      console.warn('Message failed:', error);
    });
  });

  player.on(clpp.events.CASTING_ENDED, () => {
    updateCastButton();
    statusEl.textContent = 'Casting ended. Playback continues locally.';
  });

  castButton.addEventListener('click', () => {
    if (proxy.isCasting()) {
      proxy.forceDisconnect();
    } else {
      // Casts the content that is loaded in the player. Without loaded
      // content, the session starts empty and waits for player.open().
      proxy.cast().catch((error) => {
        console.warn('Cast failed:', error);
      });
    }
  });

  // Custom messages to and from the receiver app, on the
  // 'urn:x-cast:castlabs' namespace. The receiver decides what they mean;
  // chromecast_receiver.js sends 'pong' and 'tracks' messages.
  proxy.addMessageListener((message) => {
    console.info('Message from receiver:', message);
  });
});

loadCastSenderSdk();

document.getElementById('playPauseButton').addEventListener('click', () => {
  // While casting, this controls playback on the receiver.
  if (player.isPaused()) {
    player.play().catch(error => console.warn('Play failed:', error));
  } else {
    player.pause().catch(error => console.warn('Pause failed:', error));
  }
});

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
  }
});

player.open({
  source: 'https://demo.cf.castlabs.com/media/TOS/abr/Manifest_clean_sizes.mpd',
  muted: true,
}).catch((error) => {
  console.warn('Load failed:', error);
});
