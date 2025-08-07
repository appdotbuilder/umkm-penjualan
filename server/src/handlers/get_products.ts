import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';

export async function getProducts(): Promise<Product[]> {
  try {
    // Fetch all products from the database
    const results = await db.select()
      .from(productsTable)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(product => ({
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
}