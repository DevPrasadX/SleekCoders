'use client';

import { useState, useEffect, useRef } from 'react';

interface CartItem {
  itemID: number;
  barcode: string;
  productName: string;
  productPrice: number;
  productCategory: string;
  quantity: number;
  lotName: string;
  batchNumber: string | null;
  availableQuantity: number;
}

interface ScannedProduct {
  itemID: number;
  barcode: string;
  productID: number;
  productName: string;
  productPrice: number;
  productCategory: string;
  quantity: number;
  lotID: number;
  lotName: string;
  batchNumber: string | null;
  manufacturingDate: string | null;
  expiryDate: string | null;
}

export default function POSIntegration() {
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [employeeID, setEmployeeID] = useState<string | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Get current user's employee ID
    if (typeof window !== 'undefined') {
      const userStr = sessionStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setEmployeeID(user.userId);
      }
    }
    // Auto-focus barcode input
    barcodeInputRef.current?.focus();
  }, []);

  const scanProduct = async (barcodeValue: string) => {
    if (!barcodeValue.trim()) return;

    setScanning(true);
    setError(null);

    try {
      const response = await fetch(`/api/inventory/scan?barcode=${encodeURIComponent(barcodeValue)}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Product not found');
      }

      const product: ScannedProduct = await response.json();

      // Check if item already in cart
      const existingItemIndex = cart.findIndex((item) => item.itemID === product.itemID);

      if (existingItemIndex >= 0) {
        // Increase quantity if already in cart (up to available)
        const existingItem = cart[existingItemIndex];
        const newQuantity = Math.min(
          existingItem.quantity + 1,
          product.quantity // Use current available quantity
        );

        setCart((prev) => {
          const updated = [...prev];
          updated[existingItemIndex] = {
            ...existingItem,
            quantity: newQuantity,
            availableQuantity: product.quantity,
          };
          return updated;
        });
      } else {
        // Add new item to cart
        setCart((prev) => [
          ...prev,
          {
            itemID: product.itemID,
            barcode: product.barcode,
            productName: product.productName,
            productPrice: product.productPrice,
            productCategory: product.productCategory,
            quantity: 1,
            lotName: product.lotName,
            batchNumber: product.batchNumber,
            availableQuantity: product.quantity,
          },
        ]);
      }

      setBarcode('');
      barcodeInputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan product');
      setTimeout(() => setError(null), 3000);
    } finally {
      setScanning(false);
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode.trim()) {
      scanProduct(barcode.trim());
    }
  };

  const updateCartItemQuantity = (itemID: number, newQuantity: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.itemID === itemID) {
          const quantity = Math.max(1, Math.min(newQuantity, item.availableQuantity));
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const removeFromCart = (itemID: number) => {
    setCart((prev) => prev.filter((item) => item.itemID !== itemID));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    if (!employeeID) {
      setError('Employee ID not found. Please log in again.');
      return;
    }

    setCheckingOut(true);
    setError(null);

    try {
      const items = cart.map((item) => ({
        itemID: item.itemID,
        quantity: item.quantity,
        unitPrice: item.productPrice,
      }));

      const response = await fetch('/api/sales/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, employeeID }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Checkout failed');
      }

      const result = await response.json();
      
      // Clear cart and show success
      setCart([]);
      setError(null);
      alert(`Sale completed! Transaction ID: ${result.transaction.transactionID}\nTotal: $${result.totalAmount.toFixed(2)}`);
      
      // Refocus barcode input for next sale
      barcodeInputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  };

  const total = cart.reduce((sum, item) => sum + item.productPrice * item.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Point of Sale</h1>
          <p className="text-gray-600 mt-1">Scan barcodes to add items and process sales.</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Scanning and Cart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Barcode Scanner */}
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Scan Barcode</h3>
            <form onSubmit={handleBarcodeSubmit}>
              <div className="flex space-x-2">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan or enter barcode..."
                  className="flex-1 px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={scanning}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={scanning || !barcode.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {scanning ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
                      <span>Scan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Shopping Cart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Shopping Cart</h3>
              <span className="text-sm text-gray-500">{cart.length} item{cart.length !== 1 ? 's' : ''}</span>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-lg font-medium">Cart is empty</p>
                <p className="text-sm">Start scanning products to add them to the cart</p>
              </div>
            ) : (
          <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.itemID} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{item.productName}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {item.productCategory} • Lot: {item.lotName}
                          {item.batchNumber && ` • Batch: ${item.batchNumber}`}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">Barcode: {item.barcode}</div>
                        <div className="text-xs text-orange-600 mt-1">
                          Available: {item.availableQuantity} units
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 ml-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateCartItemQuantity(item.itemID, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateCartItemQuantity(item.itemID, item.quantity + 1)}
                            disabled={item.quantity >= item.availableQuantity}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                          </button>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-800">
                            ${(item.productPrice * item.quantity).toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">
                            ${item.productPrice.toFixed(2)} each
                  </div>
                </div>
                        <button
                          onClick={() => removeFromCart(item.itemID)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                </div>
              </div>
            ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Summary and Checkout */}
        <div className="space-y-6">
          {/* Order Summary */}
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Summary</h3>
          <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>${total.toFixed(2)}</span>
                </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax (0%)</span>
                <span>$0.00</span>
                    </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-lg font-bold text-gray-800">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || checkingOut}
              className="w-full mt-6 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {checkingOut ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Complete Sale</span>
                </>
              )}
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">How to use:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Scan or enter product barcode</li>
              <li>• Items are added to cart automatically</li>
              <li>• Adjust quantities as needed</li>
              <li>• Click "Complete Sale" to process</li>
              <li>• Inventory is deducted automatically</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
