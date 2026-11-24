# Design Studio server image (AWS). The image holds only the tools; the repo itself lives on the
# permanent disk (/data/repo) because the design agent writes to it. See docs/DEPLOY_AWS.md.
FROM node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      git ca-certificates tini chromium fonts-liberation fonts-noto-color-emoji \
      python3 make g++ openssh-client \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=development \
    STUDIO_HOST=0.0.0.0 \
    STUDIO_PORT=4100 \
    STUDIO_PROTOTYPE_PROXY_PORT=4101 \
    STUDIO_TRUST_PROXY=1 \
    STUDIO_SECURE_COOKIE=1 \
    STUDIO_KEY_SOURCE=env \
    STUDIO_CHROME_PATH=/usr/bin/chromium \
    STUDIO_REPO_DIR=/data/repo \
    CLAUDE_CONFIG_DIR=/data/claude \
    NEXT_TELEMETRY_DISABLED=1

RUN useradd --create-home --uid 1001 studio && mkdir -p /data && chown studio:studio /data
COPY entrypoint.sh /usr/local/bin/studio-entrypoint
RUN chmod +x /usr/local/bin/studio-entrypoint

USER studio
WORKDIR /data
EXPOSE 4100 4101
HEALTHCHECK --interval=30s --timeout=5s --start-period=600s CMD node -e "fetch('http://127.0.0.1:4100/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["tini", "--", "studio-entrypoint"]
