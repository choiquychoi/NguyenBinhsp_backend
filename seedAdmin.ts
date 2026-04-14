import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin';
import connectDB from './config/db';

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin1';

    if (!username || !password) {
      console.error('Lỗi: Không tìm thấy thông tin Admin.');
      process.exit(1);
    }

    const adminExists = await Admin.findOne({ username });

    if (adminExists) {
      console.log('Tài khoản Admin này đã tồn tại trong Database rồi.');
      process.exit(0);
    }

    const newAdmin = new Admin({
      username,
      password
    });

    await newAdmin.save();

    console.log('--------------------------------------------------');
    console.log('CHÚC MỪNG: Tạo tài khoản Admin thành công!');
    console.log(`Username: ${username}`);
    console.log('Bạn có thể xóa mật khẩu khỏi file .env để bảo mật.');
    console.log('--------------------------------------------------');

    process.exit(0);
  } catch (error: any) {
    console.error('Lỗi khi tạo Admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
