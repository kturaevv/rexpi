// dev_server.js
console.log("Starting server...");

const port = 8000;
const server = Deno.listen({ port });
console.log(`HTTP server running at http://localhost:${port}/`);

for await (const conn of server) {
    handleHttp(conn);
}

async function handleHttp(conn) {
    const httpConn = Deno.serveHttp(conn);
    for await (const requestEvent of httpConn) {
        const url = new URL(requestEvent.request.url);
        console.log("Received request:", url.pathname);

        try {
            const filepath = url.pathname === "/"
                ? "index.html"
                : url.pathname.slice(1);

            let content;
            try {
                content = await Deno.readFile(filepath);
            } catch {
                content = await Deno.readFile("src/" + filepath);
            }

            // Set correct MIME type based on file extension
            let contentType = "text/plain";
            if (filepath.endsWith(".html")) {
                contentType = "text/html";
            } else if (filepath.endsWith(".js")) {
                contentType = "text/javascript";
            } else if (filepath.endsWith(".css")) {
                contentType = "text/css";
            } else if (filepath.endsWith(".wgsl")) {
                contentType = "application/wgsl"; // Added WGSL MIME type
            }

            await requestEvent.respondWith(
                new Response(content, {
                    headers: {
                        "content-type": contentType,
                        // Add CORS headers to ensure WGSL files can be loaded from different origins
                        "Access-Control-Allow-Origin": "*",
                    },
                }),
            );
        } catch (error) {
            console.error("Error:", error);
            await requestEvent.respondWith(
                new Response("Error reading file", { status: 404 }),
            );
        }
    }
}
