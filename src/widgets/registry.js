import GUI from "./gui.js";

export default class AppRegistry {
    constructor() {
        this.currently_running_renderer = null;
        this.guis = [];
    }

    /**
     * @param {Renderer} renderer
     */
    switch_renderer(renderer, render_gui) {
        if (this.currently_running_renderer) {
            this.currently_running_renderer.terminate();
        }
        for (const gui of this.guis) {
            gui.make_invisible();
        }
        render_gui.make_visible();
        this.currently_running_renderer = renderer;
    }

    /**
     * @param {Element} element
     * @param {Renderer} renderer_class
     * @param {Array} render_args
     * @param {GUI} gui
     */
    register(element, renderer_class, render_args, gui = new GUI()) {
        this.guis.push(gui);

        // Handle click event
        element.addEventListener('click', async () => {
            const renderer = new renderer_class();
            await renderer.init(...render_args);
            renderer.render();
            this.switch_renderer(renderer, gui);
        });

        // Handle GUI widget events
        for (const widget of gui.widgets()) {
            document.addEventListener(widget.event, async () => {
                // Create a new renderer instance to ensure fresh state
                const renderer = new renderer_class();
                await renderer.init(...render_args);
                renderer.render();
                this.switch_renderer(renderer, gui);
            });
        }
    }
}
