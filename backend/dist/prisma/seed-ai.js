"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding AI User...');
    const aiUser = await prisma.user.upsert({
        where: { id: 'AI' },
        update: {},
        create: {
            id: 'AI',
            username: 'AI_BOT',
            displayName: 'AI Bot',
            phoneNumber: '0000000000',
            email: 'ai@tzdraft.com',
            isVerified: true,
            passwordHash: 'AI_HAS_NO_PASSWORD',
        },
    });
    console.log('✅ AI User seeded:', aiUser);
    const testUser = await prisma.user.upsert({
        where: { id: 'test-user' },
        update: {},
        create: {
            id: 'test-user',
            username: 'TestUser',
            displayName: 'Test User',
            phoneNumber: '9999999999',
            email: 'test@example.com',
            isVerified: true,
            passwordHash: 'TEST_PASSWORD',
        },
    });
    console.log('✅ Test User seeded:', testUser);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-ai.js.map