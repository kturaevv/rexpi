export default class Renderer {
    constructor() {
        this.is_rendering = false;
    }
    async init() {
        throw new Error("init() must be implemented!");
    }
    render() {
        throw new Error("render() must be implemented!");
    }
    terminate() {
        throw new Error("terminate() must be implemented!");
    }
}

