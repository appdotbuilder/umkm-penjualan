import { db } from '../db';
import { ordersTable } from '../db/schema';
import { type Order } from '../schema';
import { desc } from 'drizzle-orm';

export const getOrders = async (): Promise<Order[]> => {
  try {
    // Fetch all orders, ordered by creation date (most recent first)
    const results = await db.select()
      .from(ordersTable)
      .orderBy(desc(ordersTable.created_at))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(order => ({
      ...order,
      total_amount: parseFloat(order.total_amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    throw error;
  }
};