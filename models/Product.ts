import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IProduct extends Document {
  // 1. Thông tin cơ bản
  name: string;
  description: string;
  price: number;
  salePrice?: number;
  category: 'Cầu lông' | 'Pickleball' | 'Tennis' | 'Giày Thể Thao' | 'Phụ Kiện';
  brand: string;
  sku: string;
  status: 'Còn hàng' | 'Hết hàng' | 'Ngừng kinh doanh';

  // 2. Thuộc tính riêng theo loại (Dùng lồng nhau)
  specifications: {
    // Cho Cầu lông
    badminton?: {
      weightGrip: string; // VD: 4U/G5
      balance: string; // VD: Hơi nặng đầu
      maxTension: string;
      frameThickness: string;
      shaftDiameter: string;
      frameMaterial: string;
      shaftMaterial: string;
      length: string;
      color: string;
      origin: string;
    };
    // Cho Pickleball
    pickleball?: {
      surface: string;
      core: string;
      upaACert: boolean;
      usapCert: boolean;
      warranty: string;
      shape: string;
      length: string;
      width: string;
      handleType: string;
      handleLength: string;
      handleCircumference: string;
    };
    // Cho Giày Thể Thao
    shoes?: {
      color: string;
      origin: string;
      technology: string;
      soleMaterial: string;
      upperMaterial: string;
    };
  };

  // 3. Hình ảnh
  mainImage: string;
  gallery: string[];

  // 4 & 5. Biến thể và Kho
  variants: {
    size?: string;
    color?: string;
    stock: number;
  }[];
  totalStock: number;
  soldCount: number;
  lowStockAlert: number;

  // 9 & 10. SEO & Hiển thị
  slug: string;
  isFeatured: boolean;
  isFocus: boolean;
  isActive: boolean;
}

const productSchema: Schema<IProduct> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0 },
    category: { type: String, enum: ['Cầu lông', 'Pickleball', 'Tennis', 'Giày Thể Thao', 'Phụ Kiện'], required: true },
    brand: { type: String, required: true, trim: true },
    sku: { type: String, trim: true, unique: true },
    status: { type: String, default: 'Còn hàng' },


    specifications: {
      badminton: {
        weightGrip: String,
        balance: String,
        maxTension: String,
        frameThickness: String,
        shaftDiameter: String,
        frameMaterial: String,
        shaftMaterial: String,
        length: String,
        color: String,
        origin: String
      },
      pickleball: {
        surface: String, core: String, upaACert: Boolean, usapCert: Boolean,
        warranty: String, shape: String, length: String, width: String,
        handleType: String, handleLength: String, handleCircumference: String
      },
      tennis: {
        weight: String,
        headSize: String,
        stringPattern: String,
        gripSize: String,
        balancePoint: String,
        frameLength: String,
        material: String,
        balanceType: String
      },
      shoes: {
        color: String,
        origin: String,
        technology: String,
        soleMaterial: String,
        upperMaterial: String
      }
      },


    mainImage: { type: String, required: true },
    gallery: [String],

    variants: [{
      size: String,
      color: String,
      stock: { type: Number, default: 0 }
    }],
    totalStock: { type: Number, default: 0 },
    soldCount: { type: Number, default: 0 },
    lowStockAlert: { type: Number, default: 10 },

    slug: { type: String, unique: true },
  isFeatured: { type: Boolean, default: false },
  featuredAt: { type: Date },
  isFocus: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Tự động tạo slug, SKU và tính tổng kho trước khi validate
productSchema.pre<IProduct>('validate', async function() {
  // 1. Tạo Slug tự động từ Tên
  if (this.isModified('name') && this.name) {
    this.slug = this.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/([^0-9a-z-\s])/g, '').replace(/(\s+)/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  }
  
  // 2. Tạo SKU tự động: BRAND(3) + CATEGORY(2) + ID(5)
  if (!this.sku && this.brand && this.category) {
    const brandPrefix = this.brand.substring(0, 3).toUpperCase();
    const categoryPrefix = this.category.substring(0, 2).toUpperCase();
    const idSuffix = this._id.toString().substring(this._id.toString().length - 5).toUpperCase();
    this.sku = `${brandPrefix}-${categoryPrefix}-${idSuffix}`;
  }

  // 3. Tính tổng tồn kho từ các biến thể
  if (this.variants && this.variants.length > 0) {
    this.totalStock = this.variants.reduce((acc, curr) => acc + curr.stock, 0);
  }
});

const Product: Model<IProduct> = mongoose.model<IProduct>('Product', productSchema);

export default Product;
