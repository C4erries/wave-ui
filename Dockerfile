FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Build-time configuration for API endpoints
ARG VITE_API_BASE_URL=http://localhost:8090
ARG VITE_METRICS_URL=
ARG VITE_USE_MOCKS=false
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_METRICS_URL=${VITE_METRICS_URL} \
    VITE_USE_MOCKS=${VITE_USE_MOCKS}

COPY . .
RUN npm run build

FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist ./

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
