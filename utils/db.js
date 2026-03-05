// Database connection utility for Prisma
const { PrismaClient } = require('@prisma/client');

// PrismaClient connection
let prisma;

if (process.env.NODE_ENV === 'production') {
  // Production: Create new instance per request (serverless)
  prisma = new PrismaClient();
} else {
  // Development: Reuse instance across hot reloads
  if (!global.__db) {
    global.__db = new PrismaClient();
  }
  prisma = global.__db;
}

// Graceful shutdown in non-serverless environments
if (typeof process !== 'undefined' && process.on) {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

module.exports = { prisma };
