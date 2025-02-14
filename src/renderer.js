var RENDERER_COUNT = 0;

export default class Renderer {
    constructor() {
        RENDERER_COUNT += 1;
        this.id = RENDERER_COUNT;
        this.is_rendering = false;
    }
    render() {
        throw new Error("render() must be implemented!");
    }
    terminate() {
        throw new Error("terminate() must be implemented!");
    }
}

