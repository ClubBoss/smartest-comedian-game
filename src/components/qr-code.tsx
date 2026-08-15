"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function QrCode({ value, size = 220 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(value, { width: size, margin: 1 })
      .then((dataUrl) => {
        if (!cancelled) setSrc(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
    };
  }, [size, value]);

  return src ? (
    <Image className="qr" src={src} width={size} height={size} unoptimized alt="Join room QR code" />
  ) : null;
}
