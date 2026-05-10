# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python runtime
FROM python:3.12-slim
WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend
COPY backend/main.py ./

# Copy built frontend into backend static dir
COPY --from=frontend-build /app/frontend/dist ./static/

# Create data directory for speed history and session persistence
RUN mkdir -p /app/data

ENV PYTHONUNBUFFERED=1

EXPOSE 8420

HEALTHCHECK --interval=5m --timeout=5s --start-period=15s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8420/api/health')"]

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8420"]
