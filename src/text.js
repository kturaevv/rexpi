import { quat, mat4, vec3, vec2 } from "gl-matrix";
import Renderer from "./renderer.js";


const shader_code = `
// @group(0) @binding(0) var<storage, read> text: array<u32>;
@group(0) @binding(0) var<uniform> bg_color: vec4<f32>;

const QUAD = array<vec4<f32>, 4>(
    vec4(-1.0,  1.0, 0.0, 1.0),
    vec4( 1.0,  1.0, 0.0, 1.0),
    vec4(-1.0, -1.0, 0.0, 1.0),
    vec4( 1.0, -1.0, 0.0, 1.0),
);
const INDICES = array<u32, 6>(
    0, 1, 2,
    2, 1, 3,
);

struct VertexOut {
    @builtin(position) pos: vec4<f32>,
    @location(0) col: vec4<f32>,
}


@vertex
fn vs_main(
    @builtin(vertex_index) vi: u32,
) -> VertexOut {
    var out: VertexOut;
    out.pos = QUAD[INDICES[vi]];
    return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
    return bg_color;
}
`
class Buffers {
    /**
     * @param {GPUDevice} device
     * @param {GPUCanvasContext} context
     **/
    constructor(device, base_label) {
        this.device = device;
        this.label = base_label;
        this.binding = 0;
        this.entries = [];
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
        this.device.queue.writeBuffer(buf, 0, data);
        this.entries.push({ binding: this.binding, resource: { buffer: buf } });
        this.binding += 1;
        return buf;
    }

    get_bind_group(pipeline) {
        return this.device.createBindGroup({
            label: "TextBindGroup",
            layout: pipeline.getBindGroupLayout(0),
            entries: this.entries
        });
    }
}

export default class TextRenderer extends Renderer {
    /**
     * @param {GPUDevice} device
     * @param {GPUCanvasContext} context
     **/
    constructor(device, context, gui) {
        super();

        this.gui = gui;
        this.device = device;
        this.context = context;

        this.buffers = new Buffers(device, 'Plane');
        const get_bg_color = () => new Float32Array(this.gui.bg.value);
        this.color_buf = this.buffers.create_buffer(get_bg_color(), GPUBufferUsage.UNIFORM);

        document.addEventListener(this.gui.bg.event, () => {
            this.device.queue.writeBuffer(this.color_buf, 0, get_bg_color());
        });

        // const msg = new TextEncoder();
        // const msg_buf = msg.encode("This msg is rendered on GPU!");
        // this.buffers.create_buffer(msg_buf, GPUBufferUsage.STORAGE);

        this.shader = device.createShaderModule({
            label: "TextRenderShader",
            code: shader_code,
        });

        this.pipeline = device.createRenderPipeline({
            label: "TextRenderPipeline",
            layout: 'auto',
            vertex: {
                module: this.shader,
                entryPoint: 'vs_main',
            },
            fragment: {
                module: this.shader,
                entryPoint: 'fs_main',
                targets: [{ format: "rgba8unorm" }]
            },
            primitive: { topology: "triangle-list" },
        });

        this.render_callback = () => {
            const command_encoder = device.createCommandEncoder({ label: "TextCommandEncoder" });

            const pass = command_encoder.beginRenderPass({
                label: "TextRenderPass",
                colorAttachments: [{
                    view: context.getCurrentTexture().createView(),
                    clearValue: [1.0, 1.0, 1.0, 1.0],
                    loadOp: 'clear',
                    storeOp: 'store'
                }],
            });

            pass.setPipeline(this.pipeline);
            pass.setBindGroup(0, this.buffers.get_bind_group(this.pipeline));
            pass.draw(6);
            pass.end();

            device.queue.submit([command_encoder.finish()]);
            requestAnimationFrame(this.render_callback);
        };
    }

    render() {
        this.is_rendering = true;
        this.render_callback();
    }
    terminate() {
        this.is_rendering = false;
    }
}
