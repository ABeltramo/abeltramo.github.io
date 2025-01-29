---
date: 2025-01-29
title: "Beyond USB: Improving Virtual Controller Support in Linux Games"
description: "How understanding SDL2's driver selection led to better virtual controller support"
---

## Recap

I've been working on an open source project called [inputtino](https://github.com/games-on-whales/inputtino):
a library that allows you to create and use virtual input devices (ex: mouse, keyboard, joypads) on Linux.

In the [first post]({{< ref "inputtino-uhid-1" >}}), we have gone to the depts of SDL to understand why `uinput` wasn't
able to expose the advanced features of a DualSense controller.

Moving to the [second post]({{< ref "inputtino-uhid-2" >}}), we've managed to create a virtual PlayStation DualSense
controller using [UHID](https://kernel.org/doc/html/latest/hid/uhid.html) that supported some of the advanced features
like Gyroscope, Accelerometer, and Touchpad.

Whilst the implementation seemed to work with Steam, users reported issues[^1] [^2] with the **controller not being
recognized by some games**; in particular, the ones that should support natively the DualSense capabilities. On top of
that, SDL2 seems incapable to expose some of the advanced features like LED, battery and touchpad. Since SDL is open
source, and we are already familiar with the codebase, that's the perfect candidate to start deep diving.

[^1]: https://github.com/LizardByte/Sunshine/issues/3468

[^2]: https://github.com/games-on-whales/inputtino/issues/16

## SDL2 and DualSense on Linux

We've briefly mentioned in the [first post]({{< ref "inputtino-uhid-1" >}}) that SDL2 uses different drivers to
communicate with joypads.  
When using our virtual joypads SDL2 tries to use the `hidapi` driver and fails, falling back to the `sysjoystick`
driver. This driver is a generic one that is lacking advanced features; for example: here's the implementation
of [LINUX_JoystickSetLED](https://github.com/libsdl-org/SDL/blob/0efe8892d6c667f9fc712e094d40e8ec7c742a25/src/joystick/linux/SDL_sysjoystick.c#L1727-L1730):

```c 
static int LINUX_JoystickSetLED(SDL_Joystick *joystick, Uint8 red, Uint8 green, Uint8 blue)
{
    return SDL_Unsupported();
}
```

Ok, that explains why some of the features aren't exposed by SDL when accessing our virtual joypad.

So, how can we make SDL2 use the `hidapi` driver for our virtual joystick like it does for a real DualSense instead?
It's time to dive back into the SDL2 source code!

![meme: back to the future, we have to go back](/go-back-meme.jpg)

### The HIDAPI driver

[hidapi](https://github.com/libusb/hidapi) is a multiplatform library that allows applications to interface with USB and
Bluetooth HID devices. On linux there are two main backends: `hidraw` and `libusb`, we are going to focus on the first
one for reasons that will be clear later[^3].

[^3]: **Spoiler alert**: since we are going to implement a virtual Bluetooth device, `libusb` is not an option for us.
Only `hidraw` supports both Bluetooth and USB devices.

`hidraw` interfaces with the kernel's `HID` subsystem directly through `/dev/hidraw*` devices. This is in contrast with
the previously mentioned `sysjoistick` which instead works via the Linux input subsystem (
`/dev/input/js*` or more recently `/dev/input/event*`): a more generic interface that works with any kind of "device
that can be represented as a joystick", but it lacks the ability to access advanced features.

By accessing to our virtual devices via `hidraw` an application would be able to get full access to the `UHID` reports
that we are sending (and receiving) to the kernel. The full implementation in SDL2 resides in
[SDL_hidapi_ps5.c](https://github.com/libsdl-org/SDL/blob/main/src/joystick/hidapi/SDL_hidapi_ps5.c)

### Why hidraw doesn't pick up our virtual DualSense?

After debugging the SDL2 code I've found the place where `hidraw` will fail to open our virtual
joypad: [hid.c#L601-L620](https://github.com/libsdl-org/SDL/blob/0efe8892d6c667f9fc712e094d40e8ec7c742a25/src/hidapi/linux/hid.c#L601-L620):

```c 
switch (bus_type) {
    case BUS_USB:
        /* The device pointed to by raw_dev contains information about
           the hidraw device. In order to get information about the
           USB device, get the parent device with the
           subsystem/devtype pair of "usb"/"usb_device". This will
           be several levels up the tree, but the function will find
           it. */
        usb_dev = udev_device_get_parent_with_subsystem_devtype(
                raw_dev,
                "usb",
                "usb_device");

        if (!usb_dev) {
            /* Free this device */
            // ...
            /* Take it off the device list. */
```

It seems that for our device created via `uhid` we don't have a parent USB device (understandably so), the check fails
and our device is doomed to be opened by the fallback `sysjoystick` driver.

💡 this seems to be specific to `BUS_USB` but a DualSense joypad can also be connected via Bluetooth. What's the code
doing there?

```c 
case BUS_BLUETOOTH:
    /* Manufacturer and Product strings */
    cur_dev->manufacturer_string = wcsdup(L"");
    cur_dev->product_string = utf8_to_wchar_t(product_name_utf8);

    break;
```

Well well well, that seems rather straightforward. Could it be that we just need to change our virtual joypad to be a
Bluetooth one?

## Implementing a virtual Bluetooth DualSense

Luckily, most of the USB code can be reused for Bluetooth. The data exchanged via `uhid` is slightly different but the
main structure and expected values are the same. For the most curious, here's
the [full PR that implements it](https://github.com/games-on-whales/inputtino/pull/19).

There are a few notable additions to the code:

- The `UHID_CREATE2` event now uses `BUS_BLUETOOTH` instead of `BUS_USB` and a slightly different report descriptor
  (always thanks to [nondebug/dualsense](https://github.com/nondebug/dualsense))
- I had to add a background thread that will keep sending the current joypad state to the kernel even if there's no
  change. For example, I've found that SDL
  was [timing out during initialization](https://github.com/libsdl-org/SDL/blob/0efe8892d6c667f9fc712e094d40e8ec7c742a25/src/joystick/hidapi/SDL_hidapi_ps5.c#L384-L385)
  if the joypad wasn't sending any data after `16ms`
- Bluetooth communications on a DualSense device involved a `CRC32` checksum of each message appended at the end. I
  wrote a short note about the implementation [in here]({{<ref "/notes/crc32-embedded-cpp.md">}}) if you are interested
  in the details.

## Does it work?

![it works on my machine sticker](/womm.png)

I've tested it on my machine where Helldivers 2 wasn't taking any input without Steam Input enabled before, and it's now
perfectly working with the Bluetooth variant. [@hgaiser](https://github.com/hgaiser) also reported that Horizon Zero
Dawn Forbidden West is now working as expected.

We'll see how this will work out in the
wild [for other users](https://github.com/LizardByte/Sunshine/issues/3468#issuecomment-2616592598)!

> Ai posteri l'ardua sentenza.
