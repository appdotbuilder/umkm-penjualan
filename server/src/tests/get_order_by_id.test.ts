import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { ordersTable, orderItemsTable, productsTable } from '../db/schema';
import { getOrderById } from '../handlers/get_order_by_id';
import { eq } from 'drizzle-orm';

describe('getOrderById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent order', async () => {
    const result = await getOrderById(999);
    expect(result).toBeNull();
  });

  it('should return order with empty items array when order has no items', async () => {
    // Create an order without items
    const orderResult = await db.insert(ordersTable)
      .values({
        total_amount: '0.00',
        payment_type: 'cash',
        status: 'pending'
      })
      .returning()
      .execute();

    const order = orderResult[0];
    const result = await getOrderById(order.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(order.id);
    expect(result!.total_amount).toEqual(0.00);
    expect(result!.payment_type).toEqual('cash');
    expect(result!.status).toEqual('pending');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.items).toEqual([]);
  });

  it('should return complete order with single item and product details', async () => {
    // Create a product first
    const productResult = await db.insert(productsTable)
      .values({
        qr_code: 'TEST001',
        name: 'Test Product',
        price: '19.99'
      })
      .returning()
      .execute();

    const product = productResult[0];

    // Create an order
    const orderResult = await db.insert(ordersTable)
      .values({
        total_amount: '39.98',
        payment_type: 'card',
        status: 'completed'
      })
      .returning()
      .execute();

    const order = orderResult[0];

    // Create order item
    await db.insert(orderItemsTable)
      .values({
        order_id: order.id,
        product_id: product.id,
        quantity: 2,
        unit_price: '19.99',
        subtotal: '39.98'
      })
      .execute();

    const result = await getOrderById(order.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(order.id);
    expect(result!.total_amount).toEqual(39.98);
    expect(result!.payment_type).toEqual('card');
    expect(result!.status).toEqual('completed');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Verify items array
    expect(result!.items).toHaveLength(1);
    const item = result!.items[0];
    expect(item.order_id).toEqual(order.id);
    expect(item.product_id).toEqual(product.id);
    expect(item.quantity).toEqual(2);
    expect(item.unit_price).toEqual(19.99);
    expect(item.subtotal).toEqual(39.98);
    expect(item.created_at).toBeInstanceOf(Date);

    // Verify product details in item
    expect(item.product.id).toEqual(product.id);
    expect(item.product.name).toEqual('Test Product');
    expect(item.product.qr_code).toEqual('TEST001');
  });

  it('should return order with multiple items and different products', async () => {
    // Create multiple products
    const product1Result = await db.insert(productsTable)
      .values({
        qr_code: 'PROD001',
        name: 'Product One',
        price: '10.50'
      })
      .returning()
      .execute();

    const product2Result = await db.insert(productsTable)
      .values({
        qr_code: 'PROD002',
        name: 'Product Two',
        price: '25.00'
      })
      .returning()
      .execute();

    const product1 = product1Result[0];
    const product2 = product2Result[0];

    // Create an order
    const orderResult = await db.insert(ordersTable)
      .values({
        total_amount: '71.00', // (10.50 * 3) + (25.00 * 1) + (10.50 * 1)
        payment_type: 'cash',
        status: 'pending'
      })
      .returning()
      .execute();

    const order = orderResult[0];

    // Create multiple order items
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: order.id,
          product_id: product1.id,
          quantity: 3,
          unit_price: '10.50',
          subtotal: '31.50'
        },
        {
          order_id: order.id,
          product_id: product2.id,
          quantity: 1,
          unit_price: '25.00',
          subtotal: '25.00'
        },
        {
          order_id: order.id,
          product_id: product1.id,
          quantity: 1,
          unit_price: '10.50',
          subtotal: '10.50'
        }
      ])
      .execute();

    const result = await getOrderById(order.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(order.id);
    expect(result!.total_amount).toEqual(71.00);
    expect(result!.payment_type).toEqual('cash');
    expect(result!.status).toEqual('pending');

    // Verify all items are returned
    expect(result!.items).toHaveLength(3);

    // Sort items by id to ensure consistent testing order
    const sortedItems = result!.items.sort((a, b) => a.id - b.id);

    // Verify first item (product1, quantity 3)
    expect(sortedItems[0].product_id).toEqual(product1.id);
    expect(sortedItems[0].quantity).toEqual(3);
    expect(sortedItems[0].unit_price).toEqual(10.50);
    expect(sortedItems[0].subtotal).toEqual(31.50);
    expect(sortedItems[0].product.name).toEqual('Product One');
    expect(sortedItems[0].product.qr_code).toEqual('PROD001');

    // Verify second item (product2, quantity 1)
    expect(sortedItems[1].product_id).toEqual(product2.id);
    expect(sortedItems[1].quantity).toEqual(1);
    expect(sortedItems[1].unit_price).toEqual(25.00);
    expect(sortedItems[1].subtotal).toEqual(25.00);
    expect(sortedItems[1].product.name).toEqual('Product Two');
    expect(sortedItems[1].product.qr_code).toEqual('PROD002');

    // Verify third item (product1 again, quantity 1)
    expect(sortedItems[2].product_id).toEqual(product1.id);
    expect(sortedItems[2].quantity).toEqual(1);
    expect(sortedItems[2].unit_price).toEqual(10.50);
    expect(sortedItems[2].subtotal).toEqual(10.50);
    expect(sortedItems[2].product.name).toEqual('Product One');
    expect(sortedItems[2].product.qr_code).toEqual('PROD001');
  });

  it('should handle numeric fields correctly', async () => {
    // Create product with precise decimal values
    const productResult = await db.insert(productsTable)
      .values({
        qr_code: 'DECIMAL001',
        name: 'Decimal Product',
        price: '123.45'
      })
      .returning()
      .execute();

    const product = productResult[0];

    // Create order with precise decimal values
    const orderResult = await db.insert(ordersTable)
      .values({
        total_amount: '370.35', // 123.45 * 3
        payment_type: 'card',
        status: 'completed'
      })
      .returning()
      .execute();

    const order = orderResult[0];

    // Create order item with precise decimal calculations
    await db.insert(orderItemsTable)
      .values({
        order_id: order.id,
        product_id: product.id,
        quantity: 3,
        unit_price: '123.45',
        subtotal: '370.35'
      })
      .execute();

    const result = await getOrderById(order.id);

    expect(result).not.toBeNull();
    
    // Verify numeric types are correctly converted
    expect(typeof result!.total_amount).toBe('number');
    expect(result!.total_amount).toEqual(370.35);
    
    expect(typeof result!.items[0].unit_price).toBe('number');
    expect(result!.items[0].unit_price).toEqual(123.45);
    
    expect(typeof result!.items[0].subtotal).toBe('number');
    expect(result!.items[0].subtotal).toEqual(370.35);
  });

  it('should verify order items are correctly associated', async () => {
    // Create products
    const product1Result = await db.insert(productsTable)
      .values({
        qr_code: 'ASSOC001',
        name: 'Associated Product 1',
        price: '15.00'
      })
      .returning()
      .execute();

    const product2Result = await db.insert(productsTable)
      .values({
        qr_code: 'ASSOC002',
        name: 'Associated Product 2',
        price: '20.00'
      })
      .returning()
      .execute();

    const product1 = product1Result[0];
    const product2 = product2Result[0];

    // Create two separate orders
    const order1Result = await db.insert(ordersTable)
      .values({
        total_amount: '30.00',
        payment_type: 'cash',
        status: 'completed'
      })
      .returning()
      .execute();

    const order2Result = await db.insert(ordersTable)
      .values({
        total_amount: '40.00',
        payment_type: 'card',
        status: 'pending'
      })
      .returning()
      .execute();

    const order1 = order1Result[0];
    const order2 = order2Result[0];

    // Create order items for both orders
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: order1.id,
          product_id: product1.id,
          quantity: 2,
          unit_price: '15.00',
          subtotal: '30.00'
        },
        {
          order_id: order2.id,
          product_id: product2.id,
          quantity: 2,
          unit_price: '20.00',
          subtotal: '40.00'
        }
      ])
      .execute();

    // Get first order and verify it only has its associated items
    const result1 = await getOrderById(order1.id);
    expect(result1).not.toBeNull();
    expect(result1!.items).toHaveLength(1);
    expect(result1!.items[0].product_id).toEqual(product1.id);
    expect(result1!.items[0].product.name).toEqual('Associated Product 1');

    // Get second order and verify it only has its associated items
    const result2 = await getOrderById(order2.id);
    expect(result2).not.toBeNull();
    expect(result2!.items).toHaveLength(1);
    expect(result2!.items[0].product_id).toEqual(product2.id);
    expect(result2!.items[0].product.name).toEqual('Associated Product 2');
  });
});