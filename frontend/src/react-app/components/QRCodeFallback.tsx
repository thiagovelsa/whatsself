import { useEffect, useRef } from 'react';

interface QRCodeFallbackProps {
  qrData: string;
  size?: number;
}

// Type declaration for the dynamically loaded QRCode library
interface QRCodeOptions {
  width?: number;
  margin?: number;
}

interface QRCodeLib {
  toCanvas: (
    canvas: HTMLCanvasElement,
    data: string,
    options: QRCodeOptions,
    callback: (error: Error | null) => void
  ) => void;
}

declare global {
  interface Window {
    QRCode?: QRCodeLib;
  }
}

export default function QRCodeFallback({ qrData, size = 300 }: QRCodeFallbackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!qrData || !canvasRef.current) return;

    // Fallback: Display raw QR data as text if canvas fails
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);

    // Display loading text
    ctx.fillStyle = 'black';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Try to load qrcode library dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
    script.onload = () => {
      if (window.QRCode) {
        window.QRCode.toCanvas(canvas, qrData, { width: size, margin: 1 }, (error: Error | null) => {
          if (error) {
            console.error('Fallback QR generation failed:', error);
            // Show error message
            ctx.clearRect(0, 0, size, size);
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, size, size);
            ctx.fillStyle = 'red';
            ctx.fillText('QR Code Error', size / 2, size / 2 - 20);
            ctx.fillText('Check console', size / 2, size / 2 + 20);
          }
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup script
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [qrData, size]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="border border-gray-200"
      />
      {/* Fallback: Show copy button for manual QR data */}
      <div className="mt-2">
        <button
          onClick={() => {
            navigator.clipboard.writeText(qrData);
            alert('QR data copied to clipboard!');
          }}
          className="text-xs text-blue-500 hover:text-blue-700 underline"
        >
          Copy QR data to clipboard
        </button>
      </div>
    </div>
  );
}