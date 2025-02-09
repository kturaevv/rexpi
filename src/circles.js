import Renderer from "./renderer.js";
import { assert, is_bool, random } from "./utils.js";
import Widget from "./widgets/widget.js";
import GUI from "./widgets/gui.js";

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
 * */
function create_ball_compute_pipeline(device, ball_position_buffer, ball_velocity_buffer, ball_radius_buffer, shader) {
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
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage" },

            },
            {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage" },

            },
        ]
    });
    const compute_bind_group = device.createBindGroup({
        label: "ComputeBindGroup",
        layout: compute_bind_group_layout,
        entries: [
            { binding: 0, resource: { buffer: ball_position_buffer } },
            { binding: 1, resource: { buffer: ball_velocity_buffer } },
            { binding: 2, resource: { buffer: ball_radius_buffer } }
        ]
    });

    const compute_pipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({
            bindGroupLayouts: [compute_bind_group_layout]
        }),
        compute: {
            module: compute_shader_module,
            entryPoint: "compute_main"
        }
    });

    return [compute_pipeline, compute_bind_group];
};


/** 
 * @param {GPUDevice} device
 * */
function create_ball_render_pipeline(
    device,
    viewport_buffer,
    shader_module
) {
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
            { binding: 0, resource: { buffer: viewport_buffer, } },
        ]
    });
    // Render pipeline
    const render_pipeline_layout = device.createPipelineLayout({
        bindGroupLayouts: [render_bind_group_layout],
    });
    const render_pipeline_descriptor = {
        label: "Circles render pipeline",
        // We have only 1 vertex buffer which is ball data position buffer
        vertex: {
            module: shader_module,
            entrypoint: "vs_main",
            buffers: [{
                arrayStride: 4 * 4, // vec4<f32> position 
                stepMode: "instance",
                attributes: [{ offset: 0, format: "float32x4", shaderLocation: 0 }]
            }, {
                arrayStride: 4, // f32 radius
                stepMode: "instance",
                attributes: [{ offset: 0, format: "float32", shaderLocation: 1 }]
            }],
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

export class CirclesRenderer extends Renderer {
    /** 
     * @param {GPUDevice} device
     * @param {GPUCanvasContext} context
     * @param {GUI} gui 
     * */
    async init(device, context, gui) {
        gui = gui.data();
        assert(gui.bg_color.length === 4, "Color should be length 4");
        assert(gui.color.length === 4, "Color should be length 4");
        assert(Number.isInteger(gui.amount), "Num balls should be an integer");
        assert(is_bool(gui.debug), "Debug value should be a boolean", gui.debug);
        assert(!Number.isNaN(gui.size), "Size is not an Integer!", gui.size);

        const shader_module = await load_ball_shader_module(device, gui.debug);

        // Prepare data
        let ball_position = new Float32Array(gui.amount * 4);
        let ball_velocity = new Float32Array(gui.amount * 4);
        let ball_radius = new Float32Array(gui.amount);

        for (let i = 0; i < gui.amount; i++) {
            let offset = i * 4
            ball_position.set([random(), random(), random(), 1.0], offset);
            ball_velocity.set([random(), random(), random(), 1.0], offset);
            ball_radius.set([gui.size], i);
        }

        // buffers
        const ball_usage = GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        const ball_position_buffer = device.createBuffer({ size: ball_position.byteLength, usage: ball_usage });
        const ball_velocity_buffer = device.createBuffer({ size: ball_velocity.byteLength, usage: ball_usage });
        const ball_radius_buffer = device.createBuffer({ size: ball_radius.byteLength, usage: ball_usage });
        const viewport_buffer = device.createBuffer({
            label: "Viewport uniform",
            size: 8 * 4, // 6 floats + padding
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
            mappedAtCreation: false,
        });

        let [
            render_pipeline,
            render_bind_group
        ] = create_ball_render_pipeline(device, viewport_buffer, shader_module);

        let [
            compute_pipeline,
            compute_bind_group
        ] = create_ball_compute_pipeline(device, ball_position_buffer, ball_velocity_buffer, ball_radius_buffer, await load_shader_file("circles_cs.wgsl"));


        const render_pass_descriptor = {
            label: "Circles pass encoder",
            colorAttachments: [
                {
                    clearValue: gui.bg_color,
                    loadOp: "clear",
                    storeOp: "store",
                    view: context.getCurrentTexture().createView(),
                },
            ],
        };

        // One time write
        device.queue.writeBuffer(viewport_buffer, 0, new Float32Array([...gui.color, canvas.width, canvas.height]));
        device.queue.writeBuffer(ball_position_buffer, 0, ball_position);
        device.queue.writeBuffer(ball_velocity_buffer, 0, ball_velocity);
        device.queue.writeBuffer(ball_radius_buffer, 0, ball_radius);

        this.render_callback = () => {
            if (!this.is_rendering) { return; }

            // Update color attachment view
            render_pass_descriptor.colorAttachments[0].view =
                context.getCurrentTexture().createView();

            const command_encoder = device.createCommandEncoder({ label: "Circles command encoder" });

            const compute_pass = command_encoder.beginComputePass();
            compute_pass.setPipeline(compute_pipeline);
            compute_pass.setBindGroup(0, compute_bind_group);
            compute_pass.dispatchWorkgroups(Math.ceil(gui.amount / 32));
            compute_pass.end();

            const render_pass = command_encoder.beginRenderPass(render_pass_descriptor);
            render_pass.setPipeline(render_pipeline);
            render_pass.setBindGroup(0, render_bind_group);
            render_pass.setVertexBuffer(0, ball_position_buffer);
            render_pass.setVertexBuffer(1, ball_radius_buffer);
            render_pass.draw(3, gui.amount);
            render_pass.end();

            device.queue.submit([command_encoder.finish()]);
            requestAnimationFrame(this.render_callback);
        };

        this.cleanup_callback = () => {
            ball_position = null;
            ball_velocity = null;
            ball_radius = null;
            ball_position_buffer.destroy();
            ball_radius_buffer.destroy();
            ball_velocity_buffer.destroy();
            viewport_buffer.destroy();
            compute_pipeline = null;
            compute_bind_group = null;
            render_pipeline = null;
            render_bind_group = null;
        };

        return this;
    };

    render() {
        this.is_rendering = true;
        requestAnimationFrame(this.render_callback);
    };

    terminate() {
        this.is_rendering = false;
        this.cleanup_callback();
    }
}
