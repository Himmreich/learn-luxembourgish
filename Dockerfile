# ---------------------------------------------------------------------------
# Étape 1 : contrôler le contenu, l'empaqueter, puis télécharger les enregistrements du LOD (CC0).
#   - Si le contenu est invalide, le build échoue (on ne déploie pas une erreur).
#   - Si le LOD est injoignable, le build continue sans enregistrements (voix de synthèse).
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS build
WORKDIR /work
COPY tools/ tools/
COPY site/content/ site/content/
RUN python tools/check_content.py site/content
RUN mkdir -p /out && python tools/pack_content.py site/content --out /out/all.json
RUN mkdir -p /out/audio && echo '{}' > /out/audio-map.json \
 && ( python tools/fetch_lod.py --out /work/lod.xml \
   && python tools/build_audio.py --xml /work/lod.xml --content site/content --out /out --download ) \
 || echo "AVERTISSEMENT : enregistrements du LOD indisponibles, l'app utilisera la voix de synthèse."

# ---------------------------------------------------------------------------
# Étape 2 : le site, servi par nginx
# ---------------------------------------------------------------------------
FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY site/ /usr/share/nginx/html/
COPY --from=build /out/all.json /usr/share/nginx/html/content/all.json
COPY --from=build /out/audio/ /usr/share/nginx/html/audio/
COPY --from=build /out/audio-map.json /usr/share/nginx/html/audio-map.json

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1/ || exit 1
