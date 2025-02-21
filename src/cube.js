import { mat3, mat4, vec3 } from "gl-matrix"; import Renderer from "./renderer.js";
const shader = `
struct Canvas {
    width: f32,
    height: f32,
}

struct VertexOut {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
}

@group(0) @binding(0) var<uniform> view_projection_matrix: mat4x4<f32>; 
@group(0) @binding(1) var<storage, read> vertex_buffer: array<f32>;
@group(0) @binding(2) var<storage, read> index_buffer: array<u32>;

@vertex 
fn vs_main(
    @builtin(vertex_index) vi: u32,
    @builtin(instance_index) ii: u32,
) -> VertexOut {
    let index = index_buffer[ii * 3 + vi];

    var vertex = vec4(0.0, 0.0, 0.0, 1.0);
    for (var i: u32 = 0; i < 3; i++) {
        vertex[i] = vertex_buffer[index * 3 + i];
    }

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
const VERTICES = new Float32Array([
    // Front face
    -1.0, -1.0, 1.0,
    1.0, -1.0, 1.0,
    1.0, 1.0, 1.0,
    -1.0, 1.0, 1.0,
    // Back face
    -1.0, -1.0, -1.0,
    -1.0, 1.0, -1.0,
    1.0, 1.0, -1.0,
    1.0, -1.0, -1.0,
]);

const INDICES = new Uint32Array([
    // Front
    0, 1, 2,
    0, 2, 3,
    // Right
    1, 7, 6,
    1, 6, 2,
    // Back
    7, 4, 5,
    7, 5, 6,
    // Left
    4, 0, 3,
    4, 3, 5,
    // Top
    3, 2, 6,
    3, 6, 5,
    // Bottom
    4, 7, 1,
    4, 1, 0,
]);

class GPUResources {
    constructor(label, device) {
        this.label = label;
        this.device = device;
    }

    /**
     * @param {GPUDevice} device
     * */
    create_buffer(label = '', data, usage) {
        const buf = this.device.createBuffer({
            label: this.label + ': ' + label,
            size: data.byteLength,
            usage: usage | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(buf, 0, data);
        return buf;
    }
}

export default class CubeRenderer extends Renderer {
    /**
     * @param {GPUDevice} device 
     * */
    constructor(device, context, gui) {
        super();

        this.gui = gui;

        this.settings = {
            fov: 60 * Math.PI / 180,
            near_plane: 1.0,
            far_plane: 1000.0,
        };
        this.eye = [0, 0, -10];
        this.look_at = [0, 0, 0];

        this.device = device;
        this.context = context;

        this.resources = new GPUResources("Cube buffer", device);
        this.vertex_buffer = this.resources.create_buffer('vertices', VERTICES, GPUBufferUsage.STORAGE);
        this.index_buffer = this.resources.create_buffer('indices', INDICES, GPUBufferUsage.STORAGE);
        this.view_matrix_uniform = this.resources.create_buffer('view matrix', mat4.create(), GPUBufferUsage.UNIFORM);

        this.pipeline = this.create_pipeline();
        this.bind_group = this.create_bind_group();

        const update_view = () => {
            this.update_view_matrix();
            this.update_render_pass_descriptor();
        };
        update_view();

        const move_camera_eye = (key_label) => {
            const key = key_label.toLowerCase();
            const move_by = 0.5;
            if (key === 'w') { this.eye[2] += move_by; }
            else if (key === "s") { this.eye[2] -= move_by; }
            else if (key === "d") { this.eye[0] += move_by; }
            else if (key === "a") { this.eye[0] -= move_by; }
            this.update_view_matrix();
        };

        let rotation = 0;
        this.render_callback = () => {
            if (!this.is_rendering) return;

            rotation += 0.003;
            const model_matrix = mat4.create();
            mat4.rotateY(model_matrix, model_matrix, rotation);
            mat4.rotateX(model_matrix, model_matrix, rotation);

            const view_matrix_after = mat4.create();
            mat4.multiply(view_matrix_after, this.view_matrix, model_matrix);
            device.queue.writeBuffer(this.view_matrix_uniform, 0, view_matrix_after);

            this.render_pass_descriptor.colorAttachments[0].view =
                context.getCurrentTexture().createView();

            const command_encoder = device.createCommandEncoder({ label: "Cube command encoder" });
            const render_pass = command_encoder.beginRenderPass(this.render_pass_descriptor);
            render_pass.setBindGroup(0, this.bind_group);
            render_pass.setPipeline(this.pipeline);
            render_pass.draw(3, INDICES.length / 3);
            render_pass.end();

            device.queue.submit([command_encoder.finish()]);
            requestAnimationFrame(this.render_callback);
        };

        document.addEventListener(this.gui.camera.w.event, () => move_camera_eye(this.gui.camera.w.key));
        document.addEventListener(this.gui.camera.a.event, () => move_camera_eye(this.gui.camera.a.key));
        document.addEventListener(this.gui.camera.s.event, () => move_camera_eye(this.gui.camera.s.key));
        document.addEventListener(this.gui.camera.d.event, () => move_camera_eye(this.gui.camera.d.key));
        document.addEventListener('canvas_resize', update_view);
    }

    create_pipeline() {
        const shader_module = this.device.createShaderModule({
            label: "Cube shader",
            code: shader
        });

        return this.device.createRenderPipeline({
            label: "Cube render pipeline",
            layout: 'auto',
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

    create_bind_group() {
        return this.device.createBindGroup({
            label: "Cube bind group",
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.view_matrix_uniform } },
                { binding: 1, resource: { buffer: this.vertex_buffer } },
                { binding: 2, resource: { buffer: this.index_buffer } },
            ]
        });
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
        this.device.queue.writeBuffer(this.view_matrix_uniform, 0, this.view_matrix);
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
            label: "Circles pass encoder",
            colorAttachments: [
                {
                    clearValue: [1, 1, 1, 1.0],
                    loadOp: "clear",
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

    render() {
        this.is_rendering = true;
        requestAnimationFrame(this.render_callback);
    }

    terminate() {
        this.is_rendering = false;
    }
}
