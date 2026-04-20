import express, { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import News from '../models/News.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. API AI WRITER (GEMINI 2.0 FLASH)
router.post('/ai-writer', protect, async (req: Request, res: Response) => {
  const { prompt, type } = req.body;
  
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "") {
    return res.status(400).json({ message: '⚠️ CHƯA CÓ API KEY: Tính năng AI tạm thời chưa thể sử dụng. Vui lòng cập nhật GEMINI_API_KEY mới vào file .env' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Sử dụng model "gemini-1.5-flash" - Model mới và ổn định nhất hiện tại
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const aiPrompt = `
      Bạn là một chuyên gia nội dung về thể thao (cầu lông, pickleball, giày thể thao).
      Hãy viết một nội dung bài viết theo chủ đề: "${prompt}" cho danh mục "${type}".

      YÊU CẦU:
      1. Nội dung phải chuyên sâu, chuẩn SEO, giọng văn chuyên nghiệp nhưng gần gũi.
      2. Sử dụng các thẻ HTML như <h2>, <h3>, <p>, <ul>, <li> để trình bày.
      3. Hãy viết ít nhất 500 chữ.
      4. KHÔNG TRẢ VỀ JSON, CHỈ TRẢ VỀ NỘI DUNG HTML CỦA BÀI VIẾT.
    `;

    const result = await model.generateContent(aiPrompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error('AI không trả về nội dung. Có thể do nội dung nhạy cảm hoặc vi phạm chính sách.');
    }

    res.json({ content: text });
  } catch (error: any) {
    // Bắt lỗi cụ thể nếu Google khóa Key
    if (error.status === 403) {
      return res.status(403).json({ message: '❌ LỖI BẢO MẬT: API Key của Google đã bị khóa (Leaked). Em hãy lấy Key mới và dán vào .env nhé!' });
    }
    console.error('LỖI GEMINI AI:', error);
    res.status(500).json({ message: 'Lỗi AI: ' + error.message });
  }
});

// 2. API LƯU BÀI VIẾT (ADMIN)
router.post('/posts', protect, async (req: Request, res: Response) => {
  try {
    const { title, slug, content, summary, thumbnail, category, status, attachedProducts } = req.body;
    
    // Kiểm tra slug trùng lặp
    const existingPost = await News.findOne({ slug });
    if (existingPost) {
      return res.status(400).json({ message: 'Slug (Đường dẫn) đã tồn tại!' });
    }

    const news = new News({
      title,
      slug,
      content,
      summary,
      thumbnail,
      category,
      status,
      attachedProducts
    });

    const savedNews = await news.save();
    res.status(201).json(savedNews);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 2.1 API CẬP NHẬT BÀI VIẾT (ADMIN)
router.put('/posts/:id', protect, async (req: Request, res: Response) => {
  try {
    const post = await News.findById(req.params.id);
    if (post) {
      Object.assign(post, req.body);
      const updatedPost = await post.save();
      res.json(updatedPost);
    } else {
      res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 2.2 API XÓA BÀI VIẾT (ADMIN)
router.delete('/posts/:id', protect, async (req: Request, res: Response) => {
  try {
    const post = await News.findById(req.params.id);
    if (post) {
      await News.findByIdAndDelete(req.params.id);
      res.json({ message: 'Bài viết đã được xóa thành công' });
    } else {
      res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 2.3 API LẤY TẤT CẢ BÀI VIẾT (ADMIN - CÓ PHÂN TRANG)
router.get('/admin/all-posts', protect, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const total = await News.countDocuments();
    const posts = await News.find()
      .populate('attachedProducts')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      posts,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 3. API LẤY DANH SÁCH BÀI VIẾT (CÔNG KHAI - CÓ PHÂN TRANG)
router.get('/posts', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 9;
    const category = req.query.category as string;
    const skip = (page - 1) * limit;

    let query: any = { status: 'Published' };
    if (category && category !== 'Tất cả') {
      query.category = category;
    }

    const total = await News.countDocuments(query);
    const posts = await News.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      posts,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 4. API LẤY CHI TIẾT BÀI VIẾT THEO SLUG
router.get('/posts/:slug', async (req: Request, res: Response) => {
  try {
    const post = await News.findOne({ slug: req.params.slug })
      .populate('attachedProducts');
    
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
    res.json(post);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
