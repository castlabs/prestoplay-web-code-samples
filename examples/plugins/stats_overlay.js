/**
 * Custom plugin: a stats overlay that shows the plugin lifecycle.
 * Modules: cl.mse, cl.dash, cl.hls
 * External: mux.js (HLS)
 * APIs: clpp.PlayerPlugin (id, onPlayerCreated, onContentWillLoad,
 *   onContentLoaded, onPlayerWillRelease, onPlayerWillDestroy),
 *   clpp.PlayerPluginFactory (create), clpp.Player.registerPlugin(),
 *   player.getPlugin(id)
 * Gotchas: register the factory before creating the player; remove listeners
 *   added in onContentWillLoad in onPlayerWillRelease.
 * Page: stats_overlay.html provides #video, #loadButton, #sourceUrl,
 *   #toggleButton
 */
import {clpp} from "@castlabs/prestoplay"
import "@castlabs/prestoplay/cl.mse"
import "@castlabs/prestoplay/cl.dash"
import "@castlabs/prestoplay/cl.hls"

// Map numeric clpp.Player.State values to readable names.
const STATE_NAMES = Object.fromEntries(
  Object.entries(clpp.Player.State).map(([name, value]) => [value, name]));

/**
 * A custom plugin that renders a "stats for nerds" overlay on top of the
 * video. It shows how each lifecycle callback of clpp.PlayerPlugin is used:
 * create UI when the player is created, attach listeners before content
 * loads, read content info once it has loaded, and clean up on release
 * and destroy.
 *
 * @implements {clpp.PlayerPlugin}
 */
class StatsOverlayPlugin {
  constructor (options) {
    this.options_ = options;
    this.player_ = null;
    this.overlayEl_ = null;
    this.fields_ = {};
    this.lifecycleEl_ = null;
    this.intervalId_ = null;
    this.onStateChanged_ = this.onStateChanged_.bind(this);
    this.onBitrateChanged_ = this.onBitrateChanged_.bind(this);
  }

  /** @override */
  id () {
    // The ID registers the plugin as a player component, so the page can
    // reach it with player.getPlugin(StatsOverlayPlugin.Id).
    return StatsOverlayPlugin.Id;
  }

  /** @override */
  onPlayerCreated (player) {
    this.player_ = player;
    this.createOverlay_(player.getSurface().getContainer());
    this.logLifecycle_('onPlayerCreated');
  }

  /** @override */
  onContentWillLoad (player, source) {
    this.logLifecycle_('onContentWillLoad');
    this.set_('source', new URL(source.url).pathname.split('/').pop());
    this.set_('type', '…');
    this.set_('video', '…');

    player.on(clpp.events.STATE_CHANGED, this.onStateChanged_);
    player.on(clpp.events.BITRATE_CHANGED, this.onBitrateChanged_);
    this.intervalId_ = setInterval(() => this.updatePosition_(), this.options_.refreshMs);
  }

  /** @override */
  onContentLoaded (player) {
    // Content info such as the presentation type and duration is
    // available from this point.
    this.logLifecycle_('onContentLoaded');
    this.set_('type', player.isLive() ? 'LIVE' : `VOD, ${formatTime(player.getDuration())}`);
  }

  /** @override */
  onPlayerWillRelease (player) {
    // Called before new content replaces the current one and before the
    // player is destroyed. Remove everything added in onContentWillLoad.
    this.logLifecycle_('onPlayerWillRelease');
    player.off(clpp.events.STATE_CHANGED, this.onStateChanged_);
    player.off(clpp.events.BITRATE_CHANGED, this.onBitrateChanged_);
    clearInterval(this.intervalId_);
    this.intervalId_ = null;
  }

  /** @override */
  onPlayerWillDestroy () {
    this.overlayEl_.remove();
    this.overlayEl_ = null;
    this.player_ = null;
  }

  /** Public API, reachable through player.getPlugin(). */
  toggle () {
    this.overlayEl_.hidden = !this.overlayEl_.hidden;
  }

  /** @private */
  onStateChanged_ (event) {
    this.set_('state', STATE_NAMES[event.detail.currentState] ?? event.detail.currentState);
  }

  /** @private */
  onBitrateChanged_ (event) {
    const {width, height, bandwidth} = event.detail;
    const kbps = bandwidth ? `, ${Math.round(bandwidth / 1000)} kbps` : '';
    this.set_('video', `${width}×${height}${kbps}`);
  }

  /** @private */
  updatePosition_ () {
    const position = this.player_.getPosition();
    const ahead = this.player_.getBufferInfo().bufferedAheadOf(position);
    this.set_('position', formatTime(position));
    this.set_('buffer', `${ahead.toFixed(1)} s ahead`);
  }

  /** @private */
  createOverlay_ (containerEl) {
    this.overlayEl_ = document.createElement('div');
    this.overlayEl_.className = 'stats-overlay';
    const dl = document.createElement('dl');
    for (const name of ['source', 'type', 'state', 'video', 'position', 'buffer']) {
      const dt = document.createElement('dt');
      dt.textContent = name;
      const dd = document.createElement('dd');
      dd.textContent = '–';
      this.fields_[name] = dd;
      dl.append(dt, dd);
    }
    this.lifecycleEl_ = document.createElement('ol');
    this.overlayEl_.append(dl, this.lifecycleEl_);
    containerEl.append(this.overlayEl_);
  }

  /** @private */
  set_ (name, value) {
    this.fields_[name].textContent = value;
  }

  /** @private */
  logLifecycle_ (callbackName) {
    const li = document.createElement('li');
    li.textContent = callbackName;
    this.lifecycleEl_.append(li);
    // Keep only the most recent callbacks.
    while (this.lifecycleEl_.children.length > 5) {
      this.lifecycleEl_.firstElementChild.remove();
    }
  }
}

StatsOverlayPlugin.Id = 'stats-overlay';

/**
 * The player calls create() for every new player instance. Options passed
 * to the factory are shared by all plugin instances it creates.
 *
 * @implements {clpp.PlayerPluginFactory}
 */
class StatsOverlayPluginFactory {
  constructor (options = {}) {
    this.options_ = {refreshMs: 500, ...options};
  }

  /** @override */
  create (playerConfig) {
    return new StatsOverlayPlugin(this.options_);
  }
}

function formatTime (seconds) {
  if (!Number.isFinite(seconds)) {
    return '–';
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

clpp.log.setLogLevel(clpp.log.Level.INFO);

// Register the plugin factory *before* creating the player. Every player
// created afterwards gets its own plugin instance.
clpp.Player.registerPlugin(new StatsOverlayPluginFactory({refreshMs: 250}));

const videoEl = document.getElementById('video');
const containerEl = videoEl.parentElement;
const player = new clpp.Player(videoEl, { }, { containerEl });

document.getElementById('loadButton').addEventListener('click', () => {
  player.open({
    source: document.getElementById('sourceUrl').value,
    autoplay: true,
    muted: true,
  });
});

document.getElementById('toggleButton').addEventListener('click', () => {
  player.getPlugin(StatsOverlayPlugin.Id).toggle();
});

player.on('error', (event) => {
  const error = event.detail;
  if (error) {
    console.warn('Error:', error);
  }
});
