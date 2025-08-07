import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import { useState, useCallback, useRef } from 'react';
import { AlertCircle, Scan, ShoppingCart, Trash2, Plus, Minus, Receipt, Package } from 'lucide-react';
import type { Product, CreateOrderInput, PaymentType, CartItemInput } from '../../server/src/schema';

interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [qrCode, setQrCode] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('cash');
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // Calculate cart totals
  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const showMessage = useCallback((type: 'success' | 'error' | 'warning', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  const handleScanProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCode.trim()) return;

    setIsScanning(true);
    try {
      const product = await trpc.getProductByQrCode.query({ qr_code: qrCode.trim() });
      
      if (!product) {
        showMessage('error', `Product with QR code "${qrCode}" not found`);
        setQrCode('');
        qrInputRef.current?.focus();
        return;
      }

      // Add to cart or increment quantity
      setCart(prevCart => {
        const existingItem = prevCart.find(item => item.product.id === product.id);
        
        if (existingItem) {
          const updatedCart = prevCart.map(item =>
            item.product.id === product.id
              ? { 
                  ...item, 
                  quantity: item.quantity + 1,
                  subtotal: (item.quantity + 1) * item.product.price
                }
              : item
          );
          showMessage('success', `Added another ${product.name} to cart`);
          return updatedCart;
        } else {
          const newItem: CartItem = {
            product,
            quantity: 1,
            subtotal: product.price
          };
          showMessage('success', `Added ${product.name} to cart`);
          return [...prevCart, newItem];
        }
      });

      setQrCode('');
      qrInputRef.current?.focus();
    } catch (error) {
      showMessage('error', 'Failed to scan product. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId
          ? {
              ...item,
              quantity: newQuantity,
              subtotal: newQuantity * item.product.price
            }
          : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
    showMessage('success', 'Item removed from cart');
  };

  const clearCart = () => {
    setCart([]);
    showMessage('success', 'Cart cleared');
  };

  const processOrder = async () => {
    if (cart.length === 0) {
      showMessage('warning', 'Cart is empty. Add items before processing order.');
      return;
    }

    setIsProcessing(true);
    try {
      const orderItems: CartItemInput[] = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      }));

      const orderInput: CreateOrderInput = {
        items: orderItems,
        payment_type: paymentType
      };

      const order = await trpc.createOrder.mutate(orderInput);
      
      setLastOrderId(order.id);
      setCart([]);
      showMessage('success', `Order #${order.id} processed successfully! Payment: ${paymentType}`);
      qrInputRef.current?.focus();
    } catch (error) {
      showMessage('error', 'Failed to process order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Receipt className="w-8 h-8 text-blue-600" />
            POS System
          </h1>
          <p className="text-gray-600 mt-2">Scan products and process customer orders</p>
        </div>

        {/* Alert Messages */}
        {message && (
          <Alert className={`mb-6 ${
            message.type === 'error' ? 'border-red-200 bg-red-50' :
            message.type === 'success' ? 'border-green-200 bg-green-50' :
            'border-yellow-200 bg-yellow-50'
          }`}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className={
              message.type === 'error' ? 'text-red-800' :
              message.type === 'success' ? 'text-green-800' :
              'text-yellow-800'
            }>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Stub Warning */}
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-orange-800">
            <strong>Demo Mode:</strong> Backend handlers are stubs. Product scanning will show "not found" until database is connected.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Scanner & Payment */}
          <div className="lg:col-span-1 space-y-6">
            {/* QR Scanner */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scan className="w-5 h-5 text-blue-600" />
                  Product Scanner
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleScanProduct} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      QR Code / Product Code
                    </label>
                    <Input
                      ref={qrInputRef}
                      placeholder="Scan or type product code"
                      value={qrCode}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQrCode(e.target.value)}
                      className="font-mono text-lg"
                      autoFocus
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    disabled={isScanning || !qrCode.trim()}
                  >
                    {isScanning ? 'Scanning...' : 'Add to Cart'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Payment Type
                  </label>
                  <Select
                    value={paymentType}
                    onValueChange={(value: PaymentType) => setPaymentType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">💵 Cash</SelectItem>
                      <SelectItem value="card">💳 Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Last Order */}
            {lastOrderId && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800 flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Last Order
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-green-800">
                    Order #{lastOrderId} completed successfully
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Shopping Cart */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-green-600" />
                    Shopping Cart
                    {cartItemCount > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {cartItemCount} items
                      </Badge>
                    )}
                  </div>
                  {cart.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearCart}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Clear Cart
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">Cart is empty</p>
                    <p className="text-gray-400 mt-2">Scan a product to get started</p>
                  </div>
                ) : (
                  <>
                    {/* Cart Items */}
                    <div className="space-y-4">
                      {cart.map((item: CartItem) => (
                        <div
                          key={item.product.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">
                              {item.product.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              ${item.product.price.toFixed(2)} each
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                              QR: {item.product.qr_code}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="font-medium text-lg min-w-[2rem] text-center">
                                {item.quantity}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>

                            {/* Subtotal */}
                            <div className="text-right min-w-[5rem]">
                              <p className="font-bold text-lg text-green-600">
                                ${item.subtotal.toFixed(2)}
                              </p>
                            </div>

                            {/* Remove Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-red-600 border-red-300 hover:bg-red-50 ml-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator className="my-6" />

                    {/* Cart Summary */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-xl font-bold">
                        <span>Total:</span>
                        <span className="text-green-600">
                          ${cartTotal.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex gap-4">
                        <Button
                          onClick={processOrder}
                          disabled={isProcessing || cart.length === 0}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-lg py-6"
                        >
                          {isProcessing ? 'Processing...' : `Process Order - ${paymentType === 'cash' ? '💵' : '💳'}`}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;