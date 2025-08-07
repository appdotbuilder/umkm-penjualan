import { db } from '../db';
import { ordersTable, orderItemsTable, productsTable } from '../db/schema';
import { type Order, type OrderItem } from '../schema';
import { eq } from 'drizzle-orm';

// Extended order type that includes order items with product details
export type OrderWithItems = Order & {
    items: (OrderItem & {
        product: {
            id: number;
            name: string;
            qr_code: string;
        };
    })[];
};

export async function getOrderById(orderId: number): Promise<OrderWithItems | null> {
    try {
        // First, get the order
        const orders = await db.select()
            .from(ordersTable)
            .where(eq(ordersTable.id, orderId))
            .execute();

        if (orders.length === 0) {
            return null;
        }

        const order = orders[0];

        // Then get order items with product details using joins
        const orderItemsResults = await db.select({
            // Order item fields
            id: orderItemsTable.id,
            order_id: orderItemsTable.order_id,
            product_id: orderItemsTable.product_id,
            quantity: orderItemsTable.quantity,
            unit_price: orderItemsTable.unit_price,
            subtotal: orderItemsTable.subtotal,
            created_at: orderItemsTable.created_at,
            // Product fields
            product_id_ref: productsTable.id,
            product_name: productsTable.name,
            product_qr_code: productsTable.qr_code,
        })
            .from(orderItemsTable)
            .innerJoin(productsTable, eq(orderItemsTable.product_id, productsTable.id))
            .where(eq(orderItemsTable.order_id, orderId))
            .execute();

        // Convert the results to the expected format
        const items = orderItemsResults.map(result => ({
            id: result.id,
            order_id: result.order_id,
            product_id: result.product_id,
            quantity: result.quantity,
            unit_price: parseFloat(result.unit_price), // Convert numeric to number
            subtotal: parseFloat(result.subtotal), // Convert numeric to number
            created_at: result.created_at,
            product: {
                id: result.product_id_ref,
                name: result.product_name,
                qr_code: result.product_qr_code,
            },
        }));

        // Return the complete order with items
        return {
            id: order.id,
            total_amount: parseFloat(order.total_amount), // Convert numeric to number
            payment_type: order.payment_type,
            status: order.status,
            created_at: order.created_at,
            updated_at: order.updated_at,
            items,
        };
    } catch (error) {
        console.error('Failed to get order by ID:', error);
        throw error;
    }
}