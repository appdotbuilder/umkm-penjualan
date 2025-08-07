import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateProductInput, type CreateProductInput } from '../schema';
import { updateProduct } from '../handlers/update_product';
import { eq } from 'drizzle-orm';

describe('updateProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test product
  const createTestProduct = async (): Promise<any> => {
    const testProduct: CreateProductInput = {
      qr_code: 'TEST001',
      name: 'Original Product',
      price: 10.99
    };
    
    // Insert directly into database to avoid dependency on createProduct handler
    const result = await db.insert(productsTable)
      .values({
        qr_code: testProduct.qr_code,
        name: testProduct.name,
        price: testProduct.price.toString()
      })
      .returning()
      .execute();
    
    return {
      ...result[0],
      price: parseFloat(result[0].price)
    };
  };

  it('should update product name only', async () => {
    const originalProduct = await createTestProduct();

    const updateInput: UpdateProductInput = {
      id: originalProduct.id,
      name: 'Updated Product Name'
    };

    const result = await updateProduct(updateInput);

    expect(result.id).toBe(originalProduct.id);
    expect(result.name).toBe('Updated Product Name');
    expect(result.price).toBe(10.99); // Should remain unchanged
    expect(result.qr_code).toBe('TEST001'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalProduct.updated_at.getTime());
  });

  it('should update product price only', async () => {
    const originalProduct = await createTestProduct();

    const updateInput: UpdateProductInput = {
      id: originalProduct.id,
      price: 25.50
    };

    const result = await updateProduct(updateInput);

    expect(result.id).toBe(originalProduct.id);
    expect(result.name).toBe('Original Product'); // Should remain unchanged
    expect(result.price).toBe(25.50);
    expect(typeof result.price).toBe('number');
    expect(result.qr_code).toBe('TEST001'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update product qr_code only', async () => {
    const originalProduct = await createTestProduct();

    const updateInput: UpdateProductInput = {
      id: originalProduct.id,
      qr_code: 'UPDATED001'
    };

    const result = await updateProduct(updateInput);

    expect(result.id).toBe(originalProduct.id);
    expect(result.name).toBe('Original Product'); // Should remain unchanged
    expect(result.price).toBe(10.99); // Should remain unchanged
    expect(result.qr_code).toBe('UPDATED001');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update all product fields', async () => {
    const originalProduct = await createTestProduct();

    const updateInput: UpdateProductInput = {
      id: originalProduct.id,
      qr_code: 'ALLNEW001',
      name: 'Completely Updated Product',
      price: 99.99
    };

    const result = await updateProduct(updateInput);

    expect(result.id).toBe(originalProduct.id);
    expect(result.name).toBe('Completely Updated Product');
    expect(result.price).toBe(99.99);
    expect(result.qr_code).toBe('ALLNEW001');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalProduct.updated_at.getTime());
  });

  it('should save updated product to database', async () => {
    const originalProduct = await createTestProduct();

    const updateInput: UpdateProductInput = {
      id: originalProduct.id,
      name: 'Database Test Product',
      price: 15.75
    };

    const result = await updateProduct(updateInput);

    // Verify changes persisted in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Database Test Product');
    expect(parseFloat(products[0].price)).toBe(15.75);
    expect(products[0].qr_code).toBe('TEST001'); // Should remain unchanged
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when product does not exist', async () => {
    const updateInput: UpdateProductInput = {
      id: 99999, // Non-existent product ID
      name: 'This should fail'
    };

    await expect(updateProduct(updateInput)).rejects.toThrow(/Product with id 99999 not found/i);
  });

  it('should handle QR code uniqueness constraint', async () => {
    // Create two products
    const product1 = await createTestProduct();
    
    const product2 = await db.insert(productsTable)
      .values({
        qr_code: 'TEST002',
        name: 'Second Product',
        price: '20.00'
      })
      .returning()
      .execute();

    const updateInput: UpdateProductInput = {
      id: product2[0].id,
      qr_code: 'TEST001' // Try to use product1's QR code
    };

    // Should throw constraint violation error
    await expect(updateProduct(updateInput)).rejects.toThrow();
  });

  it('should handle decimal prices correctly', async () => {
    const originalProduct = await createTestProduct();

    const updateInput: UpdateProductInput = {
      id: originalProduct.id,
      price: 123.45 // Valid 2 decimal places for monetary values
    };

    const result = await updateProduct(updateInput);

    expect(typeof result.price).toBe('number');
    expect(result.price).toBe(123.45);

    // Verify in database (should be stored as string but converted back to number)
    const dbProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(typeof dbProduct[0].price).toBe('string');
    expect(parseFloat(dbProduct[0].price)).toBe(123.45);
  });

  it('should round prices to 2 decimal places due to database precision', async () => {
    const originalProduct = await createTestProduct();

    const updateInput: UpdateProductInput = {
      id: originalProduct.id,
      price: 123.456 // More than 2 decimal places - will be rounded
    };

    const result = await updateProduct(updateInput);

    expect(typeof result.price).toBe('number');
    expect(result.price).toBe(123.46); // Rounded to 2 decimal places

    // Verify in database
    const dbProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(parseFloat(dbProduct[0].price)).toBe(123.46);
  });

  it('should update only updated_at when no other fields provided', async () => {
    const originalProduct = await createTestProduct();

    const updateInput: UpdateProductInput = {
      id: originalProduct.id
      // No other fields provided
    };

    const result = await updateProduct(updateInput);

    expect(result.id).toBe(originalProduct.id);
    expect(result.name).toBe(originalProduct.name);
    expect(result.price).toBe(originalProduct.price);
    expect(result.qr_code).toBe(originalProduct.qr_code);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalProduct.updated_at.getTime());
  });
});