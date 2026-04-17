import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

dotenv.config();

// Khởi tạo S3 Client với cấu hình Endpoint tùy chỉnh
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "auto", // Dùng "auto" nếu là Cloudflare R2
  endpoint: process.env.AWS_S3_ENDPOINT, // Link S3-api mà anh họ bạn đưa
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true, // Quan trọng để tương thích với các dịch vụ S3-Compatible
});

/**
 * Tạo Presigned URL để Frontend có thể upload ảnh trực tiếp
 */
export const generatePresignedUrl = async (fileName: string, fileType: string) => {
  const fileKey = `products/${Date.now()}-${fileName}`;
  
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileKey,
    ContentType: fileType,
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    
    // Tạo link ảnh công khai dựa trên Endpoint
    // Nếu endpoint có dạng https://abc.com, link ảnh sẽ là https://abc.com/bucket-name/file-key
    let publicUrl = "";
    if (process.env.AWS_S3_ENDPOINT) {
        const endpoint = process.env.AWS_S3_ENDPOINT.replace(/\/$/, ""); // Xóa dấu / ở cuối nếu có
        publicUrl = `${endpoint}/${process.env.AWS_S3_BUCKET_NAME}/${fileKey}`;
    } else {
        publicUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
    }

    return {
      uploadUrl: signedUrl,
      fileUrl: publicUrl,
      fileKey
    };
  } catch (error) {
    console.error("Lỗi khi tạo Presigned URL:", error);
    throw new Error("Không thể tạo URL đăng ảnh.");
  }
};
