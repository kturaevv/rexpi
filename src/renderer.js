var RENDERER_COUNT = 0;

export default class Renderer {
    constructor() {
        RENDERER_COUNT += 1;
        this.id = RENDERER_COUNT;
        this.is_rendering = false;
        this.render_callback = () => { throw new Error("Render callback is not implemented!") };
    }

    render() {
        this.is_rendering = true;
        requestAnimationFrame(this.render_callback);
    }

    terminate() {
        this.is_rendering = false;
    }
}

