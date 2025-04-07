/// <reference types="@webgpu/types" />
import { assert } from "./utils.js";
import { TriangleRenderer } from "./triangle.js";
import { ParticlesRenderer } from "./particles.js";
import GUI from "./widgets/gui.js";
import AppRegistry from "./widgets/registry.js";
import { StackedWidgets } from "./widgets/stack_widgets.js";
import { CursorWidget } from "./widgets/cursor.js";
import CubeRenderer from "./cube.js";
import PlaneRenderer from "./plane.js";
import TextRenderer from "./text.js";
import make_wasd from "./widgets/wasd.js";
import wasd_keys from "./widgets/wasd.js";

async function init() {
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

    const canvas = document.getElementById("canvas");
    assert(canvas, "Canvas not found!");

    /** @type {GPUCanvasContext} **/
    const context = canvas.getContext("webgpu");
    assert(context, "Context not found!");
    assert(context instanceof GPUCanvasContext, "Context has wrong type");

    const canvas_resize_event = new CustomEvent('canvas_resize');

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

    const particles_gui = new GUI();
    particles_gui.add('refresh', ['btn', false], 'Refresh');
    particles_gui.add('debug', false, 'Debug');
    particles_gui.add('bounds', false, 'Bounds');
    particles_gui.add('amount', [100, 0, 100000], 'Amount');
    particles_gui.add('size', [0.01, 0.001, 0.3, 0.001], 'Size');
    particles_gui.add('bg_color', ['rgba', 100.0, 100.0, 100.0, 1.0], 'Background color');
    particles_gui.add('color', ['rgba', 183.0, 138.0, 84.0, 0.9], "Particles color");
    particles_gui.add('cursor', ['cursor']);
    const particles_renderer = new ParticlesRenderer(device, context, particles_gui);

    const cube_gui = new GUI();
    cube_gui.add('camera', wasd_keys());
    const cube_render = new CubeRenderer(device, context, cube_gui);

    const plane_gui = new GUI();
    plane_gui.add('cursor', new CursorWidget());
    plane_gui.add('show_axis', true, "Show axis");
    plane_gui.add('camera', wasd_keys());
    const plane_render = new PlaneRenderer(device, context, plane_gui);

    const text_controls = new StackedWidgets();
    text_controls.add('scale', [6.06, 1, 30, 0.01], "Font size");
    text_controls.add('px', [1.26, 0, 10, 0.01], "Padding x");
    text_controls.add('py', [0, 0, 10, 0.01], "Padding y");
    text_controls.add('mx', [10, 0, 50, 0.01], "Margin x");
    text_controls.add('my', [10, 0, 50, 0.01], "Margin y");

    const text_gui = new GUI();
    text_gui.add('bg', ['rgba', 147, 122, 122, 1.0], "Background color");
    text_gui.add('config', text_controls, "Config");
    text_gui.add('debug', false, "Debug");
    text_gui.add('word_wrap', false, "Word wrap");
    const text_render = new TextRenderer(device, context, text_gui);

    const triangle_render = new TriangleRenderer(device, context);

    const sections = new AppRegistry(device);
    sections.register(render_opts.particles.id, particles_renderer, particles_gui);
    sections.register(render_opts.triangle.id, triangle_render);
    sections.register(render_opts.cube.id, cube_render, cube_gui);
    sections.register(render_opts.plane.id, plane_render, plane_gui);
    sections.register(render_opts.text.id, text_render, text_gui);

    document.getElementById(render_opts.text.id).click();
}

await main();

