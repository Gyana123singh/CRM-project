import { PrismaClient } from "@prisma/client";

// Expose singleton database connection client
export const prisma = new PrismaClient();

export default prisma;
