FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV PORT=5005

ENV MONGO_URI=""
ENV JWT_SECRET=""
ENV GEMINI_API_KEY=""
ENV NODE_ENV=production

EXPOSE 5005

CMD ["npm", "start"]
