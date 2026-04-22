// src/lib/print-usb.ts
//
// Sends raw ESC/POS bytes directly from the browser to the TVS 3230 AWB
// (or any ESC/POS printer) via WebUSB — no server, no LAN, works from
// Hostinger or any URL.
//
// Browser support: Chrome 61+, Edge 79+, Opera.
// NOT supported: Firefox, Safari.  Those fall back to window.print().
//
// How it works:
//  1. First print: browser shows a one-time "Select a USB device" picker.
//     User selects the printer and clicks Connect.
//  2. The device handle is cached in `_cachedDevice` for the page session.
//     Subsequent prints are silent — no picker, no dialog.
//  3. Bytes go straight to the printer's bulk-OUT endpoint.
//
// USB setup (one time per computer):
//  • Windows: install Zadig (https://zadig.akeo.ie) and replace the driver
//    with WinUSB for the TVS 3230 AWB — only needed if the printer normally
//    uses a vendor driver.  Skip this if it already prints via USB normally.
//  • macOS: no driver change needed; WebUSB works out of the box.

export type UsbResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'no_device' | 'error'; message: string }

// Cache the paired device for the lifetime of the page.
let _cachedDevice: USBDevice | null = null

/** Returns true if WebUSB is available in this browser. */
export function isWebUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator
}

/**
 * Send raw ESC/POS bytes to the USB printer.
 *
 * On the very first call the browser shows a device picker.
 * After the user picks the printer once, subsequent calls are silent.
 */
export async function sendToUsb(bytes: Uint8Array): Promise<UsbResult> {
  // ── 1. Feature detect ────────────────────────────────────────────────────
  if (!isWebUsbSupported()) {
    return {
      ok: false,
      reason: 'unsupported',
      message:
        'WebUSB is not supported in this browser.\n' +
        'Use Chrome or Edge to print via USB.\n' +
        'Firefox and Safari will use the print dialog instead.',
    }
  }

  try {
    // ── 2. Get device (show picker only on first call) ───────────────────
    if (!_cachedDevice || !_cachedDevice.opened) {
      // Try to get a previously-paired device without showing the picker.
      const paired = await navigator.usb.getDevices()
      // Accept any printer-class or vendor-specific device
      const existing = paired.find(
        d => d.deviceClass === 0 || d.deviceClass === 7 || d.vendorId !== 0
      )

      if (existing) {
        _cachedDevice = existing
      } else {
        // Show the one-time picker — accepts any USB device so the user
        // can select whichever printer is connected.
        _cachedDevice = await navigator.usb.requestDevice({ filters: [] })
      }
    }

    const device = _cachedDevice

    // ── 3. Open + claim ──────────────────────────────────────────────────
    if (!device.opened) await device.open()

    // Select configuration 1 (standard for most printers)
    if (device.configuration === null) {
      await device.selectConfiguration(1)
    }

    // Claim the first interface (index 0).  Most ESC/POS printers expose
    // a single interface.  If yours has multiple, try 0 first.
    const interfaceNumber = device.configuration!.interfaces[0].interfaceNumber
    await device.claimInterface(interfaceNumber)

    // ── 4. Find the bulk-OUT endpoint ────────────────────────────────────
    const iface = device.configuration!.interfaces[0]
    const altSetting = iface.alternates[0]
    const outEndpoint = altSetting.endpoints.find(
      e => e.direction === 'out' && e.type === 'bulk'
    )

    if (!outEndpoint) {
      await device.releaseInterface(interfaceNumber)
      return {
        ok: false,
        reason: 'error',
        message:
          'Could not find the printer bulk-OUT endpoint.\n' +
          'Make sure the correct USB device is selected.',
      }
    }

    // ── 5. Send bytes ────────────────────────────────────────────────────
    await device.transferOut(outEndpoint.endpointNumber, bytes)

    // Release (but keep open for subsequent prints in the same session)
    await device.releaseInterface(interfaceNumber)

    return { ok: true }

  } catch (err: any) {
    // User cancelled the picker
    if (err?.name === 'NotFoundError' || err?.code === 18) {
      return { ok: false, reason: 'no_device', message: 'No printer selected.' }
    }
    // Device disconnected or denied
    console.warn('[WebUSB]', err)
    _cachedDevice = null  // clear cache so next attempt shows picker again
    return {
      ok: false,
      reason: 'error',
      message: String(err?.message ?? err),
    }
  }
}

/**
 * Clear the cached USB device.
 * Call this if you want to force the device picker to appear again.
 */
export function forgetUsbDevice(): void {
  _cachedDevice = null
}
