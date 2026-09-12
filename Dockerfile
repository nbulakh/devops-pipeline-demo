# syntax=docker/dockerfile:1

# Single-stage runtime image.
#
# The application is compiled in CI (`npm run build`) and the resulting `dist/`
# is provided in the build context (downloaded from a pipeline artifact), rather
# than compiled inside the image. This guarantees the image ships the exact
# build output that CI produced and tested. Production dependencies are still
# installed here with `npm ci --omit=dev` so node_modules is correct for the
# image platform (linux/alpine).
#
# NOTE: this image is NOT reproducible from source with a bare `docker build .`;
# it requires a pre-built `dist/` in the context (see the CI/release workflows).
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
