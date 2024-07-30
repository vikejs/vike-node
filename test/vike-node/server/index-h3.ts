import { createServer } from 'http'
import { init } from '../database/todoItems'
import { telefunc } from 'telefunc'
import vike from 'vike-node/h3'
import {
    createApp,
    createRouter,
    eventHandler,
    toNodeListener,
    toWebRequest,
} from "h3"

startServer();

async function startServer() {
    await init()
    const app = createApp();
    const port = process.env.PORT || 3000;

    const router = createRouter();

    router.post("/_telefunc", eventHandler(async (event) => {
        const request = toWebRequest(event);

        const httpResponse = await telefunc({
            url: request.url.toString(),
            method: request.method,
            body: await request.text(),
            context: event.context
        });
        const { body, statusCode, contentType } = httpResponse;
        return new Response(body, {
            status: statusCode,
            headers: {
                "content-type": contentType,
            },
        });
    }));

    app.use(eventHandler((event) => {
        event.node.res.setHeader('x-test', 'test');
    }))

    router.use("/**", eventHandler(vike()));

    app.use(router);

    const server = createServer(toNodeListener(app)).listen(port);

    server.on("listening", () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}
