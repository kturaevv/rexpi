import Renderer from "./renderer.js";

export default class CubeRenderer extends Renderer {
    /** 
     * @param { GPUDevice } device
    * */
    async init(device, context) {

        const shader_module = device.createShaderModule({
            label: "cube shader module",
            code: `
struct VertexOut {
    @builtin(position) pos: vec4<f32>,
    @location(0) texcoord: vec2<f32>,
};

@vertex fn vsmain(@builtin(vertex_index) ix: u32) -> VertexOut {
    let vertices = array(
          vec2f( 0.0,  0.0),  // center
          vec2f( 1.0,  0.0),  // right, center
          vec2f( 0.0,  1.0),  // center, top

          // 2st triangle
          vec2f( 0.0,  1.0),  // center, top
          vec2f( 1.0,  0.0),  // right, center
          vec2f( 1.0,  1.0),  // right, top

        //
    );

    var out: VertexOut;
    out.pos = vec4f(vertices[ix], 0.0, 1.0);
    out.texcoord = vertices[ix];
    return out;
};

@group(0) @binding(0) var my_sampler: sampler;
@group(0) @binding(1) var my_texture: texture_2d<f32>;

@fragment fn fsmain(in: VertexOut) -> @location(0) vec4<f32> { 
    return textureSample(my_texture, my_sampler, in.texcoord);
};
            `,
        });

        const kTextureWidth = 5;
        const kTextureHeight = 7;
        const _ = [255, 0, 0, 255];  // red
        const y = [255, 255, 0, 255];  // yellow
        const b = [0, 0, 255, 255];  // blue
        const textureData = new Uint8Array([
            _, _, _, _, _,
            _, y, _, _, _,
            _, y, _, _, _,
            _, y, y, _, _,
            _, y, _, _, _,
            _, y, y, y, _,
            b, _, _, _, _,
        ].flat())
            ;

        const texture = device.createTexture({
            size: [kTextureWidth, kTextureHeight],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });
        const sampler = device.createSampler();


        device.queue.writeTexture(
            { texture },
            textureData,
            { bytesPerRow: kTextureWidth * 4 },
            { width: kTextureWidth, height: kTextureHeight },
        );

        const pipeline = device.createRenderPipeline({
            label: "cube render pipeline",
            layout: 'auto',
            primitive: { topology: 'triangle-list' },
            vertex: {
                module: shader_module,
                entryPoint: 'vsmain',
            },
            fragment: {
                module: shader_module,
                entryPoint: 'fsmain',
                targets: [{ format: "rgba8unorm" }],
            }
        });

        const bind_group = device.createBindGroup({
            label: "Cube bind group",
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: texture.createView() },]
        });

        this.render_callback = () => {
            if (!this.is_rendering) { return; };
            const encoder = device.createCommandEncoder();
            let pass = encoder.beginRenderPass({
                label: 'cube render pass',
                colorAttachments: [
                    {
                        view: context.getCurrentTexture().createView(),
                        clearValue: [0, 0, 0, 1],
                        loadOp: "clear",
                        storeOp: "store",
                    }
                ]
            });
            pass.setPipeline(pipeline);
            pass.setBindGroup(0, bind_group);
            pass.draw(6);
            pass.end();
            device.queue.submit([encoder.finish()]);
            requestAnimationFrame(this.render_callback);
        };
        return this;
    }

    render() {
        this.is_rendering = true;
        requestAnimationFrame(this.render_callback);
    }

    terminate() { this.is_rendering = false; }
}
