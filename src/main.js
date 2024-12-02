/// <reference types="@webgpu/types" />
import { assert, random } from "./utils.js";
import BallData from "./ball.js";

async function init() {
    const adapter = await navigator.gpu.requestAdapter();
    assert(adapter, "Adapter not found");

    const device = await adapter.requestDevice();
    assert(device, "Device not found!");

    const canvas = document.getElementById("canvas");
    assert(canvas, "Canvas not found!");

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    console.log(canvas.width, canvas.height);

    /** @type {GPUCanvasContext} **/
    const context = canvas.getContext("webgpu");
    assert(context, "Context not found!");
    assert(context instanceof GPUCanvasContext, "Context has wrong type");

    context.configure({
        device: device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        size: {
            width: canvas.clientWidth,
            height: canvas.clientHeight,
        },
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
    const NUM_BALLS = 100;
    const ball_data = new BallData(NUM_BALLS);
    for (let i = 0; i < NUM_BALLS; i++) {
        ball_data.add(
            random(),
            random(),
            random(),
            random(),
            random(),
            random(),
            0.1
        );
    }

    const vertex_buffer = device.createBuffer({
        size: ball_data.data.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(
        vertex_buffer,
        0,
        ball_data.data,
    );
    console.log(ball_data);

    // Other buffers
    const viewport_buffer = device.createBuffer({
        label: "Viewport uniform",
        size: 2 * 4, // 2 floats
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        mappedAtCreation: false,
    });
    device.queue.writeBuffer(viewport_buffer, 0, new Float32Array([canvas.width, canvas.height]));

    const bind_group_layout = device.createBindGroupLayout({
        label: "Bind group layout",
        entries: [
            { // Bind group layout entry
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: "uniform" }, // is it required?
            },
        ]
    });

    const bind_group = device.createBindGroup({
        label: "Bind group",
        layout: bind_group_layout,
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: viewport_buffer,
                }
            },
        ]
    });

    const pipeline_layout = device.createPipelineLayout({
        bindGroupLayouts: [bind_group_layout],
    });

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
        primitive: { topology: "triangle-list" },
        layout: pipeline_layout,
        cullMode: "none"
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

    {
        const pass_encoder = command_encoder.beginRenderPass(
            render_pass_descriptor,
        );
        pass_encoder.setPipeline(pipeline);
        pass_encoder.setVertexBuffer(0, vertex_buffer);
        pass_encoder.setBindGroup(0, bind_group);
        pass_encoder.draw(3, NUM_BALLS);
        pass_encoder.end();
    }
    device.queue.submit([command_encoder.finish()]);
}

main();
