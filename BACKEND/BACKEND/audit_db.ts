import { seedDatabase } from './prisma/seed';

seedDatabase()
  .then((res) => {
    console.log('Database verification successfully completed:', res);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Database verification error:', err);
    process.exit(1);
  });
