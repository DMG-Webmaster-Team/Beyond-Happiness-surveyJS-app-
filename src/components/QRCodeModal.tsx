"use client";

import { useRef } from "react";
import { QRCodeSVG as QRCode } from "qrcode.react";

interface QRCodeModalProps {
  surveyId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function QRCodeModal({
  surveyId,
  isOpen,
  onClose,
}: QRCodeModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Generate the survey URL
  const surveyUrl = `${window.location.origin}/user/survey/${surveyId}`;

  // Function to download QR code as SVG (simpler and more reliable)
  const downloadQRCode = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (svg) {
      // Clone the SVG to avoid modifying the original
      const svgClone = svg.cloneNode(true) as SVGElement;

      // Get SVG data
      const svgData = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      // Download as SVG
      const link = document.createElement("a");
      link.download = `survey-${surveyId}-qr.svg`;
      link.href = url;
      link.click();

      // Clean up
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/70 z-40"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="relative z-50 w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 border-b bg-blue-400 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-black hover:text-gray-700 p-2"
            aria-label="Close"
          >
            ✕
          </button>
          <h2 className="text-xl text-black font-semibold pr-8">
            Survey QR Code
          </h2>
          <h5 className="text-md text-black opacity-90 mt-1">
            Scan to access survey
          </h5>
        </div>

        <div className="p-6">
          <div className="text-center space-y-4">
            {/* QR Code */}
            <div
              ref={qrRef}
              className="flex justify-center p-4 bg-white border-2 border-gray-200 rounded-lg"
            >
              <QRCode
                value={surveyUrl}
                size={200}
                level="M"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>

            {/* Survey URL */}
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-2">Survey URL:</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">
                {surveyUrl}
              </code>
            </div>

            {/* Download Button */}
            <button
              onClick={downloadQRCode}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Download QR Code
            </button>

            {/* Instructions */}
            <p className="text-xs text-gray-500 mt-4">
              Users can scan this QR code with their phone camera to quickly
              access the survey.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
