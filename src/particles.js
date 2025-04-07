import Renderer from "./renderer.js";
import { assert, is_bool, random } from "./utils.js";
import GUI from "./widgets/gui.js";
import SHADERS from "./shaders.js";

export default function () { throw new Error("Unimplemented!!!"); }

/** 
 * @param {GPUDevice} device 
 * @param {String} label 
 * @param {Float32Array} data 
 * */
function create_buffer(device, label, usage, data) {
    let buf = device.createBuffer({
        label: label,
        size: data.byteLength,
        usage: usage | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(buf, 0, data);
    return buf;
}

export class ParticlesRenderer extends Renderer {

    /** 
     * @param {GPUDevice} device
     * @param {GPUCanvasContext} context
     * @param {GUI} data 
     * */
    constructor(device, context) {
        super();

        const gui = new GUI();
        gui.add('refresh', ['btn', false], 'Refresh');
        gui.add('debug', false, 'Debug');
        gui.add('bounds', false, 'Bounds');
        gui.add('amount', [100, 0, 100000], 'Amount');
        gui.add('size', [0.01, 0.001, 0.3, 0.001], 'Size');
        gui.add('bg_color', ['rgba', 100.0, 100.0, 100.0, 1.0], 'Background color');
        gui.add('color', ['rgba', 183.0, 138.0, 84.0, 0.9], "Particles color");
        gui.add('cursor', ['cursor']);

        const data = gui.data();
        assert(data.bg_color.length === 4, "Color should be length 4");
        assert(data.color.length === 4, "Color should be length 4");
        assert(Number.isInteger(data.amount), "Num balls should be an integer");
        assert(is_bool(data.debug), "Debug value should be a boolean", data.debug);
        assert(!Number.isNaN(data.size), "Size is not an Integer!", data.size);

        const set_config = () => new Float32Array([
            ...gui.color.get_value(),
            canvas.width, canvas.height,
            this.gui.bounds.get_value(),
            this.gui.debug.get_value(),
        ]);

        this.gui = gui;
        this.device = device;
        this.context = context;
        this.viewport_buffer = create_buffer(device, 'Viewport uniform', GPUBufferUsage.UNIFORM, set_config());

        this.cursor = new Float32Array([0, 0, 0, 0]);
        this.cursor_buffer = create_buffer(device, 'Cursor uniform', GPUBufferUsage.UNIFORM, this.cursor);

        const update_config = () => {
            device.queue.writeBuffer(this.viewport_buffer, 0, set_config());
        };

        const set_cursor = (v) => {
            this.cursor = new Float32Array([v.curr.x, v.curr.y, v.is_dragging ? 1 : 0])
            device.queue.writeBuffer(this.cursor_buffer, 0, this.cursor);
        };

        const init = () => {
            this.create_ball_data();
            this.create_ball_render_pipeline();
            this.create_ball_compute_pipeline();
        };

        const listen = (e, fn) => document.addEventListener(e, fn);
        listen('canvas_resize', update_config)
        gui.color.listen(update_config);
        gui.bounds.listen(update_config);
        gui.debug.listen(update_config);
        gui.amount.listen(init);
        gui.refresh.listen(init);
        gui.size.listen(init);
        gui.cursor.listen(() => set_cursor(this.gui.cursor.value));

        init();

        this.render_callback = () => {
            if (!this.is_rendering) { return; }

            const render_pass_descriptor = {
                label: "Particles pass encoder",
                colorAttachments: [
                    {
                        clearValue: gui.bg_color.get_value(),
                        loadOp: "clear",
                        storeOp: "store",
                        view: context.getCurrentTexture().createView(),
                    },
                ],
            };

            render_pass_descriptor.colorAttachments[0].view =
                context.getCurrentTexture().createView();

            const command_encoder = device.createCommandEncoder({ label: "Particles command encoder" });

            const compute_pass = command_encoder.beginComputePass();
            compute_pass.setPipeline(this.compute_pipeline);
            compute_pass.setBindGroup(0, this.compute_bind_group);
            compute_pass.dispatchWorkgroups(Math.ceil(gui.amount.get_value() / 64));
            compute_pass.end();

            const render_pass = command_encoder.beginRenderPass(render_pass_descriptor);
            render_pass.setPipeline(this.render_pipeline);
            render_pass.setBindGroup(0, this.render_bind_group);
            render_pass.setVertexBuffer(0, this.ball_position_buffer);
            render_pass.setVertexBuffer(1, this.ball_radius_buffer);
            render_pass.draw(3, gui.amount.get_value());
            render_pass.end();

            device.queue.submit([command_encoder.finish()]);
            requestAnimationFrame(this.render_callback);
        };

        this.cleanup_callback = () => {
            this.ball_position = null;
            this.ball_velocity = null;
            this.ball_radius = null;
            this.ball_position_buffer.destroy();
            this.ball_radius_buffer.destroy();
            this.ball_acceleration_buffer.destroy();
            this.ball_velocity_buffer.destroy();
            this.viewport_buffer.destroy();
            this.compute_pipeline = null;
            this.compute_bind_group = null;
            this.render_pipeline = null;
            this.render_bind_group = null;
        };
    };

    create_ball_data() {
        const amount = this.gui.amount.get_value();
        const radius = this.gui.size.get_value()

        // Prepare data
        this.ball_position = new Float32Array(amount * 4);
        this.ball_velocity = new Float32Array(amount * 4);
        this.ball_acceleration = new Float32Array(amount * 4);
        this.ball_radius = new Float32Array(amount);

        for (let i = 0; i < amount - 1; i++) {
            let offset = i * 4;

            let rnd = () => {
                let v = random();
                return Math.abs(v) < 1.0 - radius ? v : 1.0 - radius;
            }

            this.ball_position.set([rnd(), rnd(), 0.0, 1.0], offset);
            this.ball_velocity.set([rnd(), rnd(), 0.0, 1.0], offset);
            this.ball_acceleration.set([rnd(), rnd(), 0.0, 1.0], offset);
            this.ball_radius.set([radius], i);
        }

        // Center circle
        let offset = (amount - 1) * 4;
        this.ball_position.set([0.0, 0.0, 0.0, 1.0], offset);
        this.ball_velocity.set([0.0, 0.0, 0.0, 1.0], offset);
        this.ball_acceleration.set([0.0, 0.0, 0.0, 1.0], offset);
        this.ball_radius.set([3 * radius], amount - 1);

        const ball_usage = GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
        const compute_only = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
        this.ball_position_buffer = create_buffer(this.device, '', ball_usage, this.ball_position);
        this.ball_velocity_buffer = create_buffer(this.device, '', ball_usage, this.ball_velocity);
        this.ball_radius_buffer = create_buffer(this.device, '', ball_usage, this.ball_radius);
        this.ball_acceleration_buffer = create_buffer(this.device, '', compute_only, this.ball_acceleration);
    }

    create_ball_render_pipeline() {
        const shader_module = (() => {
            return this.device.createShaderModule({
                label: 'Particles shader',
                code: SHADERS.particles_vs + SHADERS.particles_fs,
            });
        })();
        this.render_bind_group_layout = this.device.createBindGroupLayout({
            label: "Bind group layout",
            entries: [
                { // Bind group layout entry
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: "uniform" },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: "uniform" },
                },
            ]
        });
        this.render_bind_group = this.device.createBindGroup({
            label: "Bind group",
            layout: this.render_bind_group_layout,
            entries: [
                { binding: 0, resource: { buffer: this.viewport_buffer, } },
                { binding: 1, resource: { buffer: this.cursor_buffer, } },
            ]
        });
        this.render_pipeline_layout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.render_bind_group_layout],
        });
        this.render_pipeline = this.device.createRenderPipeline({
            label: "Particles render pipeline",
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
                    format: "rgba8unorm",
                    blend: {
                        color: {
                            srcFactor: "src-alpha",
                            dstFactor: "one-minus-src-alpha",
                            operation: "add",
                        },
                        alpha: {
                            srcFactor: "one",
                            dstFactor: "one-minus-src-alpha",
                            operation: "add",
                        }
                    }
                }],
            },
            primitive: { topology: "triangle-list" },
            layout: this.render_pipeline_layout,
            cullMode: "none"
        });
    }

    /** 
     * @param {GPUDevice} device
     * */
    create_ball_compute_pipeline() {
        const compute_shader_module = this.device.createShaderModule({
            label: "Particles compute shader",
            code: SHADERS.particles_cs,
        });

        const compute_bind_group_layout = this.device.createBindGroupLayout({
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
                {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" },

                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform" },

                },
            ]
        });
        this.compute_bind_group = this.device.createBindGroup({
            label: "ComputeBindGroup",
            layout: compute_bind_group_layout,
            entries: [
                { binding: 0, resource: { buffer: this.ball_position_buffer } },
                { binding: 1, resource: { buffer: this.ball_velocity_buffer } },
                { binding: 2, resource: { buffer: this.ball_acceleration_buffer } },
                { binding: 3, resource: { buffer: this.ball_radius_buffer } },
                { binding: 4, resource: { buffer: this.viewport_buffer } }
            ]
        });

        this.compute_pipeline = this.device.createComputePipeline({
            layout: this.device.createPipelineLayout({
                bindGroupLayouts: [compute_bind_group_layout]
            }),
            compute: {
                module: compute_shader_module,
                entryPoint: "compute_main"
            }
        });
    };
}
