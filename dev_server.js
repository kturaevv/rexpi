const port = 8000;
const server = Deno.listen({ port });
console.log(`Server running at http://localhost:${port}/`);

for await (const conn of server) {
    handleHttp(conn);
}

async function handleHttp(conn) {
    const httpConn = Deno.serveHttp(conn);
    for await (const requestEvent of httpConn) {
        const url = new URL(requestEvent.request.url);
        console.log("Request:", url.pathname);

        try {
            const filepath = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
            let content;
            try {
                content = await Deno.readFile(filepath);
            } catch {
                // Try src directory if file not found in root
                content = await Deno.readFile("src/" + filepath);
            }

            // Set correct content type
            const contentType = {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css',
            }[filepath.match(/\.[^.]*$/)?.[0] ?? ''] || 'text/plain';

            await requestEvent.respondWith(
                new Response(content, {
                    headers: {
                        "content-type": contentType,
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Headers": "*"
                    },
                }),
            );
        } catch (error) {
            console.error("Error:", error);
            await requestEvent.respondWith(
                new Response("Not Found", { status: 404 }),
            );
        }
    }
}
