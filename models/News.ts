import mongoose, { Schema, Document } from 'mongoose';

export interface INews extends Document {
  title: string;
  slug: string;
  content: string;
  summary: string;
  thumbnail: string;
  category: string;
  status: 'Draft' | 'Published';
  attachedProducts: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const NewsSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    summary: { type: String },
    thumbnail: { type: String },
    category: { 
      type: String, 
      enum: ['Review sản phẩm', 'Hướng dẫn kỹ thuật', 'Tin tức giải đấu', 'Khuyến mãi'],
      default: 'Review sản phẩm'
    },
    status: { 
      type: String, 
      enum: ['Draft', 'Published'], 
      default: 'Draft' 
    },
    attachedProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }]
  },
  { timestamps: true }
);

export default mongoose.model<INews>('News', NewsSchema);
