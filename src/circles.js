import { assert, is_bool, random } from "./utils.js";
import BallData from "./ball.js";

export default function () { throw new Error("Unimplemented!!!"); }


async function load_shader_file(name) {
    const shader_file = await fetch(name)
        .then((res) => res.text())
        .then((text) => text)
        .catch((e) =>
            console.log("Catched error while loading shader module!", e)
        );
    assert(typeof shader_file === "string", "Shader module is not a string!");
    return shader_file;
}

async function load_ball_shader_module(device, debug) {
    const vs_file = await load_shader_file("circles_vs.wgsl")
    let fs_file = '';

    if (debug === true) {
        fs_file = await load_shader_file("circles_fs_debug.wgsl")
    } else {
        fs_file = await load_shader_file("circles_fs.wgsl")
    }

    return device.createShaderModule({
        code: vs_file + fs_file,
    });
}

/** 
 * @param {GPUDevice} device
 * @param {GPUCanvasContext} context
 * */
export async function init_balls(device, context, clear_color, num_balls, size, debug) {
    assert(clear_color.length === 4, "Color should be length 4");
    assert(Number.isInteger(num_balls), "Num balls should be an integer");
    assert(is_bool(debug), "Debug value should be a boolean", debug);
    assert(!Number.isNaN(size), "Size is not an Integer!", size);

    const shader_module = await load_ball_shader_module(device, debug);

    // Prepare data
    const ball_data = new BallData(num_balls);
    for (let i = 0; i < num_balls; i++) {
        ball_data.add(
            random(),
            random(),
            Math.random(),
            random(),
            random(),
            random(),
            size
        );
    }

    const storage_buffer = device.createBuffer({
        size: ball_data.data.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(
        storage_buffer,
        0,
        ball_data.data,
    );

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
                buffer: { type: "uniform" },
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

    // Render pipeline
    const render_pipeline_layout = device.createPipelineLayout({
        bindGroupLayouts: [bind_group_layout],
    });
    const render_pipeline_descriptor = {
        label: "Circles render pipeline",
        vertex: {
            module: shader_module,
            entrypoint: "vs_main",
            buffers: ball_data.get_gpu_vertex_state(),
        },
        fragment: {
            module: shader_module,
            entrypoint: "fs_main",
            targets: [{
                // format: navigator.gpu.getPreferredCanvasFormat(),
                format: "rgba8unorm"
            }],
        },
        primitive: { topology: "triangle-list" },
        layout: render_pipeline_layout,
        cullMode: "none"
    };
    const render_pipeline = device.createRenderPipeline(render_pipeline_descriptor);

    function render() {
        const render_pass_descriptor = {
            label: "Circles pass encoder",
            colorAttachments: [
                {
                    clearValue: clear_color,
                    loadOp: "clear",
                    storeOp: "store",
                    view: context.getCurrentTexture().createView(),
                },
            ],
        };
        const command_encoder = device.createCommandEncoder({ label: "Circles command encoder" });

        const pass_encoder = command_encoder.beginRenderPass(
            render_pass_descriptor,
        );
        pass_encoder.setPipeline(render_pipeline);
        pass_encoder.setVertexBuffer(0, storage_buffer);
        pass_encoder.setBindGroup(0, bind_group);
        pass_encoder.draw(3, num_balls);
        pass_encoder.end();
        device.queue.submit([command_encoder.finish()]);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}
