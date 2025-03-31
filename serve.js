const port = 3000;

Bun.serve({
    port: port,
    async fetch(req) {
        const url = new URL(req.url);
        console.log("Request:", url.pathname);

        try {
            const filepath = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
            let file;

            try {
                file = Bun.file(filepath);
                const exists = await file.exists();
                if (!exists) {
                    file = Bun.file("src/" + filepath);
                }
            } catch (error) {
                return new Response("Not Found", { status: 404 });
            }

            const contentType = {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css',
            }[filepath.match(/\.[^.]*$/)?.[0] ?? ''] || 'text/plain';

            return new Response(file, {
                headers: {
                    "content-type": contentType,
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*"
                }
            });
        } catch (error) {
            console.error("Error:", error);
            return new Response("Not Found", { status: 404 });
        }
    }
});

console.log(`Server running at http://localhost:${port}/`);
