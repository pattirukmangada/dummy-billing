// src/lib/print-usb.ts
// Raw ESC/POS via WebUSB — Chrome & Edge only.
// Safari/Firefox are not supported for direct USB printing.

export type UsbResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'no_device' | 'error'; message: string }

let _cachedDevice: USBDevice | null = null

export function isWebUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator
}

export async function sendToUsb(bytes: Uint8Array): Promise<UsbResult> {
  if (!isWebUsbSupported()) {
    return {
      ok: false,
      reason: 'unsupported',
      message:
        'Direct USB printing requires Chrome or Edge.\n\n' +
        'Safari does not support WebUSB.\n' +
        'Please open this site in Chrome to use direct printing.',
    }
  }

  try {
    // Reuse cached device if still open
    if (!_cachedDevice || !_cachedDevice.opened) {
      const paired = await navigator.usb.getDevices()
      // Prefer printer class (7) or any previously paired device
      const existing = paired.find(
        (d: USBDevice) => d.deviceClass === 7 || d.deviceClass === 0 || d.vendorId !== 0
      )
      _cachedDevice = existing ?? await navigator.usb.requestDevice({ filters: [] })
    }

    const device = _cachedDevice

    if (!device.opened) await device.open()
    if (device.configuration === null) await device.selectConfiguration(1)

    const interfaceNumber = device.configuration!.interfaces[0].interfaceNumber
    await device.claimInterface(interfaceNumber)

    const outEndpoint = device.configuration!.interfaces[0].alternates[0].endpoints.find(
      (e: USBEndpoint) => e.direction === 'out' && e.type === 'bulk'
    )

    if (!outEndpoint) {
      await device.releaseInterface(interfaceNumber)
      return {
        ok: false,
        reason: 'error',
        message: 'Printer bulk-OUT endpoint not found.\nMake sure the correct USB device is selected.',
      }
    }

    await device.transferOut(outEndpoint.endpointNumber, bytes.buffer as ArrayBuffer)
    await device.releaseInterface(interfaceNumber)

    return { ok: true }

  } catch (err: any) {
    if (err?.name === 'NotFoundError' || err?.code === 18) {
      return { ok: false, reason: 'no_device', message: 'No printer selected.' }
    }
    console.warn('[WebUSB]', err)
    _cachedDevice = null
    return {
      ok: false,
      reason: 'error',
      message: String(err?.message ?? err),
    }
  }
}

export function forgetUsbDevice(): void {
  _cachedDevice = null
}
