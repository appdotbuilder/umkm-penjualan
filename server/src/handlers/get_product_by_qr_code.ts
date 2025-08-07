import { db } from '../db';
import { productsTable } from '../db/schema';
import { type ProductByQrCodeInput, type Product } from '../schema';
import { eq } from 'drizzle-orm';

export async function getProductByQrCode(input: ProductByQrCodeInput): Promise<Product | null> {
  try {
    // Query product by QR code
    const result = await db.select()
      .from(productsTable)
      .where(eq(productsTable.qr_code, input.qr_code))
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Product lookup by QR code failed:', error);
    throw error;
  }
}