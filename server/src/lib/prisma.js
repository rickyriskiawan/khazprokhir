import { PrismaClient } from '@prisma/client';

// Handle BigInt serialization in JSON responses
if (!BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function () {
    return this.toString();
  };
}

const isProduction = process.env.NODE_ENV === 'production';

// PrismaClient singleton to prevent multiple connection pools during development/reload
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: isProduction ? ['error', 'warn'] : ['query', 'info', 'warn', 'error'],
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
