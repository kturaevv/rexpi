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

    // buffers
    const ball_buffer = device.createBuffer({
        size: ball_data.data.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    const viewport_buffer = device.createBuffer({
        label: "Viewport uniform",
        size: 2 * 4, // 2 floats
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        mappedAtCreation: false,
    });

    const [
        render_pipeline,
        render_bind_group
    ] = create_ball_render_pipeline(device, viewport_buffer, ball_data, shader_module);

    const [
        compute_pipeline,
        compute_bind_group
    ] = create_ball_compute_pipeline(device, ball_buffer, ball_data, await load_shader_file("circles_cs.wgsl"));


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

    // One time write
    device.queue.writeBuffer(viewport_buffer, 0, new Float32Array([canvas.width, canvas.height]));
    device.queue.writeBuffer(
        ball_buffer,
        0,
        ball_data.data,
    );

    function render() {
        // Update color attachment view
        render_pass_descriptor.colorAttachments[0].view =
            context.getCurrentTexture().createView();

        const command_encoder = device.createCommandEncoder({ label: "Circles command encoder" });

        const compute_pass = command_encoder.beginComputePass();
        compute_pass.setPipeline(compute_pipeline);
        compute_pass.setBindGroup(0, compute_bind_group);
        compute_pass.dispatchWorkgroups(Math.ceil(num_balls / 32));
        compute_pass.end();

        const render_pass = command_encoder.beginRenderPass(render_pass_descriptor);
        render_pass.setPipeline(render_pipeline);
        render_pass.setBindGroup(0, render_bind_group);
        render_pass.setVertexBuffer(0, ball_buffer);
        render_pass.draw(3, num_balls);
        render_pass.end();

        device.queue.submit([command_encoder.finish()]);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}


/** 
 * @param {GPUDevice} device
 * */
function create_ball_compute_pipeline(device, ball_buffer, ball_data, shader) {
    const compute_shader_module = device.createShaderModule({
        label: "Compute shader",
        code: shader,
    });
    const compute_bind_group_layout = device.createBindGroupLayout({
        label: "ComputeBindGroupLayout",
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage" },

            },
        ]
    });

    const compute_bind_group = device.createBindGroup({
        label: "ComputeBindGroup",
        layout: compute_bind_group_layout,
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: ball_buffer
                }
            }

        ]
    });

    const compute_pipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({
            bindGroupLayouts: [compute_bind_group_layout]
        }),
        compute: {
            module: compute_shader_module,
            entryPoint: "compute_main",
            buffers: ball_data.get_gpu_vertex_state(),
        }
    });

    return [compute_pipeline, compute_bind_group];
};


/** 
 * @param {GPUDevice} device
 * */
function create_ball_render_pipeline(device, viewport_buffer, ball_data, shader_module) {
    const render_bind_group_layout = device.createBindGroupLayout({
        label: "Bind group layout",
        entries: [
            { // Bind group layout entry
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: "uniform" },
            }
        ]
    });
    const render_bind_group = device.createBindGroup({
        label: "Bind group",
        layout: render_bind_group_layout,
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: viewport_buffer,
                }
            }
        ]
    });
    // Render pipeline
    const render_pipeline_layout = device.createPipelineLayout({
        bindGroupLayouts: [render_bind_group_layout],
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

    return [render_pipeline, render_bind_group];
}
