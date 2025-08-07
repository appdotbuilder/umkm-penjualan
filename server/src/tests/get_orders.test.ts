import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { ordersTable, productsTable } from '../db/schema';
import { type Order } from '../schema';
import { getOrders } from '../handlers/get_orders';

describe('getOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no orders exist', async () => {
    const result = await getOrders();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should fetch all orders from database', async () => {
    // Create test orders
    await db.insert(ordersTable)
      .values([
        {
          total_amount: '25.99',
          payment_type: 'cash',
          status: 'pending'
        },
        {
          total_amount: '45.50',
          payment_type: 'card',
          status: 'completed'
        },
        {
          total_amount: '12.00',
          payment_type: 'cash',
          status: 'cancelled'
        }
      ])
      .execute();

    const result = await getOrders();

    expect(result).toHaveLength(3);
    
    // Verify all orders are returned with correct data types
    result.forEach(order => {
      expect(order.id).toBeDefined();
      expect(typeof order.total_amount).toBe('number');
      expect(['cash', 'card']).toContain(order.payment_type);
      expect(['pending', 'completed', 'cancelled']).toContain(order.status);
      expect(order.created_at).toBeInstanceOf(Date);
      expect(order.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return orders in descending order by creation date', async () => {
    // Create orders with slight delay to ensure different timestamps
    const order1 = await db.insert(ordersTable)
      .values({
        total_amount: '10.00',
        payment_type: 'cash',
        status: 'completed'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const order2 = await db.insert(ordersTable)
      .values({
        total_amount: '20.00',
        payment_type: 'card',
        status: 'pending'
      })
      .returning()
      .execute();

    const result = await getOrders();

    expect(result).toHaveLength(2);
    
    // Most recent order should be first
    expect(result[0].id).toBe(order2[0].id);
    expect(result[1].id).toBe(order1[0].id);
    
    // Verify ordering by timestamp
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should handle orders with different payment types correctly', async () => {
    await db.insert(ordersTable)
      .values([
        {
          total_amount: '15.75',
          payment_type: 'cash',
          status: 'completed'
        },
        {
          total_amount: '32.99',
          payment_type: 'card',
          status: 'pending'
        }
      ])
      .execute();

    const result = await getOrders();

    expect(result).toHaveLength(2);
    
    const cashOrder = result.find(order => order.payment_type === 'cash');
    const cardOrder = result.find(order => order.payment_type === 'card');
    
    expect(cashOrder).toBeDefined();
    expect(cashOrder!.total_amount).toBe(15.75);
    expect(cashOrder!.status).toBe('completed');
    
    expect(cardOrder).toBeDefined();
    expect(cardOrder!.total_amount).toBe(32.99);
    expect(cardOrder!.status).toBe('pending');
  });

  it('should handle orders with all status types correctly', async () => {
    await db.insert(ordersTable)
      .values([
        {
          total_amount: '100.00',
          payment_type: 'cash',
          status: 'pending'
        },
        {
          total_amount: '200.00',
          payment_type: 'card',
          status: 'completed'
        },
        {
          total_amount: '50.00',
          payment_type: 'cash',
          status: 'cancelled'
        }
      ])
      .execute();

    const result = await getOrders();

    expect(result).toHaveLength(3);
    
    const pendingOrder = result.find(order => order.status === 'pending');
    const completedOrder = result.find(order => order.status === 'completed');
    const cancelledOrder = result.find(order => order.status === 'cancelled');
    
    expect(pendingOrder).toBeDefined();
    expect(pendingOrder!.total_amount).toBe(100.00);
    
    expect(completedOrder).toBeDefined();
    expect(completedOrder!.total_amount).toBe(200.00);
    
    expect(cancelledOrder).toBeDefined();
    expect(cancelledOrder!.total_amount).toBe(50.00);
  });

  it('should correctly convert numeric fields to numbers', async () => {
    await db.insert(ordersTable)
      .values({
        total_amount: '123.45',
        payment_type: 'card',
        status: 'completed'
      })
      .execute();

    const result = await getOrders();

    expect(result).toHaveLength(1);
    expect(typeof result[0].total_amount).toBe('number');
    expect(result[0].total_amount).toBe(123.45);
    
    // Verify precision is maintained
    expect(result[0].total_amount.toFixed(2)).toBe('123.45');
  });
});