import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type ProductByQrCodeInput, type CreateProductInput } from '../schema';
import { getProductByQrCode } from '../handlers/get_product_by_qr_code';

// Test product data
const testProduct: CreateProductInput = {
  qr_code: 'QR123456789',
  name: 'Test Product',
  price: 29.99
};

const anotherProduct: CreateProductInput = {
  qr_code: 'QR987654321',
  name: 'Another Product',
  price: 15.50
};

describe('getProductByQrCode', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should find product by QR code', async () => {
    // Insert test product
    await db.insert(productsTable)
      .values({
        qr_code: testProduct.qr_code,
        name: testProduct.name,
        price: testProduct.price.toString()
      })
      .execute();

    const input: ProductByQrCodeInput = {
      qr_code: 'QR123456789'
    };

    const result = await getProductByQrCode(input);

    expect(result).not.toBeNull();
    expect(result!.qr_code).toEqual('QR123456789');
    expect(result!.name).toEqual('Test Product');
    expect(result!.price).toEqual(29.99);
    expect(typeof result!.price).toEqual('number');
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when QR code not found', async () => {
    const input: ProductByQrCodeInput = {
      qr_code: 'NONEXISTENT_QR'
    };

    const result = await getProductByQrCode(input);

    expect(result).toBeNull();
  });

  it('should find correct product among multiple products', async () => {
    // Insert multiple test products
    await db.insert(productsTable)
      .values([
        {
          qr_code: testProduct.qr_code,
          name: testProduct.name,
          price: testProduct.price.toString()
        },
        {
          qr_code: anotherProduct.qr_code,
          name: anotherProduct.name,
          price: anotherProduct.price.toString()
        }
      ])
      .execute();

    const input: ProductByQrCodeInput = {
      qr_code: 'QR987654321'
    };

    const result = await getProductByQrCode(input);

    expect(result).not.toBeNull();
    expect(result!.qr_code).toEqual('QR987654321');
    expect(result!.name).toEqual('Another Product');
    expect(result!.price).toEqual(15.50);
    expect(typeof result!.price).toEqual('number');
  });

  it('should handle QR codes with special characters', async () => {
    const specialQrCode = 'QR-ABC_123!@#';
    
    // Insert product with special QR code
    await db.insert(productsTable)
      .values({
        qr_code: specialQrCode,
        name: 'Special QR Product',
        price: '99.99'
      })
      .execute();

    const input: ProductByQrCodeInput = {
      qr_code: specialQrCode
    };

    const result = await getProductByQrCode(input);

    expect(result).not.toBeNull();
    expect(result!.qr_code).toEqual(specialQrCode);
    expect(result!.name).toEqual('Special QR Product');
    expect(result!.price).toEqual(99.99);
  });

  it('should be case sensitive for QR codes', async () => {
    // Insert product with uppercase QR code
    await db.insert(productsTable)
      .values({
        qr_code: 'QR-UPPERCASE',
        name: 'Uppercase QR Product',
        price: '10.00'
      })
      .execute();

    // Search with lowercase - should not find anything
    const lowercaseInput: ProductByQrCodeInput = {
      qr_code: 'qr-uppercase'
    };

    const lowercaseResult = await getProductByQrCode(lowercaseInput);
    expect(lowercaseResult).toBeNull();

    // Search with correct case - should find the product
    const uppercaseInput: ProductByQrCodeInput = {
      qr_code: 'QR-UPPERCASE'
    };

    const uppercaseResult = await getProductByQrCode(uppercaseInput);
    expect(uppercaseResult).not.toBeNull();
    expect(uppercaseResult!.name).toEqual('Uppercase QR Product');
  });

  it('should handle decimal prices correctly', async () => {
    // Insert product with complex decimal price
    await db.insert(productsTable)
      .values({
        qr_code: 'QR-DECIMAL-TEST',
        name: 'Decimal Price Product',
        price: '123.45'
      })
      .execute();

    const input: ProductByQrCodeInput = {
      qr_code: 'QR-DECIMAL-TEST'
    };

    const result = await getProductByQrCode(input);

    expect(result).not.toBeNull();
    expect(result!.price).toEqual(123.45);
    expect(typeof result!.price).toEqual('number');
    expect(result!.price.toFixed(2)).toEqual('123.45');
  });
});