import mongoose, { Document, Schema, Model } from "mongoose";

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  salePrice?: number;
  category: "Cầu lông" | "Pickleball" | "Tennis" | "Giày Thể Thao" | "Phụ Kiện";
  brand: string;
  sku: string;
  status: "Còn hàng" | "Hết hàng" | "Ngừng kinh doanh";
  specifications: {
    badminton?: any;
    pickleball?: any;
    tennis?: any;
    shoes?: any;
  };
  mainImage: string;
  gallery: string[];
  slug: string;
  isFeatured: boolean;
  featuredAt?: Date;
  isFocus: boolean;
  isActive: boolean;
}

const productSchema: Schema<IProduct> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0 },
    category: { type: String, enum: ["Cầu lông", "Pickleball", "Tennis", "Giày Thể Thao", "Phụ Kiện"], required: true },
    brand: { type: String, required: true, trim: true },
    sku: { type: String, trim: true, unique: true },
    status: { type: String, default: "Còn hàng" },
    specifications: {
      badminton: Schema.Types.Mixed,
      pickleball: Schema.Types.Mixed,
      tennis: Schema.Types.Mixed,
      shoes: Schema.Types.Mixed
    },
    mainImage: { type: String, required: true },
    gallery: [String],
    slug: { type: String, unique: true },
    isFeatured: { type: Boolean, default: false },
    featuredAt: { type: Date },
    isFocus: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

productSchema.pre<IProduct>("validate", async function() {
  if (this.isModified("name") && this.name) {
    this.slug = this.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").replace(/([^0-9a-z-\s])/g, "").replace(/(\s+)/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  }
  if (!this.sku && this.brand && this.category) {
    const brandPrefix = this.brand.substring(0, 3).toUpperCase();
    const categoryPrefix = this.category.substring(0, 2).toUpperCase();
    const idSuffix = this._id.toString().substring(this._id.toString().length - 5).toUpperCase();
    this.sku = `${brandPrefix}-${categoryPrefix}-${idSuffix}`;
  }
});

const Product: Model<IProduct> = mongoose.model<IProduct>("Product", productSchema);
export default Product;
