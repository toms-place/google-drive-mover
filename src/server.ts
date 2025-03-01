import http from 'node:http';
import url from 'url';
import { EventEmitter } from 'events';
import { defaultResponse } from 'response';
import { renderToStaticMarkup } from 'react-dom/server';

export const server = http.createServer();
export const tokenCodeEmitter = new EventEmitter();

// Listen to the request event
server.on('request', async (request, res) => {
  if (request.url!.indexOf("/oauth2callback") > -1) {
    const qs = new url.URL(request.url!, "http://localhost:3000").searchParams;
    res.writeHead(200, { 'Content-Type':'text/html'});
    res.end(renderToStaticMarkup(defaultResponse()));
    if (qs.get("code") && qs.get("state")) {
      tokenCodeEmitter.emit('code', {code: qs.get("code"), state: qs.get("state")});
    }
  }
});

server.listen(3000);
