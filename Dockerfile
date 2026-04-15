# 1. Sử dụng Node.js bản stable
FROM node:20-alpine

# 2. Tạo thư mục làm việc
WORKDIR /app

# 3. Copy package.json để cài thư viện trước (Tối ưu Cache)
COPY package*.json ./
RUN npm install

# 4. Copy toàn bộ mã nguồn
COPY . .

# --- CẤU HÌNH BẢO MẬT (CHỈ ĐỂ LẠI PORT) ---
ENV PORT=5005
# Các biến nhạy cảm để trống, sẽ điền lúc "Run"
ENV MONGO_URI=""
ENV JWT_SECRET=""
ENV GEMINI_API_KEY=""
ENV NODE_ENV=production

# 5. Thông báo cổng 5005
EXPOSE 5005

# 6. Chạy ứng dụng bằng tsx
CMD ["npm", "start"]
