import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { ordersTable, orderItemsTable, productsTable } from '../db/schema';
import { type CreateOrderInput } from '../schema';
import { createOrder } from '../handlers/create_order';
import { eq } from 'drizzle-orm';

// Test input with multiple items
const testInput: CreateOrderInput = {
  items: [
    { product_id: 1, quantity: 2 },
    { product_id: 2, quantity: 1 }
  ],
  payment_type: 'card'
};

describe('createOrder', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test products first
    await db.insert(productsTable)
      .values([
        {
          qr_code: 'TEST001',
          name: 'Test Product 1',
          price: '19.99'
        },
        {
          qr_code: 'TEST002', 
          name: 'Test Product 2',
          price: '29.95'
        }
      ])
      .execute();
  });
  
  afterEach(resetDB);

  it('should create an order with multiple items', async () => {
    const result = await createOrder(testInput);

    // Basic field validation
    expect(result.payment_type).toEqual('card');
    expect(result.status).toEqual('pending');
    expect(result.total_amount).toEqual(69.93); // (19.99 * 2) + (29.95 * 1)
    expect(typeof result.total_amount).toBe('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save order to database correctly', async () => {
    const result = await createOrder(testInput);

    // Verify order was saved
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, result.id))
      .execute();

    expect(orders).toHaveLength(1);
    expect(orders[0].payment_type).toEqual('card');
    expect(orders[0].status).toEqual('pending');
    expect(parseFloat(orders[0].total_amount)).toEqual(69.93);
  });

  it('should create order items correctly', async () => {
    const result = await createOrder(testInput);

    // Verify order items were created
    const orderItems = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, result.id))
      .execute();

    expect(orderItems).toHaveLength(2);

    // Check first item (product_id: 1, quantity: 2)
    const item1 = orderItems.find(item => item.product_id === 1);
    expect(item1).toBeDefined();
    expect(item1!.quantity).toEqual(2);
    expect(parseFloat(item1!.unit_price)).toEqual(19.99);
    expect(parseFloat(item1!.subtotal)).toEqual(39.98); // 19.99 * 2

    // Check second item (product_id: 2, quantity: 1)  
    const item2 = orderItems.find(item => item.product_id === 2);
    expect(item2).toBeDefined();
    expect(item2!.quantity).toEqual(1);
    expect(parseFloat(item2!.unit_price)).toEqual(29.95);
    expect(parseFloat(item2!.subtotal)).toEqual(29.95); // 29.95 * 1
  });

  it('should handle cash payment type', async () => {
    const cashInput: CreateOrderInput = {
      items: [{ product_id: 1, quantity: 1 }],
      payment_type: 'cash'
    };

    const result = await createOrder(cashInput);

    expect(result.payment_type).toEqual('cash');
    expect(result.total_amount).toEqual(19.99);
  });

  it('should calculate correct totals for single item', async () => {
    const singleItemInput: CreateOrderInput = {
      items: [{ product_id: 2, quantity: 3 }],
      payment_type: 'card'
    };

    const result = await createOrder(singleItemInput);

    expect(result.total_amount).toEqual(89.85); // 29.95 * 3
    expect(typeof result.total_amount).toBe('number');

    // Verify order item
    const orderItems = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, result.id))
      .execute();

    expect(orderItems).toHaveLength(1);
    expect(orderItems[0].quantity).toEqual(3);
    expect(parseFloat(orderItems[0].subtotal)).toEqual(89.85);
  });

  it('should throw error when product does not exist', async () => {
    const invalidInput: CreateOrderInput = {
      items: [{ product_id: 999, quantity: 1 }], // Non-existent product
      payment_type: 'card'
    };

    await expect(createOrder(invalidInput)).rejects.toThrow(/products not found/i);
  });

  it('should throw error when some products do not exist', async () => {
    const partialInvalidInput: CreateOrderInput = {
      items: [
        { product_id: 1, quantity: 1 }, // Exists
        { product_id: 999, quantity: 1 } // Does not exist
      ],
      payment_type: 'card'
    };

    await expect(createOrder(partialInvalidInput)).rejects.toThrow(/products not found.*999/i);
  });

  it('should handle multiple quantities correctly', async () => {
    const multiQuantityInput: CreateOrderInput = {
      items: [
        { product_id: 1, quantity: 5 },
        { product_id: 2, quantity: 3 }
      ],
      payment_type: 'cash'
    };

    const result = await createOrder(multiQuantityInput);

    expect(result.total_amount).toEqual(189.80); // (19.99 * 5) + (29.95 * 3) = 99.95 + 89.85

    const orderItems = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, result.id))
      .execute();

    expect(orderItems).toHaveLength(2);
    
    const totalFromItems = orderItems.reduce((sum, item) => 
      sum + parseFloat(item.subtotal), 0
    );
    expect(totalFromItems).toEqual(189.80);
  });
});