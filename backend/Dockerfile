FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev
COPY backend ./backend
COPY frontend ./frontend
ENV NODE_ENV=production PORT=5000
EXPOSE 5000
WORKDIR /app/backend
CMD ["node", "server.js"]
