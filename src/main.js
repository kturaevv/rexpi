function assert(condition, message) {
    if (!condition) throw ("Assertion failed:" + (message || ""));
}

async function main() {
    const adapter = await navigator.gpu?.requestAdapter();
    assert(adapter, "WebGPU adapter not found");

    const device = await adapter.requestDevice();
    assert(device, "WebGPU device not found");

    const canvas = document.querySelector("canvas");
    assert(canvas, "Canvas element not found");

    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const context = canvas.getContext("webgpu");
    assert(context, "WebGPU context not found");

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device,
        format: presentationFormat,
    });

    const shaders = `
   struct VertexOut {
       @builtin(position) position : vec4f,
       @location(0) color : vec4f
   }
   @vertex
   fn vertex_main(
       @location(0) position: vec4f,
       @location(1) color: vec4f) -> VertexOut
   {
       var output : VertexOut;
       output.position = position;
       output.color = color;
       return output;
   }
   @fragment
   fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
   {
       return fragData.color;
   }
   `;

    const shaderModule = device.createShaderModule({
        code: shaders,
    });
    assert(shaderModule, "Failed to create shader module");

    const vertices = new Float32Array([
        0.0,
        0.6,
        0,
        1,
        1,
        0,
        0,
        1,
        -0.5,
        -0.6,
        0,
        1,
        0,
        1,
        0,
        1,
        0.5,
        -0.6,
        0,
        1,
        0,
        0,
        1,
        1,
    ]);

    const vertexBuffer = device.createBuffer({
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    assert(vertexBuffer, "Failed to create vertex buffer");

    device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);

    const vertexBuffers = [{
        attributes: [
            {
                shaderLocation: 0, // position
                offset: 0,
                format: "float32x4",
            },
            {
                shaderLocation: 1, // color
                offset: 16,
                format: "float32x4",
            },
        ],
        arrayStride: 32,
        stepMode: "vertex",
    }];

    const pipelineDescriptor = {
        vertex: {
            module: shaderModule,
            entryPoint: "vertex_main",
            buffers: vertexBuffers,
        },
        fragment: {
            module: shaderModule,
            entryPoint: "fragment_main",
            targets: [{
                format: presentationFormat,
            }],
        },
        primitive: {
            topology: "triangle-list",
        },
        layout: "auto",
    };

    const renderPipeline = device.createRenderPipeline(pipelineDescriptor);
    assert(renderPipeline, "Failed to create render pipeline");

    const commandEncoder = device.createCommandEncoder();
    assert(commandEncoder, "Failed to create command encoder");

    const textureView = context.getCurrentTexture().createView();
    assert(textureView, "Failed to create texture view");

    const clearColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };
    const renderPassDescriptor = {
        colorAttachments: [{
            clearValue: clearColor,
            loadOp: "clear",
            storeOp: "store",
            view: textureView,
        }],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    assert(passEncoder, "Failed to begin render pass");

    passEncoder.setPipeline(renderPipeline);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.draw(3);
    passEncoder.end();

    const commandBuffer = commandEncoder.finish();
    assert(commandBuffer, "Failed to finish command encoder");

    device.queue.submit([commandBuffer]);
}

console.log("Starting WebGPU!");

await main();
