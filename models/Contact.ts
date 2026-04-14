import mongoose, { Document, Schema, Model } from 'mongoose';

interface ISocialLinks {
  facebook?: string;
  zalo?: string;
  tiktok?: string;
  instagram?: string;
}

export interface IContact extends Document {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  mapUrl: string;
  socialLinks: ISocialLinks;
  // SEO Section
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
}

const contactSchema: Schema<IContact> = new Schema(
  {
    companyName: { 
      type: String, 
      required: [true, 'Tên công ty là bắt buộc'],
      trim: true 
    },
    address: { 
      type: String, 
      required: [true, 'Địa chỉ là bắt buộc'] 
    },
    phone: { 
      type: String, 
      required: [true, 'Số điện thoại là bắt buộc']
    },
    email: { 
      type: String, 
      required: [true, 'Email là bắt buộc'],
      lowercase: true
    },
    mapUrl: { type: String },
    socialLinks: {
      facebook: String,
      zalo: String,
      tiktok: String,
      instagram: String
    },
    seoTitle: { type: String, maxLength: 70 },
    seoDescription: { type: String, maxLength: 160 },
    seoKeywords: [String]
  },
  { timestamps: true }
);

const Contact: Model<IContact> = mongoose.model<IContact>('Contact', contactSchema);

export default Contact;
