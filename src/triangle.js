export default function () { throw new Error("Unimplemented!!!"); }

/**
 * @param {GPUDevice} device 
 * @param {GPUCanvasContext} context
 * */
export async function render(device, context) {

    const shader = `
    struct VertexOut {
        @builtin(position) pos: vec4<f32>,
        @location(0) color: vec4<f32>
    }

    const COLOR = array<vec4<f32>, 3>(
        vec4(1, 0, 0, 1),
        vec4(0, 1, 0, 1),
        vec4(0, 0, 1, 1),
    );  

    @vertex
    fn vs_main(
        @builtin(vertex_index) idx: u32,
        @location(0) pos: vec2<f32>
    ) -> VertexOut {
        var out: VertexOut;
        out.pos = vec4(pos.xy, 0, 1); 
        out.color = COLOR[idx];
        return out;
    }

    @fragment
    fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
        return in.color;
    }
    `
    const shader_module = device.createShaderModule({ code: shader, });

    const triangle_vertices = new Float32Array([
        0.0, 0.8,
        -0.8, -0.8,
        0.8, -0.8,
    ]);
    const vertex_buffer = device.createBuffer({
        size: triangle_vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertex_buffer, 0, triangle_vertices);

    const render_pipeline = device.createRenderPipeline({
        vertex: {
            module: shader_module,
            entryPoint: "vs_main",
            buffers: [{
                arrayStride: 8,
                attributes:
                    [{
                        format: "float32x2",
                        offset: 0,
                        shaderLocation: 0,
                    }]
            }]
        },
        fragment: {
            module: shader_module,
            entryPoint: 'fs_main',
            targets: [{ format: "rgba8unorm" }],
        },
        layout: "auto",
        primitive: {
            topology: "triangle-list"
        }
    });

    const command_encoder = device.createCommandEncoder({});
    {
        var pass = command_encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: context.getCurrentTexture().createView(),
                    clearValue: [0, 0, 0, 1],
                    loadOp: "clear",
                    storeOp: "store",
                }
            ]
        });
        pass.setVertexBuffer(0, vertex_buffer);
        pass.setPipeline(render_pipeline);
        pass.draw(3);
        pass.end();
    }
    device.queue.submit([command_encoder.finish()]);
}
