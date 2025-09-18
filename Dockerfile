FROM node:22.16.0-alpine3.22

WORKDIR /app

# Optional: update npm (only if needed)
RUN npm install -g npm@11.4.2

COPY package*.json ./

# Use npm ci for clean, fast installs (use if you commit package-lock.json)
RUN npm ci --omit=dev

COPY . .

EXPOSE 5000

CMD ["npm", "start"]

# FROM node:22.16.0-alpine3.22
# FROM node:23-alpine
# WORKDIR /app
# RUN npm install -g npm@latest
# COPY package.json ./
# RUN npm install
# COPY . .
# EXPOSE 5000
# CMD ["npm", "start"]