FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

ARG VITE_API_BASE_URL=
ARG VITE_METRICS_URL=
ARG VITE_USE_MOCKS=false
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_METRICS_URL=${VITE_METRICS_URL} \
    VITE_USE_MOCKS=${VITE_USE_MOCKS}

COPY . .
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
