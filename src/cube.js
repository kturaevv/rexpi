import { mat4 } from "gl-matrix";
import Renderer from "./renderer.js";

export default class CubeRenderer extends Renderer {

    /**
     * @param {GPUDevice} device 
     * */
    constructor(device, context) {
        super();

        const settings = {
            fov: 60 * Math.PI / 180,
            aspect_ratio: canvas.width / canvas.height,
            near_plane: 1.0,
            far_plane: 1000.0,
        }

        const proj_matrix = mat4.create(); // Create an empty matrix first
        mat4.perspective(
            proj_matrix,
            settings.fov,
            settings.aspect_ratio,
            settings.near_plane,
            settings.far_plane
        );
        const view_matrix = mat4.create();
        mat4.lookAt(view_matrix, [0, 0, -10], [0, 0, 0], [0, 1, 0]);
        mat4.multiply(view_matrix, proj_matrix, view_matrix);

        const vertices = new Float32Array([
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

        const indices = new Uint32Array([
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

        const shader_module = device.createShaderModule({
            label: "Cube shader",
            code: `
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

    var vertex = vec4(0.0,0.0,0.0,1.0);
    for (var i: u32 = 0; i < 3; i++ ) {
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

@fragment fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
    return in.color;
}
`
        });

        const depthTexture = device.createTexture({
            size: {
                width: canvas.width,
                height: canvas.height,
                depthOrArrayLayers: 1
            },
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });

        const pipeline = device.createRenderPipeline({
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

        const view_matrix_uniform = device.createBuffer({
            label: "View matrix uniform",
            size: view_matrix.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        const vertex_buffer = device.createBuffer({
            label: "Vertex buffer",
            size: vertices.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        const index_buffer = device.createBuffer({
            label: "Index buffer",
            size: indices.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        const bind_group = device.createBindGroup({
            label: "Cube bind group",
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: view_matrix_uniform } },
                { binding: 1, resource: { buffer: vertex_buffer } },
                { binding: 2, resource: { buffer: index_buffer } },
            ]
        });

        device.queue.writeBuffer(view_matrix_uniform, 0, view_matrix);
        device.queue.writeBuffer(vertex_buffer, 0, vertices);
        device.queue.writeBuffer(index_buffer, 0, indices);

        const render_pass_descriptor = {
            label: "Circles pass encoder",
            colorAttachments: [
                {
                    clearValue: [1, 1, 1, 1.0],
                    loadOp: "clear",
                    storeOp: "store",
                    view: context.getCurrentTexture().createView(),
                },
            ],
            depthStencilAttachment: {
                view: depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            }
        };

        let rotation = 0;
        this.render_callback = () => {
            if (!this.is_rendering) return;
            rotation += 0.005;
            const model_matrix = mat4.create();
            mat4.rotateY(model_matrix, model_matrix, rotation);
            mat4.rotateX(model_matrix, model_matrix, rotation);

            const view_matrix_after = mat4.create();
            mat4.multiply(view_matrix_after, view_matrix, model_matrix);
            device.queue.writeBuffer(view_matrix_uniform, 0, view_matrix_after);

            render_pass_descriptor.colorAttachments[0].view =
                context.getCurrentTexture().createView();

            const command_encoder = device.createCommandEncoder({ label: "Cube command encoder" });
            const render_pass = command_encoder.beginRenderPass(render_pass_descriptor);
            render_pass.setBindGroup(0, bind_group);
            render_pass.setPipeline(pipeline);
            render_pass.draw(3, indices.length / 3);
            render_pass.end();

            device.queue.submit([command_encoder.finish()]);
            requestAnimationFrame(this.render_callback);
        };

        if (!this.is_rendering) return;
        requestAnimationFrame(this.render_callback);
    }

    render() {
        this.is_rendering = true;
        requestAnimationFrame(this.render_callback);
    }

    terminate() {
        this.is_rendering = false;
    }
}
