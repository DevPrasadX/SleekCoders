'use client';

import { useState, useRef, useEffect } from 'react';
import { suppliers } from '@/data/staticData';
import { ScannedProduct } from '@/types';
import { extractProductDetails, processImage } from '@/utils/ocr';

// Debug: Log component renders
console.log('🔧 ScanReceive component loaded');

export default function ScanReceive() {
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [barcode, setBarcode] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Partial<ScannedProduct>>({});
  const [scannedItems, setScannedItems] = useState<Partial<ScannedProduct>[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [hasStream, setHasStream] = useState(false); // Track stream in state for re-renders
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<string>('');
  const [captureFlash, setCaptureFlash] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await handleImageProcessing(file);
  };

  const handleScanClick = () => {
    fileInputRef.current?.click();
  };

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBarcode(value);
    
    // If user types in barcode, try to extract details
    if (value.length > 5) {
      const extracted = extractProductDetails(value);
      setScannedProduct({
        ...extracted,
        productName: extracted.productName || 'Product ' + value,
      });
    }
  };

  // Safari-compatible getUserMedia helper
  const getUserMediaCompat = async (constraints: MediaStreamConstraints): Promise<MediaStream> => {
    // @ts-ignore - Safari legacy
    const legacyGetUserMedia = navigator.getUserMedia || (navigator as any).webkitGetUserMedia || (navigator as any).mozGetUserMedia;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      return navigator.mediaDevices.getUserMedia(constraints);
    }
    if (legacyGetUserMedia) {
      return new Promise((resolve, reject) => legacyGetUserMedia.call(navigator, constraints, resolve, reject));
    }
    throw new Error('Camera API not available');
  };

  // Handle camera access
  const startCamera = async () => {
    setIsCameraLoading(true);
    try {
      // Safari/iOS requires secure context (https or localhost)
      const isSecure = window.isSecureContext || window.location.hostname === 'localhost';
      if (!isSecure) {
        setIsCameraLoading(false);
        alert('Camera requires HTTPS (or localhost). Please open this site over https.');
        // Fallback to file capture
        fileInputRef.current?.click();
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          // facingMode is a hint; Safari may ignore it
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await getUserMediaCompat(constraints);
      console.log('✅ Camera stream obtained:', stream);
      streamRef.current = stream;
      setHasStream(true);
      setIsCameraLoading(false);
      setIsCameraActive(true);

      // attach to video element (may not yet be mounted)
      setTimeout(() => {
        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;
          video.play().catch(console.error);
        }
      }, 0);
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      setIsCameraLoading(false);
      // Safari specific: show friendlier text and fallback
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (isSafari) {
        alert('Safari may block camera or require permission. Try: Settings > Safari > Camera > Allow. Falling back to image upload.');
        fileInputRef.current?.click();
        return;
      }
      if (error.name === 'NotAllowedError') {
        alert('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        alert('No camera found. Please connect a camera device.');
      } else {
        alert('Unable to access camera. Your browser may not support it. Falling back to image upload.');
      }
      // Fallback to file input capture
      fileInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setHasStream(false);
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        // Flash effect
        setCaptureFlash(true);
        setTimeout(() => setCaptureFlash(false), 200);

        // Convert canvas to blob and process
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' });
            const imageUrl = URL.createObjectURL(blob);
            setCapturedImage(imageUrl);
            stopCamera();
            
            // Process the captured image
            await handleImageProcessing(file);
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  // Unified image processing handler
  const handleImageProcessing = async (file: File) => {
    setIsProcessing(true);
    setOcrProgress('Extracting text from image...');
    
    try {
      const extractedText = await processImage(file);
      setOcrProgress('Analyzing product details...');
      
      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const productDetails = extractProductDetails(extractedText);
      
      if (barcode) {
        const barcodeDetails = extractProductDetails(barcode);
        setScannedProduct({ ...productDetails, ...barcodeDetails, productName: productDetails.productName || 'Product' });
      } else {
        setScannedProduct(productDetails);
      }
      
      setOcrProgress('✓ Data extracted successfully!');
      
      // Clear progress message after 3 seconds
      setTimeout(() => setOcrProgress(''), 3000);
    } catch (error) {
      console.error('Error processing image:', error);
      setOcrProgress('✗ Error processing image');
      alert('Error processing image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Debug: Log state changes
  useEffect(() => {
    console.log('📊 Camera State Changed:', {
      isCameraActive,
      isCameraLoading,
      hasStream,
      hasStreamRef: !!streamRef.current,
      hasVideoRef: !!videoRef.current
    });
  }, [isCameraActive, isCameraLoading, hasStream]);

  // Set stream to video when both are available
  useEffect(() => {
    if (videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      console.log('🔗 Connecting stream to video element...');
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [hasStream, isCameraActive]);

  // Cleanup camera and images on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Cleanup captured image URL when component unmounts or image changes
  useEffect(() => {
    return () => {
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage);
      }
    };
  }, [capturedImage]);

  const handleAddToShipment = () => {
    if (scannedProduct.productName && scannedProduct.batchNumber) {
      setScannedItems([...scannedItems, { ...scannedProduct }]);
      // Reset form
      setScannedProduct({});
      setBarcode('');
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage);
        setCapturedImage(null);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Scan & Receive Shipment</h1>
        <p className="text-gray-600 mt-1">Scan product barcodes to add items to the incoming shipment.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Input and Product Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipment Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Shipment Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier} value={supplier}>{supplier}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Barcode</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={barcode}
                    onChange={handleBarcodeChange}
                    placeholder="Enter barcode or scan"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                  />
                  <button
                    onClick={handleScanClick}
                    disabled={isProcessing || isCameraActive}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50"
                    title="Upload Image"
                  >
                    {isProcessing ? (
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={isCameraActive ? stopCamera : startCamera}
                    disabled={isProcessing || isCameraLoading}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      isCameraActive 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } disabled:opacity-50`}
                    title={isCameraActive ? "Stop Camera" : "Use Camera"}
                  >
                    {isCameraLoading ? (
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : isCameraActive ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Camera Loading */}
              {isCameraLoading && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-sm font-medium text-blue-800">Initializing camera...</p>
                  <p className="text-xs text-blue-600 mt-1">Please allow camera access if prompted</p>
                </div>
              )}

              {/* Camera Preview - Show if active or has stream */}
              {!isCameraLoading && (isCameraActive || hasStream) && (
                <div className="mt-4">
                  {/* Camera Preview Box */}
                  <div className="relative bg-black rounded-lg overflow-hidden border-2 border-blue-500" style={{ minHeight: '500px' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-auto min-h-[500px] object-contain bg-black"
                      style={{ transform: 'scaleX(-1)', width: '100%' }}
                      onLoadedMetadata={(e) => {
                        console.log('📋 Video metadata loaded in React');
                        const video = e.currentTarget;
                        video.play().catch(console.error);
                      }}
                      onPlay={() => console.log('▶️ Video started playing')}
                      onError={(e) => console.error('❌ Video error:', e)}
                    />
                    {/* Flash effect */}
                    {captureFlash && (
                      <div className="absolute inset-0 bg-white opacity-80 transition-opacity duration-200 pointer-events-none z-20" />
                    )}
                    {/* Scanning overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="border-2 border-white border-dashed rounded-lg w-72 h-56 flex items-center justify-center">
                        <div className="text-white text-center">
                          <p className="text-sm font-semibold mb-2">Position product label here</p>
                          <p className="text-xs opacity-75">Make sure text is clear and readable</p>
                        </div>
                      </div>
                    </div>
                    {/* Capture button - LARGE and PROMINENT */}
                    <button
                      onClick={capturePhoto}
                      disabled={isProcessing}
                      className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-full p-6 shadow-2xl hover:bg-gray-100 transition-all disabled:opacity-50 border-4 border-blue-500 z-10"
                      style={{ width: '80px', height: '80px' }}
                    >
                      <svg className="w-12 h-12 text-gray-800 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <div className="absolute top-4 left-4 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold z-10">
                      📷 Camera Active - Ready to Capture
                    </div>
                    <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-xs z-10">
                      Tap the white circle below to capture
                    </div>
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <p className="text-sm font-medium text-blue-800">
                      📸 Click the large white button below to capture the image
                    </p>
                  </div>
                </div>
              )}

              {/* OCR Processing Status */}
              {isProcessing && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <div>
                      <p className="text-sm font-medium text-blue-800">Processing Image...</p>
                      <p className="text-xs text-blue-600">{ocrProgress || 'Extracting text...'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {ocrProgress && ocrProgress.includes('✓') && !isProcessing && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-sm font-medium text-green-800">Data extracted successfully!</p>
                  </div>
                  <p className="text-xs text-green-600 mt-1">Review the extracted information below</p>
                </div>
              )}

              {/* Captured Image Preview */}
              {capturedImage && !isCameraActive && (
                <div className="mt-4">
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden border-2 border-green-500">
                    <img src={capturedImage} alt="Captured" className="w-full h-auto max-h-96 object-contain" />
                    <div className="absolute top-2 left-2 bg-green-500 text-white px-3 py-1 rounded-lg text-xs font-semibold">
                      ✓ Captured
                    </div>
                    <button
                      onClick={() => {
                        setCapturedImage(null);
                        URL.revokeObjectURL(capturedImage);
                        setScannedProduct({});
                      }}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 transition-colors"
                      title="Retake photo"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scanned Product Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Scanned Product</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name
                  {scannedProduct.productName && <span className="ml-2 text-green-600">✓</span>}
                </label>
                <input
                  type="text"
                  value={scannedProduct.productName || ''}
                  onChange={(e) => setScannedProduct({ ...scannedProduct, productName: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    scannedProduct.productName 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-gray-300 bg-gray-50'
                  }`}
                  placeholder={scannedProduct.productName ? '' : 'Will be extracted from image...'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch Number
                  {scannedProduct.batchNumber && <span className="ml-2 text-green-600">✓</span>}
                </label>
                <input
                  type="text"
                  value={scannedProduct.batchNumber || ''}
                  onChange={(e) => setScannedProduct({ ...scannedProduct, batchNumber: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    scannedProduct.batchNumber 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-gray-300 bg-gray-50'
                  }`}
                  placeholder={scannedProduct.batchNumber ? '' : 'Will be extracted from image...'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <input
                  type="number"
                  value={scannedProduct.quantity || 1}
                  onChange={(e) => setScannedProduct({ ...scannedProduct, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Manufacturing Date</label>
                <div className="relative">
                  <input
                    type="text"
                    value={scannedProduct.manufacturingDate || ''}
                    onChange={(e) => setScannedProduct({ ...scannedProduct, manufacturingDate: e.target.value })}
                    placeholder="DD/MM/YYYY"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <svg className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                <div className="relative">
                  <input
                    type="text"
                    value={scannedProduct.expiryDate || ''}
                    onChange={(e) => setScannedProduct({ ...scannedProduct, expiryDate: e.target.value })}
                    placeholder="DD/MM/YYYY"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <svg className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>

              <button
                onClick={handleAddToShipment}
                disabled={!scannedProduct.productName || !scannedProduct.batchNumber}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add to Shipment</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Scanned Items */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Scanned Items ({scannedItems.length})</h3>
          
          {scannedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-gray-400">
              <svg className="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <p className="text-lg font-medium mb-2">No items scanned yet</p>
              <p className="text-sm">Start scanning to add items to this shipment</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {scannedItems.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="font-medium text-gray-800">{item.productName}</div>
                  <div className="text-sm text-gray-600 mt-1">Batch: {item.batchNumber}</div>
                  <div className="text-sm text-gray-600">Qty: {item.quantity}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

