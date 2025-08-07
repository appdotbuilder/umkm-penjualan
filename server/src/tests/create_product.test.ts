import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateProductInput = {
  qr_code: 'TEST_QR_001',
  name: 'Test Product',
  price: 19.99
};

describe('createProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a product with all fields', async () => {
    const result = await createProduct(testInput);

    // Basic field validation
    expect(result.qr_code).toEqual('TEST_QR_001');
    expect(result.name).toEqual('Test Product');
    expect(result.price).toEqual(19.99);
    expect(typeof result.price).toEqual('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save product to database', async () => {
    const result = await createProduct(testInput);

    // Query using proper drizzle syntax
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].qr_code).toEqual('TEST_QR_001');
    expect(products[0].name).toEqual('Test Product');
    expect(parseFloat(products[0].price)).toEqual(19.99);
    expect(products[0].created_at).toBeInstanceOf(Date);
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle decimal prices correctly', async () => {
    const decimalInput: CreateProductInput = {
      qr_code: 'DECIMAL_001',
      name: 'Decimal Product',
      price: 123.45
    };

    const result = await createProduct(decimalInput);

    expect(result.price).toEqual(123.45);
    expect(typeof result.price).toEqual('number');

    // Verify in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(parseFloat(products[0].price)).toEqual(123.45);
  });

  it('should handle whole number prices correctly', async () => {
    const wholeInput: CreateProductInput = {
      qr_code: 'WHOLE_001',
      name: 'Whole Number Product',
      price: 50
    };

    const result = await createProduct(wholeInput);

    expect(result.price).toEqual(50);
    expect(typeof result.price).toEqual('number');

    // Verify in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(parseFloat(products[0].price)).toEqual(50);
  });

  it('should enforce unique QR codes', async () => {
    // Create first product
    await createProduct(testInput);

    // Try to create second product with same QR code
    const duplicateInput: CreateProductInput = {
      qr_code: 'TEST_QR_001', // Same QR code
      name: 'Duplicate Product',
      price: 29.99
    };

    // Should throw error due to unique constraint
    await expect(createProduct(duplicateInput)).rejects.toThrow(/duplicate key value/i);
  });

  it('should create multiple products with different QR codes', async () => {
    const input1: CreateProductInput = {
      qr_code: 'MULTI_001',
      name: 'Product 1',
      price: 10.00
    };

    const input2: CreateProductInput = {
      qr_code: 'MULTI_002',
      name: 'Product 2',
      price: 20.00
    };

    const result1 = await createProduct(input1);
    const result2 = await createProduct(input2);

    expect(result1.qr_code).toEqual('MULTI_001');
    expect(result2.qr_code).toEqual('MULTI_002');
    expect(result1.id).not.toEqual(result2.id);

    // Verify both exist in database
    const allProducts = await db.select()
      .from(productsTable)
      .execute();

    expect(allProducts).toHaveLength(2);
  });

  it('should handle long product names', async () => {
    const longNameInput: CreateProductInput = {
      qr_code: 'LONG_001',
      name: 'This is a very long product name that should still be handled correctly by the database',
      price: 99.99
    };

    const result = await createProduct(longNameInput);

    expect(result.name).toEqual(longNameInput.name);
    expect(result.name.length).toBeGreaterThan(50);
  });

  it('should handle very small prices', async () => {
    const smallPriceInput: CreateProductInput = {
      qr_code: 'SMALL_001',
      name: 'Cheap Product',
      price: 0.01
    };

    const result = await createProduct(smallPriceInput);

    expect(result.price).toEqual(0.01);
    expect(typeof result.price).toEqual('number');

    // Verify precision is maintained in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(parseFloat(products[0].price)).toEqual(0.01);
  });
});