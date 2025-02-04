import GUI from "./gui.js";

export default class AppRegistry {
    constructor() {
        this.currently_running_renderer = null;
    }

    /**
     * @param {Renderer} renderer
     */
    switch_renderer(renderer) {
        if (this.currently_running_renderer) {
            this.currently_running_renderer.terminate();
        }
        this.currently_running_renderer = renderer;
    }

    /**
     * @param {Element} element
     * @param {Renderer} renderer_class
     * @param {Array} render_args
     * @param {GUI} gui
     */
    register(element, renderer_class, render_args, gui = new GUI()) {
        // Handle click event
        element.addEventListener('click', async () => {
            const renderer = new renderer_class();
            await renderer.init(...render_args);
            renderer.render();
            gui.make_visible();
            this.switch_renderer(renderer);
        });

        console.log('dslfkj', gui.widgets());

        // Handle GUI widget events
        for (const widget of gui.widgets()) {
            document.addEventListener(widget.event, async () => {
                // Create a new renderer instance to ensure fresh state
                const renderer = new renderer_class();
                await renderer.init(...render_args);
                renderer.render();
                this.switch_renderer(renderer);
            });
        }
    }
}
