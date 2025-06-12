---
date: 2025-06-12
title: "Road to zero copy in Wolf"
description: "How we've achieved a true zero copy pipeline from the Wayland render buffer to the video encoder in Gstreamer"
---

TL;DR: after implementing a proper zero-copy pipeline, we've recorded a massive decrease in GPU utilization whilst
allowing for much higher FPS both in-game and on the encoded stream.

{{< vega src="vega-chart.json" >}}

----

# Zero what?

Let's take a step back; [Wolf](https://github.com/games-on-whales/wolf) is an open source server
for [Moonlight](https://moonlight-stream.org/) that allows streaming a full desktop to multiple isolated client
sessions.

To create virtual desktops on the fly, we've created a custom-made micro Wayland compositor that can run completely
headless: [gst-wayland-display](https://github.com/games-on-whales/gst-wayland-display). The basic idea is that we want
to directly push the raw framebuffer in a pipeline that will allow us to efficiently encode it in a chosen format (
`H.264`, `HEVC` or `AV1`) and ultimately push it to remote Moonlight clients.

{{< plantuml id="high-level" >}}
@startuml
skinparam componentStyle rectangle

frame "Applications" {
[Video Game]
[Steam]
}

frame "Wolf" #lightblue {
[Wayland Compositor]
[Video encoding]
}

cloud {
[Moonlight]
}

[Video Game] --> [Vulkan image]
[Vulkan image] --> [Wayland Compositor]

[Steam] --> [GL Texture]
[GL Texture] --> [Wayland Compositor]

[Wayland Compositor] -right-> [Video encoding]
[Video encoding] -right-> [Moonlight]
@enduml
{{< /plantuml >}}

Now, the goal here is to **pass the framebuffer from the Wayland Compositor directly into the video encoder** so that we
don't waste time copying the data back and forth from the GPU to system RAM. That's what **zero-copy** refers to!  
The common way to efficiently share memory without going through the CPU in Linux is by
using [DMA Buffers](https://www.kernel.org/doc/html/latest/driver-api/dma-buf.html) (Direct Memory Access).

Our audio and video framework of choice is [Gstreamer](https://gstreamer.freedesktop.org/) which, historically, was
lacking proper support for DMA buffers.
This [forced us to copy the framebuffer from GPU into RAM](https://games-on-whales.github.io/wolf/stable/dev/wayland.html#_gstreamer)
so that we could pass it in input to the Gstreamer pipeline. The HW encoder will then have to copy this back out into
the GPU to finally produce a valid encoded video frame.

Everything changed with the Gstreamer [release 1.24](https://gstreamer.freedesktop.org/releases/1.24/) which added full
support for exchanging complex non-linear video formats.

# DMA Buffers in gst-wayland-display

The first step in our journey is to add support for DMA Buffers in our `gst-wayland-display` compositor, so that we can
start producing and feeding the Gstreamer pipeline with them. The work has been done
in [#8](https://github.com/games-on-whales/gst-wayland-display/pull/8) and it mainly focuses on three areas:

- Make the compositor render directly into a DMA Buffer to avoid extra copies
- Wrap the resulting DMA Buffer containing a frame into a valid `GstBuffer` so that we can feed it into the pipeline
- Implement all the necessary code in order to "agree" with the downstream encoders on which specific video format to
  use.

The first two points were fairly straightforward, just a matter of creating the right abstractions (so that we could
still support the previous "safe" pipeline) and glue together the rest. The last item was definitely the most
challenging.

## Excursus: what are GStreamer Caps?

> [!TIP]
> The
> [official Gstreamer docs](https://gstreamer.freedesktop.org/documentation/additional/design/dmabuf.html?gi-language=c)
> on DMA buffers are very well-written, I highly suggest them if you want to go deep into the details.

GStreamer **caps** (capabilities) are like a contract that describes what kind of data flows between elements in a
pipeline. You can think of them as a detailed specification that says, "I can produce/consume video data with these
exact
properties: resolution, format, framerate, etc."

For example, here's a simple video CAP:

```
video/x-raw, format=NV12, width=1920, height=1080, framerate=30/1
```

_Caps negotiation_ is the process where GStreamer elements "agree" on a common data format before data starts flowing.
DMA buffers add complexity because they're not just about pixel formats, they also involve **hardware-specific memory
layouts**, here's an example DMA format:

```
video/x-raw(memory:DMABuf), format=DMA_DRM, drm-format=NV12:0x0100000000000001
```

The `drm-format` field combines:

- **DRM fourcc**: The pixel format (like NV12, ARGB8888)
- **DRM modifier**: Hardware-specific memory layout (tiling, compression, etc.)

Unlike regular video formats, DMA buffer capabilities often can't be hardcoded in advance. They are dependent on the
actual HW, drivers, runtime, ...

So at runtime we'll first query `EGL` for which formats are supported by the current environment, and we'll then fire
those formats to the downstream plugins in Gstreamer. Similarly, the selected HW encoder plugin will have its own logic
to determine which formats are acceptable in input, and it'll expose those caps in the pipeline.  
Ultimately, if there's at least one format that works for all the plugins involved, everything will work
and the pipeline will happily start crunching.

# Plugging it all together

Obviously, things aren't that simple; we can't directly produce the formats that are expected in input for the encoders.
Luckily for us there are specific plugins that are able to convert from one format to another just by applying `shaders`
so that everything still lives in the GPU and we don't have to copy to system memory.

The following is an example `VAAPI` pipeline where the DMA buffer gets imported into `VAMemory` by `vapostproc`,
converted to a different format that can be accepted by `vaav1enc` and ultimately exits as a properly encoded
`video/x-h265`.

{{< plantuml id="pipeline" >}}
@startuml
skinparam componentStyle rectangle

[Wayland compositor] -right-> [vapostproc] : DMA format AR30
[vapostproc] -right-> [vah265enc] : VAMemory format NV12
[vah265enc] -right-> [h265parse] : video/x-h265

@enduml
{{< /plantuml >}}

The full actual working pipeline that you can launch with `gst-launch-1.0`

```
waylanddisplaysrc ! 'video/x-raw(memory:DMABuf),width=2560,height=1600,framerate=60/1' ! vapostproc ! 'video/x-raw(memory:VAMemory), format=NV12' ! vah265enc ! h265parse ! 'video/x-h265, profile=main, stream-format=byte-stream'
```

The resulting pipeline is **zero-copy** and the results are quite astonishing as you can see from the chart on top.
