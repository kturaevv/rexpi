import { mat3, mat4, vec3, vec4 } from "gl-matrix";
import Renderer from "./renderer.js";


const shader_code = `
@group(0) @binding(0) var<uniform> view_matrix: mat4x4<f32>;
@group(0) @binding(2) var<uniform> camera_position: vec3<f32>;

const GRID_SIZE = 2.0;

const CELL_SIZE = 1.0;
const CELL_LINE_THICKNESS = 0.005;
const CELL_COLOUR = vec4( 0.75, 0.75, 0.75, 0.5 );

const SUBCELL_SIZE = 0.1;
const SUBCELL_LINE_THICKNESS = 0.001;
const SUBCELL_COLOUR = vec4( 0.5, 0.5, 0.5, 0.5 );

const V = array<vec4<f32>, 4>(
    vec4(-1000.0, 0.0,  1000.0, 1.0),
    vec4( 1000.0, 0.0,  1000.0, 1.0),
    vec4(-1000.0, 0.0, -1000.0, 1.0),
    vec4( 1000.0, 0.0, -1000.0, 1.0),
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
    out.coords = world_pos.xz; // normalize coords [0, 1]
    return out;
};

fn modv(in: vec2<f32>, m: f32) -> vec2<f32> {
    return in - m * floor(in / m);
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
    let cell_coords     = modv(in.coords + CELL_SIZE * 0.5, CELL_SIZE);
    let subcell_coords  = modv(cell_coords + SUBCELL_SIZE * 0.5, SUBCELL_SIZE);

    let distance_to_cell    = abs(cell_coords - CELL_SIZE * 0.5);
    let distance_to_subcell = abs(subcell_coords - SUBCELL_SIZE * 0.5);

    let dx = fwidth(in.coords.x);
    let dy = fwidth(in.coords.y);

    let big_line_x = CELL_LINE_THICKNESS * 0.5 + dx;
    let big_line_y = CELL_LINE_THICKNESS * 0.5 + dy;
    let smol_line_x = SUBCELL_LINE_THICKNESS * 0.5 + dx;
    let smol_line_y = SUBCELL_LINE_THICKNESS * 0.5 + dy;

    var color = vec4<f32>();
    if (any(distance_to_subcell < vec2(smol_line_x, smol_line_y))) { color = SUBCELL_COLOUR;}
    if (any(distance_to_cell    < vec2(big_line_x, big_line_y))) { color = CELL_COLOUR;}

    let plane_distance = length(vec3(in.coords.x, 0.0, in.coords.y) - camera_position.xyz);
    let opacity = smoothstep(1.0, 0.0, plane_distance / 25.0);
    return color * opacity;
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
    constructor(device, context, gui) {
        super();
        this.gui = gui;
        this.device = device;
        this.context = context;
        this.buffers = new Buffers(device, 'Plane');
        this.settings = {
            fov: 60 * Math.PI / 180,
            near_plane: 0.0001,
            far_plane: 1000.0,
        };
        this.eye = new Float32Array([0, 0.0, -1.2]);
        this.look_at = [0, 0, 0];

        this.view_projection_buffer = this.create_view_buffer();
        this.camera_position_buffer = this.buffers.create_buffer(this.eye, GPUBufferUsage.UNIFORM);

        const shader = device.createShaderModule({ code: shader_code });

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
                    blend: {
                        color: {
                            srcFactor: 'src-alpha',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add',
                        },
                        alpha: {
                            srcFactor: 'one',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add',
                        },
                    }
                }],
            },
        });

        this.bind_group = device.createBindGroup({
            label: "PlaneBindGroup",
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.view_projection_buffer } },
                { binding: 2, resource: { buffer: this.camera_position_buffer } },
            ]
        });

        let rotation = -0.01;
        this.render_callback = () => {
            if (!this.is_rendering) return;
            const enc = device.createCommandEncoder();
            mat4.rotateY(this.view_matrix, this.view_matrix, rotation * Math.PI / 180);
            device.queue.writeBuffer(this.view_projection_buffer, 0, this.view_matrix);

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
        this.view_matrix = mat4.create();
        const proj_matrix = mat4.create();
        mat4.perspective(
            proj_matrix,
            this.settings.fov,
            canvas.width / canvas.height,
            this.settings.near_plane,
            this.settings.far_plane
        );
        mat4.lookAt(this.view_matrix, this.eye, this.look_at, [0, 1, 0]);
        mat4.multiply(this.view_matrix, proj_matrix, this.view_matrix);
        mat4.rotateX(this.view_matrix, this.view_matrix, -15 * Math.PI / 180);
        mat4.rotateY(this.view_matrix, this.view_matrix, -45 * Math.PI / 180);
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
