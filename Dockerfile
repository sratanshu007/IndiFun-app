# One container: backend + built live app (/) + admin panel (/admin)
FROM node:22-slim AS build
WORKDIR /src
COPY app/package*.json app/
COPY admin/package*.json admin/
RUN npm --prefix app install && npm --prefix admin install
COPY app app
COPY admin admin
RUN npm --prefix app run build && npm --prefix admin run build

FROM node:22-slim
WORKDIR /srv
COPY server/package*.json server/
RUN npm --prefix server install --omit=dev
COPY server server
COPY animations/dist animations/dist
COPY --from=build /src/app/dist app/dist
COPY --from=build /src/admin/dist admin/dist
ENV NODE_ENV=production PORT=4000 UPLOADS_DIR=/data/uploads PRIVATE_DIR=/data/private
VOLUME /data
EXPOSE 4000
CMD ["sh", "-c", "node --no-warnings server/src/seed.js && node --no-warnings server/src/index.js"]
