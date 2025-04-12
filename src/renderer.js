import GUI from "./gui/gui.js";

var RENDERER_COUNT = 0;

export default class Renderer {
    constructor() {
        RENDERER_COUNT += 1;
        this.id = RENDERER_COUNT;
        this.is_rendering = false;
        this.gui = new GUI();
        this.render_callback = () => { throw new Error("Render callback is not implemented!") };
    }

    render() {
        this.is_rendering = true;

        const loop = () => {
            if (!this.is_rendering) { return }

            this.render_callback();

            requestAnimationFrame(loop);
        }

        requestAnimationFrame(loop);
    }

    terminate() {
        this.is_rendering = false;

        Object.keys(this).forEach(attr => {
            if (this[attr] && typeof this[attr].destroy === 'function') {
                console.log(`Calling destroy for ${attr}`);
                this[attr].destroy();
            } else {
                console.log(`Setting ${attr} to null`);
                this[attr] = null;
            }
        });
    }

}

