import Renderer from "./renderer.js";
import { assert, is_bool, random } from "./utils.js";
import GUI from "./widgets/gui.js";
import shaders from "./shaders.js";

export default function () { throw new Error("Unimplemented!!!"); }

/** 
 * @param {GPUDevice} device
 * */
function create_ball_compute_pipeline(device, ball_position_buffer, ball_velocity_buffer, ball_radius_buffer, compute_shader_module) {
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
     * @param {GUI} data 
     * */
    constructor(device, context, gui) {
        super();
        const data = gui.data();
        assert(data.bg_color.length === 4, "Color should be length 4");
        assert(data.color.length === 4, "Color should be length 4");
        assert(Number.isInteger(data.amount), "Num balls should be an integer");
        assert(is_bool(data.debug), "Debug value should be a boolean", data.debug);
        assert(!Number.isNaN(data.size), "Size is not an Integer!", data.size);

        const viewport_buffer = device.createBuffer({
            label: "Viewport uniform",
            size: 8 * 4, // 6 floats + padding
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
            mappedAtCreation: false,
        });
        const set_viewport = () => {
            device.queue.writeBuffer(viewport_buffer, 0, new Float32Array([...gui.color.get_value(), canvas.width, canvas.height]));
        };
        document.addEventListener(gui.color.event, set_viewport);
        document.addEventListener('canvas_resize', set_viewport)
        set_viewport();

        let ball_position_buffer = null;
        let ball_velocity_buffer = null;
        let ball_radius_buffer = null;

        let render_pipeline = null;
        let render_bind_group = null;
        let compute_pipeline = null;
        let compute_bind_group = null;

        const init = () => {
            const amount = gui.amount.get_value();

            let ball_position = null;
            let ball_velocity = null;
            let ball_radius = null;

            // Prepare data
            ball_position = new Float32Array(amount * 4);
            ball_velocity = new Float32Array(amount * 4);
            ball_radius = new Float32Array(amount);

            for (let i = 0; i < amount; i++) {
                let offset = i * 4
                ball_position.set([random(), random(), random(), 1.0], offset);
                ball_velocity.set([random(), random(), random(), 1.0], offset);
                ball_radius.set([gui.size.get_value()], i);
            }

            // Buffers
            const ball_usage = GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            ball_position_buffer = device.createBuffer({ size: ball_position.byteLength, usage: ball_usage });
            ball_velocity_buffer = device.createBuffer({ size: ball_velocity.byteLength, usage: ball_usage });
            ball_radius_buffer = device.createBuffer({ size: ball_radius.byteLength, usage: ball_usage });

            device.queue.writeBuffer(ball_position_buffer, 0, ball_position);
            device.queue.writeBuffer(ball_velocity_buffer, 0, ball_velocity);
            device.queue.writeBuffer(ball_radius_buffer, 0, ball_radius);

            const update_shaders = () => {
                const compute_shader_module = device.createShaderModule({
                    label: "Circles compute shader",
                    code: shaders.circles_cs,
                });

                const render_shader_module = (() => {
                    const frag = gui.debug.get_value() ? shaders.circles_fs_debug : shaders.circles_fs;
                    const vert = shaders.circles_vs;
                    return device.createShaderModule({
                        label: 'Circles shader',
                        code: vert + frag,
                    });
                })();

                [
                    render_pipeline,
                    render_bind_group
                ] = create_ball_render_pipeline(device, viewport_buffer, render_shader_module);

                [
                    compute_pipeline,
                    compute_bind_group
                ] = create_ball_compute_pipeline(device, ball_position_buffer, ball_velocity_buffer, ball_radius_buffer, compute_shader_module);
            };

            document.addEventListener(gui.debug.event, update_shaders);
            update_shaders();
        };

        document.addEventListener(gui.amount.event, init);
        document.addEventListener(gui.size.event, init);
        init();

        this.render_callback = () => {
            if (!this.is_rendering) { return; }

            const render_pass_descriptor = {
                label: "Circles pass encoder",
                colorAttachments: [
                    {
                        clearValue: gui.bg_color.get_value(),
                        loadOp: "clear",
                        storeOp: "store",
                        view: context.getCurrentTexture().createView(),
                    },
                ],
            };

            // Update color attachment view
            render_pass_descriptor.colorAttachments[0].view =
                context.getCurrentTexture().createView();

            const command_encoder = device.createCommandEncoder({ label: "Circles command encoder" });

            const compute_pass = command_encoder.beginComputePass();
            compute_pass.setPipeline(compute_pipeline);
            compute_pass.setBindGroup(0, compute_bind_group);
            compute_pass.dispatchWorkgroups(Math.ceil(gui.amount.get_value() / 64));
            compute_pass.end();

            const render_pass = command_encoder.beginRenderPass(render_pass_descriptor);
            render_pass.setPipeline(render_pipeline);
            render_pass.setBindGroup(0, render_bind_group);
            render_pass.setVertexBuffer(0, ball_position_buffer);
            render_pass.setVertexBuffer(1, ball_radius_buffer);
            render_pass.draw(3, gui.amount.get_value());
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
