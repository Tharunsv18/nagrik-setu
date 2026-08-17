const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  const rows = await p.otpRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      email: true,
      verifyToken: true,
      createdAt: true,
      expiresAt: true,
      usedAt: true,
      failCount: true,
      purpose: true,
    }
  });
  console.log(JSON.stringify(rows, null, 2));
  await p.$disconnect();
}

run().catch(async e => { console.error(e); await p.$disconnect(); });
