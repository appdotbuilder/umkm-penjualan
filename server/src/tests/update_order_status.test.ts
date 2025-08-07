import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { ordersTable, productsTable, orderItemsTable } from '../db/schema';
import { type UpdateOrderStatusInput } from '../schema';
import { updateOrderStatus } from '../handlers/update_order_status';
import { eq } from 'drizzle-orm';

// Test input for updating order status
const testUpdateInput: UpdateOrderStatusInput = {
  id: 1,
  status: 'completed'
};

describe('updateOrderStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test order
  const createTestOrder = async () => {
    // First create a product for the order item
    const productResult = await db.insert(productsTable)
      .values({
        qr_code: 'TEST001',
        name: 'Test Product',
        price: '10.99'
      })
      .returning()
      .execute();

    // Create the order
    const orderResult = await db.insert(ordersTable)
      .values({
        total_amount: '10.99',
        payment_type: 'cash',
        status: 'pending'
      })
      .returning()
      .execute();

    // Create an order item
    await db.insert(orderItemsTable)
      .values({
        order_id: orderResult[0].id,
        product_id: productResult[0].id,
        quantity: 1,
        unit_price: '10.99',
        subtotal: '10.99'
      })
      .execute();

    return orderResult[0];
  };

  it('should update order status successfully', async () => {
    const createdOrder = await createTestOrder();
    
    const updateInput: UpdateOrderStatusInput = {
      id: createdOrder.id,
      status: 'completed'
    };

    const result = await updateOrderStatus(updateInput);

    // Verify the returned order has correct status
    expect(result.id).toEqual(createdOrder.id);
    expect(result.status).toEqual('completed');
    expect(result.total_amount).toEqual(10.99); // Numeric conversion check
    expect(typeof result.total_amount).toBe('number');
    expect(result.payment_type).toEqual('cash');
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Verify updated_at is more recent than created_at
    expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
  });

  it('should save updated status to database', async () => {
    const createdOrder = await createTestOrder();
    
    const updateInput: UpdateOrderStatusInput = {
      id: createdOrder.id,
      status: 'cancelled'
    };

    await updateOrderStatus(updateInput);

    // Query database to verify the status was updated
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, createdOrder.id))
      .execute();

    expect(orders).toHaveLength(1);
    expect(orders[0].status).toEqual('cancelled');
    expect(orders[0].updated_at).toBeInstanceOf(Date);
    
    // Verify updated_at was actually updated
    expect(orders[0].updated_at.getTime()).toBeGreaterThan(orders[0].created_at.getTime());
  });

  it('should update from pending to completed', async () => {
    const createdOrder = await createTestOrder();
    
    const updateInput: UpdateOrderStatusInput = {
      id: createdOrder.id,
      status: 'completed'
    };

    const result = await updateOrderStatus(updateInput);

    expect(result.status).toEqual('completed');
    expect(result.id).toEqual(createdOrder.id);
    expect(result.total_amount).toEqual(10.99);
  });

  it('should update from pending to cancelled', async () => {
    const createdOrder = await createTestOrder();
    
    const updateInput: UpdateOrderStatusInput = {
      id: createdOrder.id,
      status: 'cancelled'
    };

    const result = await updateOrderStatus(updateInput);

    expect(result.status).toEqual('cancelled');
    expect(result.id).toEqual(createdOrder.id);
    expect(result.total_amount).toEqual(10.99);
  });

  it('should preserve other order fields when updating status', async () => {
    const createdOrder = await createTestOrder();
    
    const updateInput: UpdateOrderStatusInput = {
      id: createdOrder.id,
      status: 'completed'
    };

    const result = await updateOrderStatus(updateInput);

    // Verify all original fields are preserved
    expect(result.total_amount).toEqual(10.99);
    expect(result.payment_type).toEqual('cash');
    expect(result.created_at).toEqual(createdOrder.created_at);
    
    // Only status and updated_at should change
    expect(result.status).toEqual('completed');
    expect(result.updated_at.getTime()).toBeGreaterThan(createdOrder.updated_at.getTime());
  });

  it('should throw error when order does not exist', async () => {
    const updateInput: UpdateOrderStatusInput = {
      id: 999, // Non-existent order ID
      status: 'completed'
    };

    await expect(updateOrderStatus(updateInput)).rejects.toThrow(/Order with id 999 not found/i);
  });

  it('should handle multiple status transitions correctly', async () => {
    const createdOrder = await createTestOrder();
    
    // First transition: pending -> completed
    const firstUpdate: UpdateOrderStatusInput = {
      id: createdOrder.id,
      status: 'completed'
    };
    
    const firstResult = await updateOrderStatus(firstUpdate);
    expect(firstResult.status).toEqual('completed');
    
    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Second transition: completed -> cancelled
    const secondUpdate: UpdateOrderStatusInput = {
      id: createdOrder.id,
      status: 'cancelled'
    };
    
    const secondResult = await updateOrderStatus(secondUpdate);
    expect(secondResult.status).toEqual('cancelled');
    expect(secondResult.updated_at.getTime()).toBeGreaterThan(firstResult.updated_at.getTime());
  });
});