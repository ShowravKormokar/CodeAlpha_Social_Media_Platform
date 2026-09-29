# syntax=docker/dockerfile:1

# =========================================================
# Frontend is vanilla HTML/CSS/JS with no build step.
# nginx serves the static files directly; no npm install is
# required at image build time or at runtime.
# =========================================================
FROM nginx:1.27-alpine

# Replace the stock config with the project config.
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/app.conf

COPY . /usr/share/nginx/html

# nginx:alpine already declares a non-root-capable setup for
# the default `nginx` user; the unprivileged nginx image is not
# required because this service only binds a high port on the
# compose network.
EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=5s \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
