import React, { useState, useCallback } from 'react';
import BarcodeScanner, { ScanResult } from '../components/BarcodeScanner';
import { ScannerLayout } from '../components/mobile/MobileLayout';
import TouchButton from '../components/mobile/TouchButton';
import { XMarkIcon, CheckIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

const Scanner: React.FC = () => {
  const [isScanning, setIsScanning] = useState(true);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  
  const navigate = useNavigate();

  const handleScanSuccess = useCallback((result: ScanResult) => {
    console.log('Scan successful:', result);
    
    setLastScan(result);
    setScanResults(prev => {
      // Avoid duplicates
      const exists = prev.find(r => r.text === result.text);
      if (!exists) {
        return [result, ...prev].slice(0, 10); // Keep last 10 scans
      }
      return prev;
    });

    // Show result overlay temporarily
    setShowResults(true);
    setTimeout(() => setShowResults(false), 2000);

    // Here you would typically:
    // 1. Search your inventory for this barcode
    // 2. If found, navigate to item detail
    // 3. If not found, offer to create new item
    
    // For demo purposes, let's simulate this:
    simulateInventoryLookup(result.text);
  }, []);

  const simulateInventoryLookup = async (barcode: string) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For demo - some barcodes will "exist" in inventory
    const demoItems: Record<string, any> = {
      '123456789012': { id: 1, name: 'Demo Item 1', category: 'Electronics' },
      '987654321098': { id: 2, name: 'Demo Item 2', category: 'Furniture' }
    };

    const item = demoItems[barcode];
    
    if (item) {
      // Navigate to existing item
      navigate(`/inventory/item/${item.id}`, { 
        state: { fromScanner: true, item } 
      });
    } else {
      // Show option to create new item
      const shouldCreate = confirm(
        `Barcode ${barcode} not found in inventory. Would you like to create a new item?`
      );
      
      if (shouldCreate) {
        navigate('/inventory/new', { 
          state: { fromScanner: true, barcode } 
        });
      }
    }
  };

  const handleClose = () => {
    navigate(-1); // Go back to previous page
  };

  const handleViewResults = () => {
    navigate('/scanner/results', { 
      state: { scanResults } 
    });
  };

  return (
    <ScannerLayout>
      <div className="relative h-full">
        {/* Scanner component */}
        {isScanning && (
          <BarcodeScanner
            onScanSuccess={handleScanSuccess}
            onScanError={(error) => console.error('Scan error:', error)}
            onClose={handleClose}
            continuousScanning={true}
            allowDuplicateScans={false}
            className="absolute inset-0"
          />
        )}

        {/* Scan result overlay */}
        {showResults && lastScan && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30">
            <div className="bg-white rounded-lg p-6 mx-4 max-w-sm w-full">
              <div className="text-center">
                <CheckIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Scan Successful!</h3>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Type:</span> {lastScan.type}
                  </div>
                  <div className="text-sm text-gray-600 break-all">
                    <span className="font-medium">Code:</span> {lastScan.text}
                  </div>
                  <div className="text-xs text-gray-500">
                    <ClockIcon className="h-4 w-4 inline mr-1" />
                    {lastScan.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top controls overlay */}
        <div className="absolute top-4 left-4 right-4 z-20">
          <div className="flex justify-between items-center">
            <div className="bg-black bg-opacity-50 rounded-lg px-3 py-2">
              <span className="text-white text-sm">
                {scanResults.length} codes scanned
              </span>
            </div>
            
            <TouchButton
              variant="ghost"
              size="small"
              onClick={handleClose}
              className="bg-black bg-opacity-50 text-white"
              ariaLabel="Close scanner"
            >
              <XMarkIcon className="h-5 w-5" />
            </TouchButton>
          </div>
        </div>

        {/* Bottom controls */}
        {scanResults.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 z-20">
            <TouchButton
              variant="primary"
              onClick={handleViewResults}
              fullWidth
              className="bg-white text-gray-900 border border-gray-300"
            >
              View {scanResults.length} Scan{scanResults.length !== 1 ? 's' : ''}
            </TouchButton>
          </div>
        )}
      </div>
    </ScannerLayout>
  );
};

export default Scanner;