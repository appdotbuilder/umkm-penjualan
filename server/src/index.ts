import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schema types
import {
  createProductInputSchema,
  updateProductInputSchema,
  getProductByIdSchema,
  createCustomerInputSchema,
  getCustomerByIdSchema,
  createTransactionInputSchema,
  getTransactionByIdSchema,
  getDailySalesReportSchema,
  getMonthlySalesReportSchema
} from './schema';

// Import handlers
import { createProduct } from './handlers/create_product';
import { getProducts } from './handlers/get_products';
import { getProductById } from './handlers/get_product_by_id';
import { updateProduct } from './handlers/update_product';
import { createCustomer } from './handlers/create_customer';
import { getCustomers } from './handlers/get_customers';
import { getCustomerById } from './handlers/get_customer_by_id';
import { createTransaction } from './handlers/create_transaction';
import { getTransactions } from './handlers/get_transactions';
import { getTransactionById } from './handlers/get_transaction_by_id';
import { getDailySalesReport } from './handlers/get_daily_sales_report';
import { getMonthlySalesReport } from './handlers/get_monthly_sales_report';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Product management routes
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),

  getProducts: publicProcedure
    .query(() => getProducts()),

  getProductById: publicProcedure
    .input(getProductByIdSchema)
    .query(({ input }) => getProductById(input)),

  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => updateProduct(input)),

  // Customer management routes
  createCustomer: publicProcedure
    .input(createCustomerInputSchema)
    .mutation(({ input }) => createCustomer(input)),

  getCustomers: publicProcedure
    .query(() => getCustomers()),

  getCustomerById: publicProcedure
    .input(getCustomerByIdSchema)
    .query(({ input }) => getCustomerById(input)),

  // Transaction routes
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),

  getTransactions: publicProcedure
    .query(() => getTransactions()),

  getTransactionById: publicProcedure
    .input(getTransactionByIdSchema)
    .query(({ input }) => getTransactionById(input)),

  // Sales report routes
  getDailySalesReport: publicProcedure
    .input(getDailySalesReportSchema)
    .query(({ input }) => getDailySalesReport(input)),

  getMonthlySalesReport: publicProcedure
    .input(getMonthlySalesReportSchema)
    .query(({ input }) => getMonthlySalesReport(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`UMKM Management TRPC server listening at port: ${port}`);
}

start();