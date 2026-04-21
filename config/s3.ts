import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

dotenv.config();

const rawEndpoint = process.env.AWS_S3_ENDPOINT || "";
const cleanEndpoint = rawEndpoint.replace(/\/$/, "");

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1",
  endpoint: cleanEndpoint,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true,
});

export const uploadToS3 = async (fileBuffer: Buffer, fileName: string, fileType: string) => {
  const safeFileName = fileName.replace(/[^a-z0-9.]/gi, "_").toLowerCase();
  const fileKey = `products/${Date.now()}-${safeFileName}`;
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileKey,
    Body: fileBuffer,
    ContentType: fileType,
  });
  try {
    await s3Client.send(command);
    const publicUrl = `${cleanEndpoint}/${process.env.AWS_S3_BUCKET_NAME}/${fileKey}`;
    return { fileUrl: publicUrl, fileKey };
  } catch (error: any) {
    throw new Error(`S3 Upload Failed: ${error.message}`);
  }
};

export const generatePresignedUrl = async (fileName: string, fileType: string) => {
  const fileKey = `products/${Date.now()}-${fileName}`;
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileKey,
    ContentType: fileType,
  });
  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    const publicUrl = `${cleanEndpoint}/${process.env.AWS_S3_BUCKET_NAME}/${fileKey}`;
    return { uploadUrl: signedUrl, fileUrl: publicUrl, fileKey };
  } catch (error) {
    throw new Error("Không thể tạo URL đăng ảnh.");
  }
};
