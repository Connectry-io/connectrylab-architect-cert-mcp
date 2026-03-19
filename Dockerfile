FROM node:22-slim

RUN npm install -g connectry-architect-mcp@latest

CMD ["connectry-architect-mcp"]
