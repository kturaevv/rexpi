export default class Renderer {
    constructor() {
        this.is_rendering = false;
    }
    render() {
        throw new Error("render() must be implemented!");
    }
    terminate() {
        throw new Error("terminate() must be implemented!");
    }
}

