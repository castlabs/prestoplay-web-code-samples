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

### Playlist

- [Playlist](examples/playlist/playlist.html) — Play DASH and HLS items back-to-back with previous/next controls

### Plugins

- [Custom plugin](examples/plugins/stats_overlay.html) — Stats overlay plugin that shows the plugin lifecycle

### Advertising

- [Google IMA ads](examples/advertising/ima.html) — Client-side pre-, mid-, and post-roll ads with an ad event log

### Thumbnails

- [Basic thumbnail rendering](examples/thumbnails/thumbnails.html) — Retrieve thumbnails for a DASH stream

### Subtitles

- [Subtitle text styling](examples/subtitles/text_style.html) — Configure subtitle font, color, background, and edge styling
- [SRT subtitles](examples/subtitles/srt.html) — Side-load SubRip (SRT) subtitles for a DASH stream

### Analytics

- [Conviva analytics](examples/analytics/conviva.html) — Basic DASH playback with Conviva analytics enabled
- [Mux Data analytics](examples/analytics/muxdata.html) — Basic DASH playback with Mux Data enabled
- [NPAW v7 analytics](examples/analytics/npaw_v7.html) — Basic DASH playback with NPAW v7 analytics enabled

### Audio

- [Audio player](examples/audio/audio.html) — Audio-only HLS playback with an audio element and custom controls

[PRESTOplay for Web Apps]: https://demo.castlabs.com/
