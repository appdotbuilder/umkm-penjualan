import { db } from '../db';
import { ordersTable, orderItemsTable, productsTable } from '../db/schema';
import { type CreateOrderInput, type Order } from '../schema';
import { eq } from 'drizzle-orm';

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  try {
    // Use transaction to ensure data consistency
    const result = await db.transaction(async (tx) => {
      // Validate all products exist and get their current prices
      const productIds = input.items.map(item => item.product_id);
      const products = await tx.select()
        .from(productsTable)
        .where(eq(productsTable.id, productIds[0]))
        .execute();

      // Get all products in one query
      const allProducts = await tx.select()
        .from(productsTable)
        .execute();

      const productMap = new Map(allProducts.map(p => [p.id, p]));

      // Validate that all requested products exist
      const missingProducts = productIds.filter(id => !productMap.has(id));
      if (missingProducts.length > 0) {
        throw new Error(`Products not found: ${missingProducts.join(', ')}`);
      }

      // Calculate total amount and prepare order items
      let totalAmount = 0;
      const orderItemsData = input.items.map(item => {
        const product = productMap.get(item.product_id)!;
        const unitPrice = parseFloat(product.price);
        const subtotal = unitPrice * item.quantity;
        totalAmount += subtotal;

        return {
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: unitPrice.toString(), // Convert to string for numeric column
          subtotal: subtotal.toString() // Convert to string for numeric column
        };
      });

      // Create the order
      const orderResult = await tx.insert(ordersTable)
        .values({
          total_amount: totalAmount.toString(), // Convert to string for numeric column
          payment_type: input.payment_type,
          status: 'pending'
        })
        .returning()
        .execute();

      const order = orderResult[0];

      // Create order items
      const orderItemsWithOrderId = orderItemsData.map(item => ({
        ...item,
        order_id: order.id
      }));

      await tx.insert(orderItemsTable)
        .values(orderItemsWithOrderId)
        .execute();

      // Return order with numeric conversion
      return {
        ...order,
        total_amount: parseFloat(order.total_amount)
      };
    });

    return result;
  } catch (error) {
    console.error('Order creation failed:', error);
    throw error;
  }
}