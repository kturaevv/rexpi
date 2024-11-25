/// <reference types="@webgpu/types" />
/// <reference path="../node_modules/@webgpu/types/dist/index.d.ts" />

function assert(condition, message) {
    if (!condition) throw ("Assertion failed:" + (message || ""));
}

async function main() {
    const adapter = await navigator.gpu.requestAdapter();
    assert(adapter, "Adapter not found");

    const device = await adapter.requestDevice();
    assert(device, "Device not found!");

    const shader_file = await fetch("shader.wgsl")
        .then((res) => res.text())
        .then((text) => text)
        .catch((e) =>
            console.log("Catched error while loading shader module!", e)
        );
    assert(typeof shader_file === "string", "Shader module is not a string!");

    const shader_module = device.createShaderModule({
        code: shader_file,
    });

    const canvas = document.getElementById("canvas");
    assert(canvas, "Canvas not found!");

    /** @type {GPUCanvasContext} **/
    const context = canvas.getContext("webgpu");
    assert(context, "Context not found!");
    assert(context instanceof GPUCanvasContext, "Context has wrong type");

    context.configure({
        device: device,
        format: navigator.gpu.getPreferredCanvasFormat(),
    });

    // Prepare data
    const buf = new ArrayBuffer((4 + 4) * 4 * 3); // (color + ) * 4 bytes * 3 vertices
    const gpu_data = new Float32Array(buf);
    {
        gpu_data.set([0.0, 0.6, 0, 1], 0); // Vertex
        gpu_data.set([1, 0, 0, 1], 4); // Color
    }
    {
        gpu_data.set([-0.5, -0.6, 0, 1], 8);
        gpu_data.set([0, 1, 0, 1], 12);
    }
    {
        gpu_data.set([0.5, -0.6, 0, 1], 16);
        gpu_data.set([0, 0, 1, 1], 20);
    }

    const vertex_buffer = device.createBuffer({
        size: gpu_data.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const gpu_vertex_state = [
        {
            arrayStride: 32,
            stepMode: "vertex",
            attributes: [
                {
                    format: "float32x4", // color
                    offset: 0,
                    shaderLocation: 0,
                },
                {
                    format: "float32x4", // position
                    offset: 4 * 4,
                    shaderLocation: 1,
                },
            ],
        },
    ];

    const pipeline_descriptor = {
        vertex: {
            module: shader_module,
            entrypoint: "vs_main",
            buffers: gpu_vertex_state,
        },
        fragment: {
            targets: [{
                format: navigator.gpu.getPreferredCanvasFormat(),
            }],
            module: shader_module,
            entrypoint: "fs_main",
        },
        primitive: { topology: "triangle-list" },
        layout: "auto",
    };

    const pipeline = device.createRenderPipeline(pipeline_descriptor);

    const command_encoder = device.createCommandEncoder();

    const clearColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };

    const render_pass_descriptor = {
        colorAttachments: [
            {
                clearValue: clearColor,
                loadOp: "clear",
                storeOp: "store",
                view: context.getCurrentTexture().createView(),
            },
        ],
    };

    device.queue.writeBuffer(vertex_buffer, 0, gpu_data, 0, gpu_data.length);
    {
        const pass_encoder = command_encoder.beginRenderPass(
            render_pass_descriptor,
        );
        pass_encoder.setPipeline(pipeline);
        pass_encoder.setVertexBuffer(0, vertex_buffer);
        pass_encoder.draw(3);
        pass_encoder.end();
    }
    device.queue.submit([command_encoder.finish()]);
}

main();
