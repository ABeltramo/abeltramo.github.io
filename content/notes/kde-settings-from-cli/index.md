+++
title = "Control KDE settings from CLI"
date = 2025-05-30
description = "How can you change the desktop settings when you can't click on things?"
+++

Thanks to donations to Games on Whales I've been able to buy a new GPU: the *Gigabyte Radeon RX 9070 Gaming OC*.  
My dev/gaming machine was a dual GPU desktop
so that I could easily switch between vendors when developing Wolf composed of:

- Nvidia 3070 FE
- Intel ARC A380

I wanted to switch the low-powered Intel ARC for the newest AMD champ so that I could get a dual AMD/Nvidia monstrosity
in order to properly work on Wolf for both proprietary (Nvidia) and open source drivers (AMD).

Should be easy, right?

![A GIF of a monitor showing artifacts and glitches across the whole screen](/AMD_video_bug.gif)

After a bit of Googling, luckily, I've stumbled
upon [this post](https://discuss.kde.org/t/fix-rx-9070-9070xt-on-kde-plasma-wayland-distortion-and-flickering/32866),
which redirects to [this issue](https://gitlab.freedesktop.org/drm/amd/-/issues/4057)

> TLDR: Under your display configuration in System Settings, Make sure colour accuracy is set to “Prefer efficiency”
> instead of “Prefer color accuracy”

Right, **so how do I access the system settings without being able to use the desktop?** `ssh` to the rescue!

First off, I've found that `kscreen-console` can output the full configuration currently in use:

```
WAYLAND_DISPLAY=wayland-0 kscreen-console config
```

> [!TIP]
> I had to add `WAYLAND_DISPLAY=wayland-0`

```json
[
  {
    "data": [
      {
        "allowSdrSoftwareBrightness": false,
        "autoRotation": "InTabletMode",
        "brightness": 1,
        "colorProfileSource": "sRGB",
        "connectorName": "DP-4",
        "edidHash": "3cce69334fe08e9b940191c5e8e3e01c",
        "edidIdentifier": "SAM 3524 810571851 42 2017 0",
        "highDynamicRange": false,
        "iccProfilePath": "",
        "mode": {
          "height": 1440,
          "refreshRate": 99982,
          "width": 3440
        },
        "overscan": 0,
        "rgbRange": "Automatic",
        "scale": 1.25,
        "sdrBrightness": 200,
        "sdrGamutWideness": 0,
        "transform": "Normal",
        "vrrPolicy": "Automatic",
        "wideColorGamut": false
      },
      {
        "allowSdrSoftwareBrightness": false,
        "autoRotation": "InTabletMode",
        "brightness": 1,
        "colorPowerTradeoff": "PreferAccuracy",
        "colorProfileSource": "EDID",
        "connectorName": "DP-1",
        "edidHash": "953a036f5c883ffd36adf6067f801fc5",
        "edidIdentifier": "PHL 4101 59204 33 2024 0",
        "highDynamicRange": true,
        "iccProfilePath": "",
        "mode": {
          "height": 1440,
          "refreshRate": 120000,
          "width": 3440
        },
        "overscan": 0,
        "rgbRange": "Automatic",
        "scale": 1.25,
        "sdrBrightness": 250,
        "sdrGamutWideness": 1,
        "transform": "Normal",
        "vrrPolicy": "Automatic",
        "wideColorGamut": true
      },
      {
        "allowSdrSoftwareBrightness": true,
        "autoRotation": "InTabletMode",
        "brightness": 1,
        "colorProfileSource": "sRGB",
        "connectorName": "DP-4",
        "edidHash": "a3cae9308e7f29b9beb9ded17c6582d3",
        "edidIdentifier": "PHL 4101 1010101 31 2023 0",
        "highDynamicRange": false,
        "iccProfilePath": "",
        "mode": {
          "height": 1440,
          "refreshRate": 120000,
          "width": 3440
        },
        "overscan": 0,
        "rgbRange": "Automatic",
        "scale": 1.25,
        "sdrBrightness": 200,
        "sdrGamutWideness": 0,
        "transform": "Normal",
        "vrrPolicy": "Automatic",
        "wideColorGamut": false
      },
      {
        "allowSdrSoftwareBrightness": true,
        "autoRotation": "InTabletMode",
        "brightness": 1,
        "colorProfileSource": "sRGB",
        "connectorName": "Unknown-1",
        "highDynamicRange": false,
        "iccProfilePath": "",
        "mode": {
          "height": 768,
          "refreshRate": 59999,
          "width": 1024
        },
        "overscan": 0,
        "rgbRange": "Automatic",
        "scale": 1,
        "sdrBrightness": 200,
        "sdrGamutWideness": 0,
        "transform": "Normal",
        "vrrPolicy": "Automatic",
        "wideColorGamut": false
      }
    ],
    "name": "outputs"
  }
]
```

Found it! `"colorPowerTradeoff": "PreferAccuracy"` seems to be exactly what we are looking for, so how do we change
that?
`kscreen-doctor` seems to be the right tool for this job, let's output the current config first:

```bash
WAYLAND_DISPLAY=wayland-0 kscreen-doctor -o
Output: 1 DP-1
	enabled
	connected
	priority 1
	DisplayPort
	Modes:  1:3440x1440@60!  2:3440x1440@120*  3:3440x1440@100  4:3440x1440@30  5:2560x1440@120  6:2560x1080@60  7:2560x1080@60  8:2560x1080@50  9:1920x1200@60  10:1920x1080@120  11:1920x1080@120  12:1920x1080@60  13:1920x1080@60  14:1920x1080@60  15:1920x1080@60  16:1920x1080@60  17:1920x1080@50  18:1920x1080@50  19:1600x1200@60  20:1680x1050@60  21:1280x1024@75  22:1280x1024@60  23:1440x900@60  24:1280x800@60  25:1280x720@60  26:1280x720@60  27:1280x720@60  28:1280x720@50  29:1024x768@100  30:1024x768@75  31:1024x768@70  32:1024x768@60  33:832x624@75  34:800x600@100  35:800x600@75  36:800x600@72  37:800x600@60  38:800x600@56  39:720x576@50  40:720x576@50  41:720x480@60  42:720x480@60  43:720x480@60  44:720x480@60  45:640x480@100  46:640x480@75  47:640x480@73  48:640x480@67  49:640x480@60  50:640x480@60  51:640x480@60  52:720x400@70  53:1600x1200@60  54:1280x1024@60  55:1024x768@60  56:1920x1200@60  57:1280x800@60  58:2560x1440@60  59:1920x1080@60  60:1600x900@60  61:1368x768@60  62:1280x720@60
	Geometry: 0,0 2752x1152
	Scale: 1.25
	Rotation: 1
	Overscan: 0
	Vrr: incapable
	RgbRange: unknown
	HDR: enabled
		SDR brightness: 250 nits
		SDR gamut wideness: 100%
		Peak brightness: 436 nits
		Max average brightness: 436 nits
		Min brightness: 0 nits
	Wide Color Gamut: enabled
	ICC profile: none
	Color profile source: EDID
	Color power preference: prefer accuracy
	Brightness control: supported, set to 100% and dimming to 100%
```

Note that *Color power preference: prefer accuracy*.  
After a bit of trial and error, I've found the right incantation:

```
WAYLAND_DISPLAY=wayland-0 kscreen-doctor output.DP-1.colorPowerTradeoff.preferEfficiency
```

That made my monitor instantly come back alive with the right image!
