import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { getProducts } from '../handlers/get_products';

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getProducts();
    expect(result).toEqual([]);
  });

  it('should return all products from database', async () => {
    // Create test products
    await db.insert(productsTable)
      .values([
        {
          qr_code: 'QR001',
          name: 'Test Product 1',
          price: '19.99'
        },
        {
          qr_code: 'QR002', 
          name: 'Test Product 2',
          price: '25.50'
        },
        {
          qr_code: 'QR003',
          name: 'Test Product 3', 
          price: '5.00'
        }
      ])
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(3);
    
    // Verify all products are returned with correct fields
    expect(result[0]).toMatchObject({
      qr_code: 'QR001',
      name: 'Test Product 1',
      price: 19.99
    });
    
    expect(result[1]).toMatchObject({
      qr_code: 'QR002',
      name: 'Test Product 2',
      price: 25.50
    });
    
    expect(result[2]).toMatchObject({
      qr_code: 'QR003',
      name: 'Test Product 3',
      price: 5.00
    });

    // Verify all required fields exist
    result.forEach(product => {
      expect(product.id).toBeDefined();
      expect(typeof product.id).toBe('number');
      expect(product.qr_code).toBeDefined();
      expect(typeof product.qr_code).toBe('string');
      expect(product.name).toBeDefined();
      expect(typeof product.name).toBe('string');
      expect(product.price).toBeDefined();
      expect(typeof product.price).toBe('number');
      expect(product.created_at).toBeInstanceOf(Date);
      expect(product.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should handle numeric price conversion correctly', async () => {
    // Create product with decimal price (note: schema precision is 10,2 so it rounds to 2 decimal places)
    await db.insert(productsTable)
      .values({
        qr_code: 'QR_DECIMAL',
        name: 'Decimal Price Product',
        price: '123.45' // String with 2 decimal places to match schema precision
      })
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(1);
    expect(typeof result[0].price).toBe('number');
    expect(result[0].price).toBe(123.45);
  });

  it('should maintain correct ordering when multiple products exist', async () => {
    // Create products in specific order
    const products = [
      { qr_code: 'QR_A', name: 'Product A', price: '10.00' },
      { qr_code: 'QR_B', name: 'Product B', price: '20.00' },
      { qr_code: 'QR_C', name: 'Product C', price: '30.00' }
    ];

    for (const product of products) {
      await db.insert(productsTable)
        .values(product)
        .execute();
    }

    const result = await getProducts();

    expect(result).toHaveLength(3);
    
    // Results should be ordered by insertion (id order)
    expect(result[0].name).toBe('Product A');
    expect(result[1].name).toBe('Product B');
    expect(result[2].name).toBe('Product C');
    
    // Verify IDs are sequential
    expect(result[0].id).toBeLessThan(result[1].id);
    expect(result[1].id).toBeLessThan(result[2].id);
  });

  it('should handle products with zero price', async () => {
    await db.insert(productsTable)
      .values({
        qr_code: 'QR_FREE',
        name: 'Free Product',
        price: '0.00'
      })
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(0);
    expect(typeof result[0].price).toBe('number');
  });
});