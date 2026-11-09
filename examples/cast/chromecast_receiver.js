/**
 * Chromecast receiver: a custom Web Receiver app that plays what PRESTOplay
 *   senders cast, with a queue and custom messages.
 * Modules: cl.cast
 * External: Google Cast Web Receiver SDK (cast_receiver_framework.js, the
 *   Cast Application Framework, CAF)
 * APIs: clpp.cast.Receiver.getInstance(), receiver.init(player),
 *   clpp.cast.createCastQueue(), receiver.setQueue(queue), receiver.start(),
 *   receiver.stop(), receiver.addMessageListener(),
 *   receiver.sendMessage(message, senderId?), receiver.getQueueManager(),
 *   receiver.setPlayerConfigInterceptor(), player.getTrackManager(),
 *   clpp.events.TRACKS_ADDED, AUDIO_TRACK_CHANGED, TEXT_TRACK_CHANGED
 * Gotchas: the receiver app runs on the Cast device, not in the sender's
 *   browser. Host it on HTTPS and register its URL in the Google Cast SDK
 *   Developer Console (https://cast.google.com/publish) to get the receiver
 *   app ID that senders use (see examples/cast/chromecast_sender.js). For
 *   development, register the Cast device as a test device. Call
 *   setQueue() before start(). Custom messages use the 'urn:x-cast:castlabs'
 *   namespace and must be plain serializable objects. On the receiver the
 *   volume APIs have no effect (the sender controls volume), and video tracks
 *   can't be listed or switched; audio and text tracks work. The Cast SDK
 *   plays the content, so cl.mse, cl.dash and cl.hls are not needed.
 * Page: chromecast_receiver.html provides #castPlayer (a cast-media-player
 *   element) and #notCastDevice
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.cast"

clpp.log.setLogLevel(clpp.log.Level.INFO);

// This page is only useful on a Cast device. In a desktop browser, show how
// to use it instead of starting the receiver.
const isCastDevice = /CrKey/.test(navigator.userAgent);
document.getElementById('notCastDevice').hidden = isCastDevice;

if (isCastDevice) {
  startReceiver();
}

function startReceiver() {
  // TODO: Add your castLabs license key. Licenses are bound to the domain
  // that hosts this receiver app.
  const player = new clpp.Player('castPlayer', {
    // license: 'TODO',
  });

  const receiver = clpp.cast.Receiver.getInstance();
  receiver.init(player);

  // The queue lets senders add items and skip between them, e.g. with
  // CastProxy.queueAddItems(), queueNextItem() and queuePreviousItem().
  // Register it before start(), so CAF has it before sessions begin.
  receiver.setQueue(clpp.cast.createCastQueue());

  // Change the player configuration that a sender sent before it loads,
  // e.g. to add a DRM token that only the receiver can get.
  receiver.setPlayerConfigInterceptor((config) => {
    console.info('Loading', config.source);
    return config;
  });

  // Custom messages from senders (CastProxy.sendMessage()).
  receiver.addMessageListener((message) => {
    console.info('Message from sender:', message);
    if (message && message.type === 'ping') {
      // Without a senderId as the second argument, the message goes to all
      // connected senders.
      receiver.sendMessage({type: 'pong', tracks: describeTracks()});
    }
  });

  // Tell all connected senders which audio and text tracks are available,
  // so they can offer a track menu.
  function broadcastTracks() {
    receiver.sendMessage({type: 'tracks', tracks: describeTracks()});
  }

  function describeTracks() {
    const trackManager = player.getTrackManager();
    const describe = track => ({
      id: track.id,
      language: track.language,
      label: track.label,
      // Extra info the receiver adds, e.g. ['main'] or ['commentary'].
      roles: track.roles,
    });
    // Video tracks are not available on the receiver.
    return {
      audio: trackManager.getAudioTracks().map(describe),
      text: trackManager.getTextTracks().map(describe),
      activeAudio: trackManager.getAudioTrack()?.id ?? null,
      activeText: trackManager.getTextTrack()?.id ?? null,
    };
  }

  player.on(clpp.events.TRACKS_ADDED, broadcastTracks);
  player.on(clpp.events.AUDIO_TRACK_CHANGED, broadcastTracks);
  player.on(clpp.events.TEXT_TRACK_CHANGED, broadcastTracks);

  player.on('error', (event) => {
    const error = event.detail;
    if (error) {
      console.warn('Error:', error);
    }
  });

  receiver.start();

  // The CAF queue manager, available once the queue is registered. Use it
  // to inspect or change the queue on the receiver side.
  player.on(clpp.events.TRACKS_ADDED, () => {
    const queueManager = receiver.getQueueManager();
    if (queueManager) {
      console.info('Queue items:', queueManager.getItems().length);
    }
  });

  // On Google TV Streamer, Back or Home sends the app to the background.
  // Shut the receiver down then.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.info('Receiver app went to the background, stopping it.');
      receiver.stop();
    }
  });
}
