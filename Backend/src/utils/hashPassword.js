import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const passwordToHash ='F4rb10PH4rm4@2026';
const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);

const hashPassword = async () => {
  const hash = await bcrypt.hash(passwordToHash, saltRounds);

  console.log('Password:', passwordToHash);
  console.log('Salt rounds:', saltRounds);
  console.log('Hash:', hash);
};

hashPassword().catch((error) => {
  console.error('Error generating password hash:', error.message);
  process.exit(1);
});