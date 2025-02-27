FROM node:16.18-buster-slim
WORKDIR /app
COPY . .
RUN npm install --legacy-peer-deps
ENV NODE_ENV development
EXPOSE 5000
CMD ["npm", "run", "deploy:prod"]
