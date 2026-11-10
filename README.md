# PRESTOplay Web Code Samples

This repo is your hands-on guide to getting the most out of [PRESTOplay
for Web Apps]. It is packed with ready-to-run code samples covering everything
from basic playback to advanced OTT video player features.

- [NPM](https://www.npmjs.com/package/@castlabs/prestoplay)
- [Home page](https://castlabs.com/playback/prestoplay/browsers/)
- [API reference](https://players.castlabs.com/web/latest/docs/api)
- [Manual](https://docs.castlabs.com/prestoplay/web/)
- [Demo page](https://demo.castlabs.com/)
- [Contact us](https://castlabs.com/contact/)

## Try it out

To run the code samples install the SDK

```sh
npm i
```

Serve the HTML files

```sh
npx http-server -c-1
```

Open http://127.0.0.1:8080 and choose a code sample to run.

Some samples use third-party libraries or plugins and may require additional
configuration before they work in your environment. Places that need to be
updated are marked with `TODO`.

## Samples

### General

- [Basic example](examples/basic.html) — Load and play a stream with HLS/DASH support
- [React integration](examples/react/react.html) — React player component with play/pause, seek bar, and fullscreen

### Player

- [Player configuration](examples/player/configuration.html) — Autoplay and the browser autoplay policy, start time, volume, buffering goals, and retries
- [Player surface](examples/player/surface.html) — Custom container element, an overlay on the video, and style overrides
- [Simple UI](examples/player/simple_ui.html) — Minimal custom UI with a poster image and a big play button
- [Smart TV](examples/player/smart_tv.html) — Suspend and resume handling, a memory-friendly configuration, and remote control keys for Tizen and webOS

### DRM

- [DRMtoday playback](examples/drm/drmtoday.html) — DRM-protected DASH playback with licenses from DRMtoday
- [DRMtoday Onboard](examples/drm/onboard.html) — DRM-protected DASH playback with licenses from DRMtoday Onboard, the offline DRMtoday for private networks
- [Custom license server](examples/drm/header_drm.html) — Widevine, PlayReady, and FairPlay license servers that authorize requests with HTTP headers
- [Persistent license](examples/drm/persistent_license.html) — Store a DRM license on the device, reuse it, and remove it
- [Custom DRM environment](examples/drm/license_modifiers.html) — Custom DRM environment with license modifiers that authorize requests and unwrap JSON-wrapped licenses
- [Custom FairPlay key request](examples/drm/fairplay_custom_payload.html) — FairPlay license modifiers that build the key request with your own content ID and talk to a JSON license API
- [Multiple DRM environments](examples/drm/multiple_environments.html) — One player that switches between assets whose licenses come from DRMtoday and from another license server
- [Verimatrix VCAS Ultra](examples/drm/verimatrix_vcas.html) — DRM-protected DASH or HLS playback with Widevine, PlayReady, and FairPlay licenses from Verimatrix VCAS Ultra

### Live

- [Low-latency live](examples/live/low_latency.html) — Live DASH playback close to the live edge with live edge chasing
- [Live delay](examples/live/live_delay.html) — Control how far behind the live edge DASH and HLS live streams play
- [Fast channel zapping](examples/live/fast_zapping.html) — Switch between live channels quickly with the experimental McPlaylist, which preloads the neighboring channels

### Playlist

- [Playlist](examples/playlist/playlist.html) — Play DASH and HLS items back-to-back with previous/next controls
- [Seamless playlist](examples/playlist/sc_playlist.html) — Continuous back-to-back playback with the experimental ScPlaylist, with timeline windows, timeline modes, cropping, and cues

### Plugins

- [Custom plugin](examples/plugins/stats_overlay.html) — Stats overlay plugin that shows the plugin lifecycle

### Advertising

- [Google IMA ads](examples/advertising/ima.html) — Client-side pre-, mid-, and post-roll ads with an ad event log
- [Ad UI and skipping](examples/advertising/ad_ui.html) — Custom player UI during ads: ad label with countdown, play/pause, seek controls disabled during ads, and a skip button
- [SIMID interactive ads](examples/advertising/simid.html) — L-banner overlay creatives at set times of the content, with SIMID events

### 360° video

- [360° video](examples/vr/vr.html) — Equirectangular 360° playback with mouse and touch dragging, and camera control from code

### Thumbnails

- [DASH embedded thumbnails](examples/thumbnails/thumbnails.html) — Thumbnails declared in the DASH manifest, no configuration needed
- [Single-image thumbnails](examples/thumbnails/single.html) — One image per thumbnail from a URL template (SINGLE mode)
- [Grid thumbnails](examples/thumbnails/grid.html) — Sprite sheets with many thumbnails each, from a URL template (GRID mode)
- [WebVTT thumbnails](examples/thumbnails/webvtt.html) — A WebVTT file that maps time ranges to sprite sheet regions (WEBVTT mode)
- [BIF thumbnails](examples/thumbnails/bif.html) — A single binary BIF file, the Roku thumbnail format (BIF mode)

### Tracks

- [Audio and subtitle tracks](examples/tracks/tracks.html) — Initial language selection with fallbacks, and switching audio, subtitles, and video quality

### Subtitles

- [Subtitle text styling](examples/subtitles/text_style.html) — Configure subtitle font, color, background, and edge styling
- [SRT subtitles](examples/subtitles/srt.html) — Side-load SubRip (SRT) subtitles for a DASH stream
- [WebVTT and TTML subtitles](examples/subtitles/sidecar.html) — Side-load WebVTT and TTML subtitles for DASH and HLS streams

### Networking

- [Request and response modifiers](examples/network/request_modifiers.html) — Add auth headers and query parameters, and rewrite the manifest
- [CMCD](examples/network/cmcd.html) — Send Common Media Client Data (CMCD) with media requests

### Events

- [Timeline cues](examples/events/timeline_cues.html) — React to SCTE-35 events in a DASH manifest and EXT-X-DATERANGE tags in HLS
- [Player events](examples/events/player_events.html) — Log HTML5 media events and PRESTOplay events, listen once, and remove a listener
- [Error handling](examples/events/errors.html) — Error event and rejected Promise, error category and severity, and network retry attempts

### Casting

- [Chromecast sender](examples/cast/chromecast_sender.html) — Cast the player content to a Chromecast device and control it
- [Chromecast receiver](examples/cast/chromecast_receiver.html) — Custom Web Receiver app with a queue, track info, and custom messages for the sender
- [AirPlay](examples/cast/airplay.html) — Play HLS on an AirPlay device from Safari

### Analytics

- [Conviva analytics](examples/analytics/conviva.html) — Basic DASH playback with Conviva analytics enabled
- [Mux Data analytics](examples/analytics/muxdata.html) — Basic DASH playback with Mux Data enabled
- [Broadpeak analytics and SSAI](examples/analytics/broadpeak.html) — Broadpeak SmartLib analytics and server-side ad tracking with an ad countdown and skip button (needs a Broadpeak stream)
- [NPAW v7 analytics](examples/analytics/npaw_v7.html) — Basic DASH playback with NPAW v7 analytics enabled

### Audio

- [Audio player](examples/audio/audio.html) — Audio-only HLS playback with an audio element and custom controls

[PRESTOplay for Web Apps]: https://demo.castlabs.com/
