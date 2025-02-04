import Renderer from "./renderer.js";

const settings = {
    fov: 60 * Math.PI / 180,
    aspect_ratio: canvas.width / canvas.height,
    near_plane: 1.0,
    far_plane: 1000.0,
}

export default class CubeRenderer extends Renderer {

    /**
     * @param {GPUDevice} device 
     * */
    async init(device, context) {
        this.render_callback = () => {
            if (!this.is_rendering) return;
            requestAnimationFrame(this.render_callback);
        }
    }

    render() {
        this.is_rendering = true;
        requestAnimationFrame(this.render_callback);
    }

    terminate() {
        this.is_rendering = false;
    }
}
