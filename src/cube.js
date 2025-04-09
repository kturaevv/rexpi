import { mat4, vec3 } from "gl-matrix";
import Renderer from "./renderer.js";
import GUI from "./gui/gui.js";
import wasd_keys from "./gui/wasd.js";
import Buffers from "./buffers.js";

const shader = `
struct VertexOut {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
}

@group(0) @binding(0) var<uniform> view_projection_matrix: mat4x4<f32>; 
@group(0) @binding(1) var<storage, read> vertex_buffer: array<vec4f>;

@group(1) @binding(0) var<storage, read> index_buffer: array<u32>;

@vertex 
fn vs_main(@builtin(vertex_index) vi: u32) -> VertexOut {
    var vertex = vertex_buffer[index_buffer[vi]];
    var out: VertexOut;
    out.position = view_projection_matrix * vertex;
    out.color = vec4(
        (vertex.xyz + 1.0) * 0.5, // Normalize position to 0-1 range
        1.0
    );
    return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
    return in.color;
}
`

const debug_shader = `
@group(0) @binding(0) var<uniform> view_projection_matrix: mat4x4<f32>; 
@group(0) @binding(1) var<storage, read> vertex_buffer: array<vec4f>;

@group(1) @binding(0) var<storage, read> d_index_buffer: array<u32>;

@vertex 
fn vs_main(
    @builtin(vertex_index) vi: u32,
    @builtin(instance_index) ii: u32,
) -> @builtin(position) vec4f {
    var vertex = vertex_buffer[d_index_buffer[vi]];
    let out = view_projection_matrix * vertex;
    return out;
}

@fragment
fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    return vec4(0f, 1f, 1f, 1f);
}
`
function make_cube() {
    const verts = new Float32Array([
        // Front face
        -1.0, -1.0, 1.0, 1.0,
        1.0, -1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0,
        -1.0, 1.0, 1.0, 1.0,
        // Back face
        -1.0, -1.0, -1.0, 1.0,
        -1.0, 1.0, -1.0, 1.0,
        1.0, 1.0, -1.0, 1.0,
        1.0, -1.0, -1.0, 1.0,
    ]);
    const idx = new Uint32Array([
        0, 1, 2, 0, 2, 3,
        1, 7, 6, 1, 6, 2,
        7, 4, 5, 7, 5, 6,
        4, 0, 3, 4, 3, 5,
        3, 2, 6, 3, 6, 5,
        4, 7, 1, 4, 1, 0,
    ]);
    return [verts, idx];
}

function make_debug_indices(triangle_indices) {
    const edgeset = new Set();

    for (let i = 0; i < triangle_indices.length; i += 3) {
        const edges = [
            [triangle_indices[i], triangle_indices[i + 1]],
            [triangle_indices[i + 1], triangle_indices[i + 2]],
            [triangle_indices[i + 2], triangle_indices[i]]
        ];

        edges.forEach(([a, b]) => {
            const edge = a < b ? `${a}-${b}` : `${b}-${a}`;
            edgeset.add(edge);
        });
    }

    const line_indices = [];
    edgeset.forEach(edge => {
        const [a, b] = edge.split('-').map(Number);
        line_indices.push(a, b);
    });

    return new Uint32Array(line_indices);
}

export default class CubeRenderer extends Renderer {
    /**
     * @param {GPUDevice} device 
     * @param {GPUCanvasContext} context
     * */
    constructor(device, context) {
        super();

        this.gui = new GUI();
        this.gui.add('camera', wasd_keys());
        this.gui.add('debug', false, "Debug");
        this.gui.add('rotate', true, "Rotate");

        this.settings = {
            fov: 60 * Math.PI / 180,
            near_plane: 1.0,
            far_plane: 1000.0,
        };
        this.eye = [0, 0, -10];
        this.look_at = [0, 0, 0];

        this.device = device;
        this.context = context;

        const [vertices, indices] = make_cube();
        const debug_indices = make_debug_indices(indices);
        {
            this.buffers = new Buffers(device, "CubeBuffer");
            this.view_uniform = this.buffers.create_buffer(mat4.create(), GPUBufferUsage.UNIFORM, 'view matrix');
            this.vertex_buffer = this.buffers.create_buffer(vertices, GPUBufferUsage.STORAGE, 'vertices');
            this.idx_buf = this.buffers.create_buffer(indices, GPUBufferUsage.STORAGE, 'indices');
            this.d_idx_buf = this.buffers.create_buffer(debug_indices, GPUBufferUsage.STORAGE, 'd_indices');
        }

        {
            const group_0 = device.createBindGroupLayout({
                label: "CommonGroup",
                entries: [
                    { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
                    { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
                ]
            });
            const group_1 = device.createBindGroupLayout({
                label: "IndexGroup",
                entries: [
                    { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
                ]
            });
            const group_2 = device.createBindGroupLayout({
                label: "DebugIndexGroup",
                entries: [
                    { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
                ]
            });

            const render_layout = device.createPipelineLayout({
                label: "RenderLayout",
                bindGroupLayouts: [group_0, group_1],
            });
            const debug_layout = device.createPipelineLayout({
                label: "DebugLayout",
                bindGroupLayouts: [group_0, group_2],
            });

            this.pipeline = this.create_pipeline(shader, render_layout);
            this.d_pipeline = this.create_pipeline(debug_shader, debug_layout, 'line-list');

            this.bind_group_0 = device.createBindGroup({
                label: "CommonGroup",
                layout: group_0,
                entries: [
                    { binding: 0, resource: { buffer: this.view_uniform } },
                    { binding: 1, resource: { buffer: this.vertex_buffer } },
                ]
            });
            this.bind_group_1 = device.createBindGroup({
                label: "IndexGroup",
                layout: group_1,
                entries: [
                    { binding: 0, resource: { buffer: this.idx_buf } },
                ]
            });
            this.bind_group_2 = device.createBindGroup({
                label: "DebugIndexGroup",
                layout: group_2,
                entries: [
                    { binding: 0, resource: { buffer: this.d_idx_buf } },
                ]
            });
        }

        this.update_view_matrix();
        this.update_render_pass_descriptor();

        let rotation = 0;
        this.render_callback = () => {
            if (!this.is_rendering) return;

            if (this.gui.rotate.value) {
                rotation += 0.003;
                this.rotate_cube(rotation);
            }

            this.render_pass_descriptor.colorAttachments[0].view =
                context.getCurrentTexture().createView();

            const command_encoder = device.createCommandEncoder({ label: "Cube command encoder" });
            const pass = command_encoder.beginRenderPass(this.render_pass_descriptor);
            pass.setBindGroup(0, this.bind_group_0);
            pass.setBindGroup(1, this.bind_group_1);
            pass.setPipeline(this.pipeline);
            pass.draw(indices.length);
            pass.end();

            if (this.gui.debug.value === true) {
                const d_pass = command_encoder.beginRenderPass(this.render_pass_descriptor);
                d_pass.setBindGroup(0, this.bind_group_0);
                d_pass.setBindGroup(1, this.bind_group_2);
                d_pass.setPipeline(this.d_pipeline);
                d_pass.draw(indices.length);
                d_pass.end();
            }

            device.queue.submit([command_encoder.finish()]);
            requestAnimationFrame(this.render_callback);
        };

        const move_camera_eye = (key_label) => {
            const key = key_label.toLowerCase();
            const move_by = 0.5;
            if (key === 'w') { this.eye[2] += move_by; }
            else if (key === "s") { this.eye[2] -= move_by; }
            else if (key === "d") { this.eye[0] += move_by; }
            else if (key === "a") { this.eye[0] -= move_by; }
            this.update_view_matrix();
        };

        const update_view = () => {
            this.update_view_matrix();
            this.update_render_pass_descriptor();
        };

        this.gui.camera.w.listen(() => move_camera_eye(this.gui.camera.w.key));
        this.gui.camera.a.listen(() => move_camera_eye(this.gui.camera.a.key));
        this.gui.camera.s.listen(() => move_camera_eye(this.gui.camera.s.key));
        this.gui.camera.d.listen(() => move_camera_eye(this.gui.camera.d.key));
        document.addEventListener('canvas_resize', update_view);
    }

    create_pipeline(shader, layout = 'auto', topology = 'triangle-list') {
        const shader_module = this.device.createShaderModule({
            label: "CubeShader",
            code: shader
        });
        return this.device.createRenderPipeline({
            label: "CubeRenderPipeline",
            layout: layout,
            primitive: {
                topology: topology,
                cullMode: 'back',
            },
            vertex: {
                module: shader_module,
                entryPoint: 'vs_main',
            },
            fragment: {
                module: shader_module,
                entryPoint: 'fs_main',
                targets: [{ format: "rgba8unorm" }],
            },
            depthStencil: {
                format: 'depth24plus',
                depthWriteEnabled: true,
                depthCompare: 'less',
            }
        });
    }

    rotate_cube(rotation) {
        const model_matrix = mat4.create();
        mat4.rotateY(model_matrix, model_matrix, rotation);
        mat4.rotateX(model_matrix, model_matrix, rotation);

        const view_matrix_after = mat4.create();
        mat4.multiply(view_matrix_after, this.view_matrix, model_matrix);
        this.device.queue.writeBuffer(this.view_uniform, 0, view_matrix_after);
    }
    update_view_matrix() {
        this.view_matrix = mat4.create();
        const proj_matrix = mat4.create();
        mat4.perspective(
            proj_matrix,
            this.settings.fov,
            canvas.width / canvas.height,
            this.settings.near_plane,
            this.settings.far_plane
        );
        vec3.add(this.look_at, this.eye, [0, 0, 10]);
        mat4.lookAt(this.view_matrix, this.eye, this.look_at, [0, 1, 0]);
        mat4.multiply(this.view_matrix, proj_matrix, this.view_matrix);
        this.device.queue.writeBuffer(this.view_uniform, 0, this.view_matrix);
    }

    update_render_pass_descriptor() {
        this.depth_texture = this.device.createTexture({
            size: {
                width: canvas.width,
                height: canvas.height,
                depthOrArrayLayers: 1
            },
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        this.render_pass_descriptor = {
            label: "Cube pass encoder",
            colorAttachments: [
                {
                    clearValue: [1, 1, 1, 1.0],
                    loadOp: "load",
                    storeOp: "store",
                    view: this.context.getCurrentTexture().createView(),
                },
            ],
            depthStencilAttachment: {
                view: this.depth_texture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            }
        };
    }
}
