const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const flags = await prisma.flagRequest.findMany({ include: { mediaItem: true } });
    console.log(JSON.stringify(flags, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
