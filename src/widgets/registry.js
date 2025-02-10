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
            this.currently_running_renderer.is_rendering = false;
            // this.currently_running_renderer.terminate();
        }
        for (const gui of this.guis) {
            gui.make_invisible();
        }
        render_gui.make_visible();
        renderer.render();
        this.currently_running_renderer = renderer;
    }

    /**
     * @param {Element} element
     * @param {Renderer} renderer
     * @param {GUI} gui
     */
    register(element, renderer, gui = new GUI()) {
        this.guis.push(gui);

        // Handle click event
        element.addEventListener('click', async () => {
            this.switch_renderer(renderer, gui);
        });
    }
}
