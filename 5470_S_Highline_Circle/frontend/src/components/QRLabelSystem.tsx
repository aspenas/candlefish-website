import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  QrCodeIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  CameraIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Item, Room, QRLabel } from '../types';

interface QRLabelSystemProps {
  items: Item[];
  rooms: Room[];
  onQRScanned: (itemId: string, photoFile: File) => void;
}

const QRLabelSystem: React.FC<QRLabelSystemProps> = ({
  items,
  rooms,
  onQRScanned
}) => {
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [qrLabels, setQrLabels] = useState<QRLabel[]>([]);
  const [scannerActive, setScannerActive] = useState(false);
  const [scannedCode, setScannedCode] = useState<string>('');
  const [labelPreview, setLabelPreview] = useState<string>('');

  const qrScannerRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate QR code data URL
  const generateQRCode = useCallback(async (data: string): Promise<string> => {
    // Simple QR code generation using a data URL
    // In production, you'd use a proper QR code library like qrcode
    const size = 200;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    canvas.width = size;
    canvas.height = size;

    // Simple placeholder QR pattern (replace with actual QR generation)
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'black';

    // Create a simple pattern that represents a QR code
    for (let i = 0; i < size; i += 10) {
      for (let j = 0; j < size; j += 10) {
        if ((i + j) % 20 === 0) {
          ctx.fillRect(i, j, 8, 8);
        }
      }
    }

    // Add text representation of data
    ctx.fillStyle = 'black';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(data.slice(-8), size / 2, size - 10);

    return canvas.toDataURL('image/png');
  }, []);

  // Generate QR labels for selected items
  const generateLabels = useCallback(async () => {
    const itemsToProcess = selectedRoom
      ? items.filter(item => item.room_id === selectedRoom)
      : items.filter(item => selectedItems.has(item.id));

    const labels: QRLabel[] = [];

    for (const item of itemsToProcess) {
      const qrData = `inv://${item.id}`;
      const qrCode = await generateQRCode(qrData);
      const room = rooms.find(r => r.id === item.room_id);

      labels.push({
        itemId: item.id,
        qrCode,
        itemName: item.name,
        room: room?.name || 'Unknown',
        category: item.category,
        coordinates: { x: 0, y: 0 }
      });
    }

    setQrLabels(labels);
  }, [selectedRoom, selectedItems, items, rooms, generateQRCode]);

  // Generate printable PDF
  const generatePrintablePDF = useCallback(() => {
    if (qrLabels.length === 0) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Labels - Inventory System</title>
        <style>
          @page {
            size: 8.5in 11in;
            margin: 0.5in;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          .label-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            padding: 20px;
          }
          .label {
            border: 2px solid #333;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
            background: white;
            page-break-inside: avoid;
            min-height: 200px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .qr-code {
            width: 120px;
            height: 120px;
            margin: 0 auto 10px;
            border: 1px solid #ddd;
          }
          .item-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 5px;
            word-wrap: break-word;
          }
          .item-details {
            font-size: 11px;
            color: #666;
            margin-bottom: 5px;
          }
          .room-category {
            font-size: 10px;
            color: #888;
            border-top: 1px solid #eee;
            padding-top: 5px;
            margin-top: 10px;
          }
          @media print {
            .label-grid {
              grid-template-columns: repeat(3, 1fr);
            }
          }
        </style>
      </head>
      <body>
        <div class="label-grid">
          ${qrLabels.map(label => `
            <div class="label">
              <div>
                <img src="${label.qrCode}" alt="QR Code" class="qr-code" />
                <div class="item-name">${label.itemName}</div>
                <div class="item-details">ID: ${label.itemId.slice(-8)}</div>
              </div>
              <div class="room-category">
                <div>${label.room}</div>
                <div>${label.category}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for images to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1000);
  }, [qrLabels]);

  // Start QR scanner
  const startScanner = useCallback(async () => {
    try {
      setScannerActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (qrScannerRef.current) {
        qrScannerRef.current.srcObject = stream;
        await qrScannerRef.current.play();
      }
    } catch (error) {
      console.error('Scanner start error:', error);
      setScannerActive(false);
    }
  }, []);

  // Stop QR scanner
  const stopScanner = useCallback(() => {
    if (qrScannerRef.current?.srcObject) {
      const stream = qrScannerRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setScannerActive(false);
  }, []);

  // Process scanned QR code
  const processScannedCode = useCallback((code: string) => {
    if (code.startsWith('inv://')) {
      const itemId = code.replace('inv://', '');
      const item = items.find(i => i.id === itemId);

      if (item) {
        setScannedCode(code);
        stopScanner();

        // Trigger file input for photo upload
        fileInputRef.current?.click();
      }
    }
  }, [items, stopScanner]);

  // Handle photo upload after QR scan
  const handlePhotoUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && scannedCode) {
      const itemId = scannedCode.replace('inv://', '');
      onQRScanned(itemId, file);
      setScannedCode('');
    }
  }, [scannedCode, onQRScanned]);

  // Simulate QR scanning (in production, use a proper QR scanner library)
  useEffect(() => {
    if (scannerActive && qrScannerRef.current) {
      const interval = setInterval(() => {
        // Simulate scanning - in production, process video frames for QR codes
        const mockCodes = qrLabels.map(label => `inv://${label.itemId}`);
        if (mockCodes.length > 0) {
          // Simulate finding a code (for demo purposes)
          // processScannedCode(mockCodes[0]);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [scannerActive, qrLabels, processScannedCode]);

  const filteredItems = selectedRoom
    ? items.filter(item => item.room_id === selectedRoom)
    : items;

  return (
    <div className="space-y-6">
      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {!scannerActive ? (
        <>
          {/* Label Generation Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Generate QR Labels</h3>
              <div className="flex space-x-2">
                <button
                  onClick={generateLabels}
                  disabled={selectedRoom === '' && selectedItems.size === 0}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <QrCodeIcon className="h-4 w-4 mr-2" />
                  Generate Labels
                </button>
              </div>
            </div>

            {/* Room Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Room (or choose individual items below)
              </label>
              <select
                value={selectedRoom}
                onChange={(e) => {
                  setSelectedRoom(e.target.value);
                  setSelectedItems(new Set());
                }}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Choose individual items</option>
                {rooms.map(room => {
                  const roomItems = items.filter(item => item.room_id === room.id);
                  return (
                    <option key={room.id} value={room.id}>
                      {room.name} ({roomItems.length} items)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Individual Item Selection */}
            {selectedRoom === '' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Individual Items ({selectedItems.size} selected)
                </label>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                  {filteredItems.map(item => {
                    const room = rooms.find(r => r.id === item.room_id);
                    return (
                      <label key={item.id} className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedItems);
                            if (e.target.checked) {
                              newSelected.add(item.id);
                            } else {
                              newSelected.delete(item.id);
                            }
                            setSelectedItems(newSelected);
                          }}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <div className="ml-3 flex-1">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">{room?.name} • {item.category}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Generated Labels Preview */}
          {qrLabels.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Generated Labels ({qrLabels.length})
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={generatePrintablePDF}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <PrinterIcon className="h-4 w-4 mr-2" />
                    Print Labels
                  </button>
                  <button
                    onClick={startScanner}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <CameraIcon className="h-4 w-4 mr-2" />
                    Start Scanning
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {qrLabels.slice(0, 12).map(label => (
                  <div key={label.itemId} className="border rounded-lg p-3 text-center">
                    <img
                      src={label.qrCode}
                      alt="QR Code"
                      className="w-16 h-16 mx-auto mb-2 border"
                    />
                    <div className="text-xs font-medium text-gray-900 truncate">
                      {label.itemName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {label.room} • {label.category}
                    </div>
                  </div>
                ))}
              </div>

              {qrLabels.length > 12 && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  Showing 12 of {qrLabels.length} labels. Print to see all.
                </div>
              )}
            </div>
          )}

          {/* Usage Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  How to use QR Labels
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Generate and print labels for your items</li>
                    <li>Attach labels to corresponding items</li>
                    <li>Use "Start Scanning" to photograph items</li>
                    <li>Scan QR code, then take photo of the item</li>
                    <li>Photos are automatically linked to the correct item</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* QR Scanner Interface */
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Scan QR Code</h3>
            <button
              onClick={stopScanner}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Stop Scanner
            </button>
          </div>

          <div className="relative">
            <video
              ref={qrScannerRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 bg-black rounded-lg object-cover"
            />

            {/* Scanner overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-white border-opacity-50 rounded-lg">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white"></div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Point camera at QR label, then take a photo of the item
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRLabelSystem;
