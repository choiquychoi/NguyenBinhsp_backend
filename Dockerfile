FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

ENV PORT=5000
ENV MONGO_URI=mongodb://host.docker.internal:27017/sports_ecommerce
ENV JWT_SECRET=nguyen_binh_sports_secret_2024_fixed
ENV NODE_ENV=production

EXPOSE 5000

CMD ["npm", "start"]
