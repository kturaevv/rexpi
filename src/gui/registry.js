import GUI from "./gui.js";

export default class AppRegistry {
    constructor() {
        this.renderer = null;
        this.guis = [];
    }

    /**
     * @param {Renderer} renderer
     */
    switch_renderer(renderer) {
        if (this.renderer && this.renderer.id === renderer.id) {
            return;
        }

        if (this.renderer) {
            this.renderer.is_rendering = false;
        }

        for (const gui of this.guis) {
            gui.make_invisible();
        }
        renderer.gui.make_visible();
        renderer.render();
        this.renderer = renderer;
    }

    /**
     * @param {Element} element
     * @param {Renderer} renderer
     * @param {GUI} gui
     */
    register(element_id, renderer) {

        this.guis.push(renderer.gui);

        // Handle click event
        const element = document.getElementById(element_id);
        element.addEventListener('click', async () => {
            this.switch_renderer(renderer);
        });
    }
}
