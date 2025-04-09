/// <reference types="@webgpu/types" />
import { assert } from "./utils.js";
import { TriangleRenderer } from "./triangle.js";
import { ParticlesRenderer } from "./particles.js";
import AppRegistry from "./gui/registry.js";
import { StackedWidgets } from "./gui/stack_widgets.js";
import CubeRenderer from "./cube.js";
import PlaneRenderer from "./plane.js";
import TextRenderer from "./text.js";

async function init(canvas_name = 'canvas', canvas_resize_event_name = 'canvas_resize') {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        alert("WebGPU adapter not found. Your browser may not support WebGPU.");
        throw new Error("Adapter not found");
    }

    const device = await adapter.requestDevice();
    if (!device) {
        alert("WebGPU device not found. Your browser may not support WebGPU.");
        throw new Error("Device not found");
    }

    const canvas = document.getElementById(canvas_name);
    assert(canvas, "Canvas not found!");

    /** @type {GPUCanvasContext} **/
    const context = canvas.getContext("webgpu");
    assert(context, "Context not found!");
    assert(context instanceof GPUCanvasContext, "Context has wrong type");

    const canvas_resize_event = new CustomEvent(canvas_resize_event_name);

    const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
            const canvas = entry.target;
            const width = entry.contentBoxSize[0].inlineSize;
            const height = entry.contentBoxSize[0].blockSize;
            canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
            canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
            document.dispatchEvent(canvas_resize_event);
        }
    });
    observer.observe(canvas);

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    context.configure({
        device: device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        size: {
            width: canvas.width,
            height: canvas.height,
        },
        format: "rgba8unorm",
        alphaMode: "opaque",
        colorSpace: "srgb",
    });

    return [device, context];
}

async function main() {
    const [device, context] = await init();

    const render_opts = new StackedWidgets([], 3, 2);
    render_opts.add('triangle', ['btn', false], "Triangle");
    render_opts.add('particles', ['btn', false], "Particles");
    render_opts.add('cube', ['btn', false], "Cube");
    render_opts.add('plane', ['btn', false], "Plane");
    render_opts.add('text', ['btn', false], "Text");

    const triangle_render = new TriangleRenderer(device, context);
    const particles_renderer = new ParticlesRenderer(device, context);
    const cube_render = new CubeRenderer(device, context);
    const plane_render = new PlaneRenderer(device, context);
    const text_render = new TextRenderer(device, context);

    const sections = new AppRegistry(device);
    sections.register(render_opts.particles.id, particles_renderer);
    sections.register(render_opts.triangle.id, triangle_render);
    sections.register(render_opts.cube.id, cube_render);
    sections.register(render_opts.plane.id, plane_render);
    sections.register(render_opts.text.id, text_render);

    document.getElementById(render_opts.text.id).click();
}

await main();

