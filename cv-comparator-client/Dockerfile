FROM node:18-alpine as build

WORKDIR /app
COPY cv-comparator-client ./
RUN npm install && npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY cv-comparator-client/nginx.conf /etc/nginx/conf.d/default.conf

# Créer un fichier de configuration supplémentaire pour la taille
RUN echo 'client_max_body_size 50M;' > /etc/nginx/conf.d/client_max_body_size.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]