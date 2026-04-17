import express, { Request, Response } from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. API ĐẶT HÀNG (CÔNG KHAI)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { customer, items, totalAmount, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Giỏ hàng trống' });
    }

    // Kiểm tra và trừ tồn kho trước khi tạo đơn hàng
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Sản phẩm ${item.name} không tồn tại` });
      }

      // Nếu có thông tin biến thể cụ thể (Cần xử lý logic này kỹ hơn ở Frontend)
      // Tạm thời trừ vào tổng kho và tìm biến thể tương ứng
      if (product.variants && product.variants.length > 0 && item.variantLabel) {
        const variant = product.variants.find((v: any) => 
          `${v.size || ''}${v.color ? ' - ' + v.color : ''}` === item.variantLabel
        );
        if (variant) {
          if (variant.stock < item.quantity) {
             return res.status(400).json({ message: `Sản phẩm ${item.name} (${item.variantLabel}) không đủ hàng` });
          }
          variant.stock -= item.quantity;
        } else {
          // Nếu không tìm thấy biến thể cụ thể, trừ vào totalStock (hoặc báo lỗi tùy logic)
          if (product.totalStock < item.quantity) {
             return res.status(400).json({ message: `Sản phẩm ${item.name} không đủ hàng` });
          }
        }
      } else {
        // Không có biến thể, trừ trực tiếp
        if (product.totalStock < item.quantity) {
          return res.status(400).json({ message: `Sản phẩm ${item.name} không đủ hàng` });
        }
      }
      
      // Giảm số lượng bán được và trừ tổng kho
      product.soldCount += item.quantity;
      // Hook pre('validate') trong Product.ts sẽ tự tính lại totalStock từ variants
      await product.save();
    }

    // Tạo mã đơn hàng ngẫu nhiên: ORD + Timestamp + 4 số ngẫu nhiên
    const orderNumber = `ORD${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder = new Order({
      orderNumber,
      customer,
      items,
      totalAmount,
      paymentMethod
    });

    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 2. API LẤY DANH SÁCH ĐƠN HÀNG (CHỈ ADMIN)
router.get('/admin/all', protect, async (req: Request, res: Response) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 3. API CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG (CHỈ ADMIN)
router.patch('/:id/status', protect, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 4. API XÓA ĐƠN HÀNG (CHỈ ADMIN)
router.delete('/:id', protect, async (req: Request, res: Response) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    res.json({ message: 'Đơn hàng đã được xóa thành công' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
