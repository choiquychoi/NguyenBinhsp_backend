# GIAI ĐOẠN 1: BUILDER
FROM node:20-alpine AS builder

WORKDIR /app

# Copy file package để cài đặt dependencies
COPY package*.json ./
RUN npm install

# Copy toàn bộ code nguồn và build sang JS
COPY . .
RUN npm run build

# GIAI ĐOẠN 2: RUNNER
FROM node:20-alpine AS runner

WORKDIR /app

# Chỉ copy những file cần thiết để chạy
ENV NODE_ENV=production
ENV PORT=5005

# Cài đặt duy nhất các thư viện cần cho Production (bỏ qua dev-deps)
COPY package*.json ./
RUN npm install --omit=dev

# Copy thư mục dist đã được build từ tầng builder sang
COPY --from=builder /app/dist ./dist

EXPOSE 5005

# Chạy trực tiếp bằng Node cho hiệu năng cao nhất
CMD ["node", "dist/server.js"]
