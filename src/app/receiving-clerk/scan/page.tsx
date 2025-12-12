'use client';

import { useState, useRef, useEffect } from 'react';
import { ScannedProduct, Product } from '@/types';
import { extractProductDetails, processImage } from '@/utils/ocr';
import { useLots, useSuppliers, useProducts } from '@/hooks/useApiData';
import type { LotRecord, SupplierRecord } from '@/types/database';

// Debug: Log component renders
console.log('🔧 ScanReceive component loaded');

export default function ScanReceive() {
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [supplierInput, setSupplierInput] = useState('');
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({
    name: '',
    dateOfJoining: new Date().toISOString().split('T')[0], // Today's date as default
    poc: '',
    contactNumber: '',
  });
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
  const [lotInput, setLotInput] = useState('');
  const [showLotSuggestions, setShowLotSuggestions] = useState(false);
  const [showNewLotModal, setShowNewLotModal] = useState(false);
  const [newLotData, setNewLotData] = useState({
    lotName: '',
    dateOfArrival: new Date().toISOString().split('T')[0], // Today's date as default
    productCount: 0,
    quantity: 0,
  });
  const [isCreatingLot, setIsCreatingLot] = useState(false);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: '',
    description: '',
    standardPrice: 0,
    category: '',
  });
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [productNotFoundError, setProductNotFoundError] = useState(false);
  const [employeeID, setEmployeeID] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const {
    data: supplierRecords,
    loading: suppliersLoading,
    error: suppliersError,
    refresh: refreshSuppliers,
  } = useSuppliers();
  const {
    data: lots,
    loading: lotsLoading,
    error: lotsError,
    refresh: refreshLots,
  } = useLots();
  const {
    data: products,
    loading: productsLoading,
    error: productsError,
    refresh: refreshProducts,
  } = useProducts();

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

  // Load current employee ID from session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem('user');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      setEmployeeID(parsed.userId);
    } catch (err) {
      console.error('Failed to parse user session in ScanReceive', err);
    }
  }, []);

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

  const handleAddToShipment = async () => {
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!employeeID) {
      setSubmitError('Unable to determine current employee. Please log in again.');
      return;
    }

    if (!selectedSupplierId) {
      setSubmitError('Please enter and select a valid supplier name from the database.');
      return;
    }

    if (!selectedLotId) {
      setSubmitError('Please enter and select a valid lot number from the database.');
      return;
    }

    // Find product by name from scanned product
    const matchedProduct = products.find(
      (p: Product) => p.name.toLowerCase() === scannedProduct.productName?.toLowerCase()
    );

    if (!matchedProduct) {
      setProductNotFoundError(true);
      setSubmitError(`Product "${scannedProduct.productName}" not found. Would you like to create it?`);
      return;
    }

    const productID = matchedProduct.productId;

    if (!barcode.trim()) {
      setSubmitError('Barcode is required.');
      return;
    }

    if (!scannedProduct.productName || !scannedProduct.batchNumber) {
      setSubmitError('Product name and batch number are required.');
      return;
    }

    const quantity = scannedProduct.quantity && scannedProduct.quantity > 0 ? scannedProduct.quantity : 1;

    try {
      const res = await fetch('/api/inventory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productID: Number(productID),
          lotID: selectedLotId,
          barcode,
          quantity,
          manufacturingDate: scannedProduct.manufacturingDate || null,
          expiryDate: scannedProduct.expiryDate || null,
          batchNumber: scannedProduct.batchNumber || null,
          employeeID,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(
          data.error ||
            (res.status === 409
              ? 'This barcode is already registered by another receiving clerk.'
              : 'Failed to save item to inventory.'),
        );
        return;
      }

      setScannedItems([...scannedItems, { ...scannedProduct, quantity }]);
      setSubmitSuccess(data.message || 'Inventory item saved.');

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
    } catch (error) {
      console.error('Error saving inventory item:', error);
      setSubmitError('Unexpected error while saving inventory item.');
    }
  };

  // Filter suppliers based on input
  const filteredSuppliers = supplierRecords.filter((supplier) =>
    supplier.SUPPLIER_NAME.toLowerCase().includes(supplierInput.toLowerCase())
  );

  // Filter lots based on input and selected supplier
  const filteredLots = (() => {
    let availableLots = lots;
    if (selectedSupplierId) {
      availableLots = lots.filter((lot) => lot.SUPPLIER_ID === selectedSupplierId);
    }
    if (!lotInput) return availableLots;
    return availableLots.filter((lot) =>
      lot.LOT_NAME.toLowerCase().includes(lotInput.toLowerCase()) ||
      lot.LOT_ID.toString().includes(lotInput)
    );
  })();

  // Handle supplier input change
  const handleSupplierInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSupplierInput(value);
    setShowSupplierSuggestions(true);
    
    // Check if exact match exists
    const exactMatch = supplierRecords.find(
      (s) => s.SUPPLIER_NAME.toLowerCase() === value.toLowerCase()
    );
    
    if (exactMatch) {
      setSelectedSupplier(exactMatch.SUPPLIER_NAME);
      setSelectedSupplierId(exactMatch.SUPPLIER_ID);
    } else {
      setSelectedSupplier('');
      setSelectedSupplierId(null);
    }
  };

  // Handle supplier selection
  const handleSupplierSelect = (supplier: SupplierRecord) => {
    setSupplierInput(supplier.SUPPLIER_NAME);
    setSelectedSupplier(supplier.SUPPLIER_NAME);
    setSelectedSupplierId(supplier.SUPPLIER_ID);
    setShowSupplierSuggestions(false);
    // Reset lot selection when supplier changes
    setLotInput('');
    setSelectedLotId(null);
  };

  // Handle creating a new supplier
  const handleCreateNewSupplier = async () => {
    if (!newSupplierData.name || !newSupplierData.dateOfJoining || !newSupplierData.poc || !newSupplierData.contactNumber) {
      setSubmitError('Please fill in all required fields: name, date of joining, point of contact, and contact number.');
      return;
    }

    setIsCreatingSupplier(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSupplierData.name,
          dateOfJoining: newSupplierData.dateOfJoining,
          poc: newSupplierData.poc,
          contactNumber: newSupplierData.contactNumber,
          productCount: 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'Failed to create supplier.');
        setIsCreatingSupplier(false);
        return;
      }

      // Refresh suppliers list
      await refreshSuppliers();

      // Find the newly created supplier
      const newSupplier = data.find((s: SupplierRecord) => s.SUPPLIER_NAME === newSupplierData.name);
      
      if (newSupplier) {
        setSupplierInput(newSupplier.SUPPLIER_NAME);
        setSelectedSupplier(newSupplier.SUPPLIER_NAME);
        setSelectedSupplierId(newSupplier.SUPPLIER_ID);
      }

      // Close modal and reset form
      setShowNewSupplierModal(false);
      setNewSupplierData({
        name: '',
        dateOfJoining: new Date().toISOString().split('T')[0],
        poc: '',
        contactNumber: '',
      });
      setShowSupplierSuggestions(false);
      setSubmitSuccess('Supplier created successfully!');
      setIsCreatingSupplier(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch (error) {
      console.error('Error creating supplier:', error);
      setSubmitError('Unexpected error while creating supplier.');
      setIsCreatingSupplier(false);
    }
  };

  // Handle opening new supplier modal
  const handleOpenNewSupplierModal = () => {
    setNewSupplierData({
      name: supplierInput,
      dateOfJoining: new Date().toISOString().split('T')[0],
      poc: '',
      contactNumber: '',
    });
    setShowNewSupplierModal(true);
    setShowSupplierSuggestions(false);
  };

  // Handle lot input change
  const handleLotInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLotInput(value);
    setShowLotSuggestions(true);
    
    // Check if exact match exists in filtered lots
    const exactMatch = filteredLots.find(
      (lot) => lot.LOT_NAME.toLowerCase() === value.toLowerCase() ||
               lot.LOT_ID.toString() === value
    );
    
    if (exactMatch) {
      setSelectedLotId(exactMatch.LOT_ID);
    } else {
      setSelectedLotId(null);
    }
  };

  // Handle lot selection
  const handleLotSelect = (lot: LotRecord) => {
    setLotInput(lot.LOT_NAME);
    setSelectedLotId(lot.LOT_ID);
    setShowLotSuggestions(false);
  };

  // Handle creating a new lot
  const handleCreateNewLot = async () => {
    if (!selectedSupplierId) {
      setSubmitError('Please select a supplier first before creating a lot.');
      return;
    }

    if (!newLotData.lotName || !newLotData.dateOfArrival || newLotData.quantity === undefined || newLotData.quantity < 0) {
      setSubmitError('Please fill in all required fields: lot name, date of arrival, and quantity (must be 0 or greater).');
      return;
    }

    setIsCreatingLot(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/lots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierID: selectedSupplierId,
          lotName: newLotData.lotName,
          dateOfArrival: newLotData.dateOfArrival,
          productCount: newLotData.productCount || 0,
          quantity: newLotData.quantity,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'Failed to create lot.');
        setIsCreatingLot(false);
        return;
      }

      // Refresh lots list
      await refreshLots();

      // Find the newly created lot
      const newLot = data.find((lot: LotRecord) => 
        lot.LOT_NAME === newLotData.lotName && lot.SUPPLIER_ID === selectedSupplierId
      );
      
      if (newLot) {
        setLotInput(newLot.LOT_NAME);
        setSelectedLotId(newLot.LOT_ID);
      }

      // Close modal and reset form
      setShowNewLotModal(false);
      setNewLotData({
        lotName: '',
        dateOfArrival: new Date().toISOString().split('T')[0],
        productCount: 0,
        quantity: 0,
      });
      setShowLotSuggestions(false);
      setSubmitSuccess('Lot created successfully!');
      setIsCreatingLot(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch (error) {
      console.error('Error creating lot:', error);
      setSubmitError('Unexpected error while creating lot.');
      setIsCreatingLot(false);
    }
  };

  // Handle opening new lot modal
  const handleOpenNewLotModal = () => {
    if (!selectedSupplierId) {
      setSubmitError('Please select a supplier first before creating a lot.');
      return;
    }
    setNewLotData({
      lotName: lotInput,
      dateOfArrival: new Date().toISOString().split('T')[0],
      productCount: 0,
      quantity: 0,
    });
    setShowNewLotModal(true);
    setShowLotSuggestions(false);
  };

  // Handle creating a new product
  const handleCreateNewProduct = async () => {
    if (!newProductData.name || !newProductData.category || newProductData.standardPrice === undefined || newProductData.standardPrice < 0) {
      setSubmitError('Please fill in all required fields: name, category, and standard price (must be 0 or greater).');
      return;
    }

    setIsCreatingProduct(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProductData.name,
          description: newProductData.description || '',
          standardPrice: newProductData.standardPrice,
          category: newProductData.category,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'Failed to create product.');
        setIsCreatingProduct(false);
        return;
      }

      // Refresh products list
      await refreshProducts();

      // Find the newly created product
      const newProduct = data.find((p: Product) => p.name === newProductData.name);
      
      if (newProduct) {
        // Update scanned product with the new product name
        setScannedProduct({ ...scannedProduct, productName: newProduct.name });
      }

      // Close modal and reset form
      setShowNewProductModal(false);
      setNewProductData({
        name: '',
        description: '',
        standardPrice: 0,
        category: '',
      });
      setProductNotFoundError(false);
      setSubmitError(null);
      setSubmitSuccess('Product created successfully! You can now add it to the shipment.');
      setIsCreatingProduct(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch (error) {
      console.error('Error creating product:', error);
      setSubmitError('Unexpected error while creating product.');
      setIsCreatingProduct(false);
    }
  };

  // Handle opening new product modal
  const handleOpenNewProductModal = () => {
    setNewProductData({
      name: scannedProduct.productName || '',
      description: '',
      standardPrice: 0,
      category: '',
    });
    setShowNewProductModal(true);
    setProductNotFoundError(false);
    setSubmitError(null);
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
                <div className="space-y-2 relative">
                  <input
                    type="text"
                    value={supplierInput}
                    onChange={handleSupplierInputChange}
                    onFocus={() => setShowSupplierSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSupplierSuggestions(false), 200)}
                    placeholder="Type supplier name..."
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      selectedSupplierId 
                        ? 'border-green-300 bg-green-50' 
                        : supplierInput && !selectedSupplierId
                        ? 'border-yellow-300 bg-yellow-50'
                        : 'border-gray-300'
                    }`}
                  />
                  {showSupplierSuggestions && filteredSuppliers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredSuppliers.map((supplier) => (
                        <button
                          key={supplier.SUPPLIER_ID}
                          type="button"
                          onClick={() => handleSupplierSelect(supplier)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                        >
                          {supplier.SUPPLIER_NAME}
                        </button>
                      ))}
                    </div>
                  )}
                  {supplierInput && !selectedSupplierId && filteredSuppliers.length === 0 && (
                    <div className="mt-1">
                      <p className="text-xs text-yellow-600 mb-2">No matching supplier found.</p>
                      <button
                        type="button"
                        onClick={handleOpenNewSupplierModal}
                        className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors"
                      >
                        + Add "{supplierInput}" as new supplier
                      </button>
                    </div>
                  )}
                  {selectedSupplierId && (
                    <p className="text-xs text-green-600 mt-1">✓ Valid supplier selected</p>
                  )}
                  {(suppliersLoading || lotsLoading || productsLoading) && (
                    <p className="text-xs text-gray-500">Loading supplier, lot and product data...</p>
                  )}
                  {(suppliersError || lotsError || productsError) && (
                    <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
                      <span>Failed to load reference data.</span>
                      <button
                        onClick={() => {
                          refreshSuppliers();
                          refreshLots();
                          refreshProducts();
                        }}
                        className="underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Lot selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lot Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={lotInput}
                    onChange={handleLotInputChange}
                    onFocus={() => setShowLotSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowLotSuggestions(false), 200)}
                    placeholder={selectedSupplierId ? "Type lot name or number..." : "Select supplier first"}
                    disabled={!selectedSupplierId}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      selectedLotId 
                        ? 'border-green-300 bg-green-50' 
                        : lotInput && !selectedLotId
                        ? 'border-yellow-300 bg-yellow-50'
                        : 'border-gray-300'
                    } ${!selectedSupplierId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  {showLotSuggestions && filteredLots.length > 0 && selectedSupplierId && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredLots.map((lot) => (
                        <button
                          key={lot.LOT_ID}
                          type="button"
                          onClick={() => handleLotSelect(lot)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                        >
                          <div className="font-medium">{lot.LOT_NAME}</div>
                          <div className="text-xs text-gray-500">Lot ID: {lot.LOT_ID} • Qty: {lot.LOT_QUANTITY}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {lotInput && !selectedLotId && filteredLots.length === 0 && selectedSupplierId && (
                    <div className="mt-1">
                      <p className="text-xs text-yellow-600 mb-2">No matching lot found.</p>
                      <button
                        type="button"
                        onClick={handleOpenNewLotModal}
                        className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors"
                      >
                        + Add "{lotInput}" as new lot
                      </button>
                    </div>
                  )}
                  {selectedLotId && (
                    <p className="text-xs text-green-600 mt-1">✓ Valid lot selected</p>
                  )}
                </div>
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

              {submitError && (
                <div className="mt-2">
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs mb-2">
                    {submitError}
                  </div>
                  {productNotFoundError && (
                    <button
                      type="button"
                      onClick={handleOpenNewProductModal}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors"
                    >
                      + Create "{scannedProduct.productName}" as new product
                    </button>
                  )}
                </div>
              )}
              {submitSuccess && (
                <div className="mt-2 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-xs">
                  {submitSuccess}
                </div>
              )}

              <button
                onClick={handleAddToShipment}
                disabled={
                  !scannedProduct.productName ||
                  !scannedProduct.batchNumber ||
                  !selectedSupplierId ||
                  !selectedLotId ||
                  !barcode
                }
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

      {/* New Supplier Modal */}
      {showNewSupplierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Add New Supplier</h3>
              <button
                onClick={() => {
                  setShowNewSupplierModal(false);
                  setNewSupplierData({
                    name: '',
                    dateOfJoining: new Date().toISOString().split('T')[0],
                    poc: '',
                    contactNumber: '',
                  });
                  setSubmitError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSupplierData.name}
                  onChange={(e) => setNewSupplierData({ ...newSupplierData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter supplier name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Joining <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newSupplierData.dateOfJoining}
                  onChange={(e) => setNewSupplierData({ ...newSupplierData, dateOfJoining: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Point of Contact (POC) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSupplierData.poc}
                  onChange={(e) => setNewSupplierData({ ...newSupplierData, poc: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter contact person name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={newSupplierData.contactNumber}
                  onChange={(e) => setNewSupplierData({ ...newSupplierData, contactNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter contact number"
                />
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {submitError}
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowNewSupplierModal(false);
                    setNewSupplierData({
                      name: '',
                      dateOfJoining: new Date().toISOString().split('T')[0],
                      poc: '',
                      contactNumber: '',
                    });
                    setSubmitError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isCreatingSupplier}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNewSupplier}
                  disabled={isCreatingSupplier || !newSupplierData.name || !newSupplierData.dateOfJoining || !newSupplierData.poc || !newSupplierData.contactNumber}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isCreatingSupplier ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Create Supplier</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Lot Modal */}
      {showNewLotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Add New Lot</h3>
              <button
                onClick={() => {
                  setShowNewLotModal(false);
                  setNewLotData({
                    lotName: '',
                    dateOfArrival: new Date().toISOString().split('T')[0],
                    productCount: 0,
                    quantity: 0,
                  });
                  setSubmitError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Supplier:</span> {selectedSupplier || 'Not selected'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lot Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newLotData.lotName}
                  onChange={(e) => setNewLotData({ ...newLotData, lotName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter lot name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Arrival <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newLotData.dateOfArrival}
                  onChange={(e) => setNewLotData({ ...newLotData, dateOfArrival: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={newLotData.quantity}
                  onChange={(e) => setNewLotData({ ...newLotData, quantity: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter initial quantity"
                />
                <p className="text-xs text-gray-500 mt-1">Enter 0 if quantity will be added later</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={newLotData.productCount}
                  onChange={(e) => setNewLotData({ ...newLotData, productCount: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter product count (optional)"
                />
                <p className="text-xs text-gray-500 mt-1">Number of different products in this lot (default: 0)</p>
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {submitError}
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowNewLotModal(false);
                    setNewLotData({
                      lotName: '',
                      dateOfArrival: new Date().toISOString().split('T')[0],
                      productCount: 0,
                      quantity: 0,
                    });
                    setSubmitError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isCreatingLot}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNewLot}
                  disabled={isCreatingLot || !newLotData.lotName || !newLotData.dateOfArrival || newLotData.quantity === undefined || newLotData.quantity < 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isCreatingLot ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Create Lot</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Product Modal */}
      {showNewProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Add New Product</h3>
              <button
                onClick={() => {
                  setShowNewProductModal(false);
                  setNewProductData({
                    name: '',
                    description: '',
                    standardPrice: 0,
                    category: '',
                  });
                  setSubmitError(null);
                  setProductNotFoundError(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProductData.name}
                  onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter product name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProductData.category}
                  onChange={(e) => setNewProductData({ ...newProductData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter product category (e.g., Dairy, Produce, etc.)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Standard Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newProductData.standardPrice}
                  onChange={(e) => setNewProductData({ ...newProductData, standardPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter standard price"
                />
                <p className="text-xs text-gray-500 mt-1">Enter 0 if price will be set later</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newProductData.description}
                  onChange={(e) => setNewProductData({ ...newProductData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter product description (optional)"
                  rows={3}
                />
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {submitError}
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowNewProductModal(false);
                    setNewProductData({
                      name: '',
                      description: '',
                      standardPrice: 0,
                      category: '',
                    });
                    setSubmitError(null);
                    setProductNotFoundError(false);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isCreatingProduct}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNewProduct}
                  disabled={isCreatingProduct || !newProductData.name || !newProductData.category || newProductData.standardPrice === undefined || newProductData.standardPrice < 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isCreatingProduct ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Create Product</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

