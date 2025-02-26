import Renderer from "./renderer.js";


class Buffers {
    /**
     * @param {GPUDevice} device
     * @param {GPUCanvasContext} context
     **/
    constructor(device, base_label) {
        this.device = device;
        this.label = base_label;
    }

    /**
     * @param {Float32Array} data
     * */
    create_buffer(data, usage, label = '') {
        const buf = this.device.createBuffer({
            label: this.label + ":" + label,
            size: data.byteLength,
            usage: usage | GPUBufferUsage.COPY_DST,
        });
        this.device.writeBuffer(buf, 0, data);
        return buf;
    }
}


export default class PlaneRenderer extends Renderer {
    /**
     * @param {GPUDevice} device
     * @param {GPUCanvasContext} context
     **/
    constructor(device, context) {
        super();
        this.device = device;
        this.context = context;

        const shader = device.createShaderModule({
            code: `
@vertex 
fn vs_main() -> @builtin(position) vec4<f32> {
    return vec4(0, 0, 0, 0);
};

@fragment
fn fs_main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    return vec4(1, 1, 1, 1);
};
        `});


        this.pipeline = device.createRenderPipeline({
            label: 'Plane',
            layout: 'auto',
            vertex: {
                module: shader,
                entryPoint: 'vs_main'
            },
            fragment: {
                module: shader,
                entryPoint: 'fs_main',
                targets: [{ format: "rgba8unorm" }],
            }
        });

        this.render_callback = () => {
            if (!this.is_rendering) return;

            const pass_descr = {
                colorAttachments: [
                    {
                        clearValue: [0, 0, 0, 0],
                        loadOp: 'clear',
                        storeOp: 'store',
                        view: context.getCurrentTexture().createView()
                    }
                ]
            };
            const enc = device.createCommandEncoder();
            const pass = enc.beginRenderPass(pass_descr)
            pass.setPipeline(this.pipeline);
            pass.draw(3);
            pass.end();
            device.queue.submit([enc.finish()]);
        }
    }
    render() {
        this.is_rendering = true;
        this.render_callback();
    }
    terminate() {
        this.is_rendering = false;
    }
}
