import { mat3, mat4, vec3, vec4 } from "gl-matrix";
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
        this.device.queue.writeBuffer(buf, 0, data);
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
        this.buffers = new Buffers(device, 'Plane');

        this.view_projection_buffer = this.create_view_buffer();

        const shader = device.createShaderModule({
            code: `
@group(0) @binding(0) var<uniform> view_matrix: mat4x4<f32>;

const GRID_SIZE = 1.0;
const V = array<vec4<f32>, 4>(
    vec4(-1.0, 0.0,  1.0, 1.0),
    vec4( 1.0, 0.0,  1.0, 1.0),
    vec4(-1.0, 0.0, -1.0, 1.0),
    vec4( 1.0, 0.0, -1.0, 1.0),
);
const INDICES = array<u32, 6>(
    0, 1, 2,
    2, 1, 3,
);

struct VertexOut {
    @builtin(position) pos: vec4<f32>,
    @location(0) coords: vec2<f32>,
}

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VertexOut {
    var out: VertexOut;
    let world_pos = V[INDICES[vi]] * GRID_SIZE;
    out.pos = view_matrix * world_pos;
    out.coords = world_pos.xz;
    return out;
};

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
    return vec4((in.coords / GRID_SIZE) + 0.5, 0.0, 1.0);
};
        `});

        this.pipeline = device.createRenderPipeline({
            label: 'Plane',
            layout: 'auto',
            primitive: {
                topology: 'triangle-list',
                cullMode: 'none',
            },
            vertex: {
                module: shader,
                entryPoint: 'vs_main'
            },
            fragment: {
                module: shader,
                entryPoint: 'fs_main',
                targets: [{
                    format: "rgba8unorm",
                }],
            },
        });

        this.bind_group = device.createBindGroup({
            label: "PlaneBindGroup",
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.view_projection_buffer } },
            ]
        });

        this.render_callback = () => {
            if (!this.is_rendering) return;
            const enc = device.createCommandEncoder();
            const pass = enc.beginRenderPass({
                colorAttachments: [
                    {
                        clearValue: [0.3, 0.3, 0.3, 1.0],
                        loadOp: "clear",
                        storeOp: "store",
                        view: this.context.getCurrentTexture().createView(),
                    },
                ],
            });
            pass.setPipeline(this.pipeline);
            pass.setBindGroup(0, this.bind_group);
            pass.draw(6);
            pass.end();
            device.queue.submit([enc.finish()]);
            requestAnimationFrame(this.render_callback);
        }
    }

    create_view_buffer() {
        this.settings = {
            fov: 60 * Math.PI / 180,
            near_plane: 0.1,
            far_plane: 1000.0,
        };
        this.eye = [0, 1, -3];
        this.look_at = [0, 0, 0];
        this.view_matrix = mat4.create();
        const proj_matrix = mat4.create();
        mat4.perspective(
            proj_matrix,
            this.settings.fov,
            canvas.width / canvas.height,
            this.settings.near_plane,
            this.settings.far_plane
        );
        // vec3.add(this.look_at, this.eye, [0, 0, 10]);
        mat4.lookAt(this.view_matrix, this.eye, this.look_at, [0, 1, 0]);
        mat4.multiply(this.view_matrix, proj_matrix, this.view_matrix);
        return this.buffers.create_buffer(this.view_matrix, GPUBufferUsage.UNIFORM, "View");
    }

    render() {
        this.is_rendering = true;
        this.render_callback();
    }
    terminate() {
        this.is_rendering = false;
    }
}
