/// <reference types="@webgpu/types" />
/// <reference path="../node_modules/@webgpu/types/dist/index.d.ts" />
import assert from "./assert.js";
import BallData from "./ball.js";

async function init() {
    const adapter = await navigator.gpu.requestAdapter();
    assert(adapter, "Adapter not found");

    const device = await adapter.requestDevice();
    assert(device, "Device not found!");

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

    return [device, context];
}

async function load_shader_module(device) {
    const shader_file = await fetch("shader.wgsl")
        .then((res) => res.text())
        .then((text) => text)
        .catch((e) =>
            console.log("Catched error while loading shader module!", e)
        );
    assert(typeof shader_file === "string", "Shader module is not a string!");

    return device.createShaderModule({
        code: shader_file,
    });
}

async function main() {
    const [device, context] = await init();
    const shader_module = await load_shader_module(device);

    // Prepare data
    const ball_data = new BallData(10);
    for (let i = 0; i < 10; i++) {
        ball_data.add(
            Math.random(),
            Math.random(),
            Math.random(),
            Math.random(),
            Math.random(),
            Math.random(),
            Math.random(),
        );
    }

    const vertex_buffer = device.createBuffer({
        size: ball_data.data.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    console.log(ball_data.get_gpu_vertex_state());

    const pipeline_descriptor = {
        vertex: {
            module: shader_module,
            entrypoint: "vs_main",
            buffers: ball_data.get_gpu_vertex_state(),
        },
        fragment: {
            module: shader_module,
            entrypoint: "fs_main",
            targets: [{
                format: navigator.gpu.getPreferredCanvasFormat(),
            }],
        },
        primitive: { topology: "point-list" },
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

    device.queue.writeBuffer(
        vertex_buffer,
        0,
        ball_data.data,
        0,
        ball_data.data.length,
    );
    {
        const pass_encoder = command_encoder.beginRenderPass(
            render_pass_descriptor,
        );
        pass_encoder.setPipeline(pipeline);
        pass_encoder.setVertexBuffer(0, vertex_buffer);
        pass_encoder.draw(10);
        pass_encoder.end();
    }
    device.queue.submit([command_encoder.finish()]);
}

main();
