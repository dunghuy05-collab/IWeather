FROM node:24-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN npm ci --prefix frontend
COPY frontend ./frontend
RUN npm run build --prefix frontend

FROM node:24-alpine AS backend-build
WORKDIR /app
COPY backend/package*.json ./backend/
RUN npm ci --prefix backend
COPY backend ./backend
RUN npm run build --prefix backend

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package*.json ./backend/
RUN npm ci --omit=dev --prefix backend
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=frontend-build /app/frontend/out ./frontend/out
EXPOSE 3000
CMD ["node", "backend/dist/server.js"]
