import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import connectDB from './config/db';
import Product from './models/Product';
import Admin from './models/Admin';
import Contact from './models/Contact';
import newsRoutes from './routes/newsRoutes';
import orderRoutes from './routes/orderRoutes';

import Order from './models/Order';
import News from './models/News';
import { protect } from './middleware/authMiddleware';

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 0. API DASHBOARD STATS (CHỈ ADMIN)
app.get('/api/admin/stats', protect, async (req: Request, res: Response) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalNews = await News.countDocuments();
    
    // 1. Tính tổng doanh thu & thống kê 6 tháng gần nhất
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const orders = await Order.find({ 
      status: { $ne: 'Cancelled' },
      createdAt: { $gte: sixMonthsAgo }
    });

    const totalRevenue = orders.reduce((acc, order) => acc + order.totalAmount, 0);

    // Chuẩn bị dữ liệu doanh thu hàng tháng cho Line Chart
    const monthlyRevenue = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const monthLabel = `${d.getMonth() + 1}/${d.getFullYear()}`;
      
      const monthRev = orders
        .filter(o => o.createdAt.getMonth() === d.getMonth() && o.createdAt.getFullYear() === d.getFullYear())
        .reduce((acc, o) => acc + o.totalAmount, 0);
      
      monthlyRevenue.push({ name: monthLabel, revenue: monthRev });
    }

    // 2. Thống kê trạng thái đơn hàng cho Pie Chart (Donut)
    const statusStats = [
      { name: 'Chờ xử lý', value: await Order.countDocuments({ status: 'Pending' }), color: '#f59e0b' },
      { name: 'Đang giao', value: await Order.countDocuments({ status: 'Shipping' }), color: '#3b82f6' },
      { name: 'Đã giao', value: await Order.countDocuments({ status: 'Delivered' }), color: '#10b981' },
      { name: 'Đã hủy', value: await Order.countDocuments({ status: 'Cancelled' }), color: '#ef4444' }
    ];

    // 3. Top 5 sản phẩm bán chạy nhất cho Bar Chart
    const topProducts = await Product.find()
      .sort({ soldCount: -1 })
      .limit(5)
      .select('name soldCount');

    const topSellingData = topProducts.map(p => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
      sold: p.soldCount
    }));

    // 4. Lấy sản phẩm sắp hết hàng & đơn hàng mới
    const lowStockProducts = await Product.find({ 
      $or: [{ totalStock: { $lt: 10 } }, { "variants.stock": { $lt: 5 } }]
    }).limit(5);

    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5);

    res.json({
      totalRevenue,
      totalOrders,
      totalProducts,
      totalNews,
      monthlyRevenue,
      statusStats: statusStats.filter(s => s.value > 0), // Chỉ gửi trạng thái có đơn
      topSellingData,
      lowStockProducts,
      recentOrders
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Routes
app.use('/api/admin', newsRoutes); 
app.use('/api', newsRoutes); 
app.use('/api/orders', orderRoutes);

// Basic Route for testing
app.get('/', (req: Request, res: Response) => {
  res.send('API is running...');
});

// Admin Login Route
app.post('/api/admin/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ message: 'Sai tên đăng nhập hoặc mật khẩu.' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Sai tên đăng nhập hoặc mật khẩu.' });
    }

    const secret = process.env.JWT_SECRET || 'nguyen_binh_sports_secret_2024_fixed';
    const token = jwt.sign({ id: admin._id }, secret, {
      expiresIn: '1d'
    });

    res.json({
      _id: admin._id,
      username: admin.username,
      token: token
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// API Route for products
app.get('/api/products', async (req: Request, res: Response) => {
  const pageSize = Number(req.query.limit) || 8;
  const page = Number(req.query.page) || 1;
  const isAdmin = req.query.isAdmin === 'true';
  
  let query: any = {};
  if (!isAdmin) query.isActive = true;
  if (req.query.category) query.category = req.query.category;
  if (req.query.brand) query.brand = req.query.brand;

  if (req.query.keyword) {
    query.$or = [
      { name: { $regex: req.query.keyword, $options: 'i' } },
      { brand: { $regex: req.query.keyword, $options: 'i' } },
      { sku: { $regex: req.query.keyword, $options: 'i' } }
    ];
  }
  
  if (req.query.minPrice || req.query.maxPrice) {
    const min = Number(req.query.minPrice) || 0;
    const max = Number(req.query.maxPrice) || Infinity;
    query.price = { $gte: min, $lte: max };
  }

  let sortOption: any = { createdAt: -1 };
  if (req.query.sort === 'price-asc') sortOption = { price: 1 };
  else if (req.query.sort === 'price-desc') sortOption = { price: -1 };

  try {
    const count = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sortOption)
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    const brands = await Product.distinct('brand', req.query.category ? { category: req.query.category as string, isActive: true } : { isActive: true });

    res.json({
      products,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
      brands: brands.filter(b => b)
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/products/:slug', async (req: Request, res: Response) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true });
    if (product) res.json(product);
    else res.status(404).json({ message: 'Sản phẩm hiện không còn hiển thị.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/products/related/:id', async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm gốc' });

    const related = await Product.find({
      _id: { $ne: product._id },
      $or: [{ category: product.category }, { brand: product.brand }]
    }).limit(4);

    res.json(related);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ADMIN CRUD
app.post('/api/admin/products', protect, async (req: Request, res: Response) => {
  try {
    const product = new Product(req.body);
    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/admin/products/:id', protect, async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      Object.assign(product, req.body);
      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/admin/products/:id', protect, async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      await Product.findByIdAndDelete(req.params.id);
      res.json({ message: 'Sản phẩm đã được xóa' });
    } else res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// CONTACT
app.get('/api/contact', async (req: Request, res: Response) => {
  try {
    let contact = await Contact.findOne();
    if (!contact) {
      contact = await Contact.create({
        companyName: 'Nguyễn Bính Sports',
        address: 'Số 123, Đường ABC, TP. Hồ Chí Minh',
        phone: '0901234567',
        email: 'contact@nguyenbinhsports.com',
        mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.4206639906!2d106.7629716!3d10.8911682!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3174d9ebbc894505%3A0xb161c2771addf501!2zTmd1ecG7hW4gQsOtbmggU3BvcnQ!5e0!3m2!1svi!2s!4v1712650000000!5m2!1svi!2s',
        socialLinks: { facebook: '', zalo: '', tiktok: '', instagram: '' }
      });
    }
    res.json(contact);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/admin/contact', protect, async (req: Request, res: Response) => {
  try {
    let contact = await Contact.findOne();
    if (contact) {
      Object.assign(contact, req.body);
      const updatedContact = await contact.save();
      res.json(updatedContact);
    } else {
      const newContact = await Contact.create(req.body);
      res.json(newContact);
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
