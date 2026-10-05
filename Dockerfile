# ---------------------------------------------------------------------------
# Étape 1 : télécharger le dictionnaire du LOD (CC0) et les enregistrements
#           des mots de l'app. Si le réseau ou le LOD ne répond pas, le build
#           continue sans enregistrements (l'app utilise alors la voix de synthèse).
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS audio
WORKDIR /work
COPY tools/ tools/
COPY site/index.html site/index.html
RUN mkdir -p /out/audio && echo '{}' > /out/audio-map.json \
 && ( python tools/fetch_lod.py --out /work/lod.xml \
   && python tools/build_audio.py --xml /work/lod.xml --html site/index.html --out /out --download ) \
 || echo "AVERTISSEMENT : enregistrements du LOD indisponibles, l'app utilisera la voix de synthèse."

# ---------------------------------------------------------------------------
# Étape 2 : le site, servi par nginx
# ---------------------------------------------------------------------------
FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY site/ /usr/share/nginx/html/
COPY --from=audio /out/audio/ /usr/share/nginx/html/audio/
COPY --from=audio /out/audio-map.json /usr/share/nginx/html/audio-map.json

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1/ || exit 1
