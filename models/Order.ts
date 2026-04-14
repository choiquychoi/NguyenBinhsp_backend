import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  name: string;
  variantLabel?: string; // Ví dụ: "Size: 4U/G5, Color: Red"
  quantity: number;
  price: number;
  image: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
    email: string;
    address: string;
    province: string;
    district: string;
    note?: string;
  };
  items: IOrderItem[];
  totalAmount: number;
  shippingMethod: string;
  paymentMethod: 'COD' | 'Bank Transfer';
  status: 'Pending' | 'Confirmed' | 'Shipping' | 'Delivered' | 'Cancelled';
  createdAt: Date;
}

const OrderSchema: Schema = new Schema({
  orderNumber: { type: String, required: true, unique: true },
  customer: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    province: { type: String, required: true },
    district: { type: String, required: true },
    note: { type: String },
  },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    variantLabel: { type: String },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
  }],
  totalAmount: { type: Number, required: true },
  shippingMethod: { type: String, default: 'Standard' },
  paymentMethod: { type: String, enum: ['COD', 'Bank Transfer'], default: 'COD' },
  status: { 
    type: String, 
    enum: ['Pending', 'Confirmed', 'Shipping', 'Delivered', 'Cancelled'],
    default: 'Pending' 
  }
}, { timestamps: true });

export default mongoose.model<IOrder>('Order', OrderSchema);
