/// <reference types="@webgpu/types" />
import { assert } from "./utils.js";
import { TriangleRenderer } from "./triangle.js";
import { ParticlesRenderer } from "./particles.js";
import { ColorWidget } from "./widgets/color_picker.js";
import { NumberWidget } from "./widgets/number.js";
import { CheckboxWidget } from "./widgets/checkbox.js";
import { ButtonWidget } from "./widgets/button.js";
import { SliderWidget } from "./widgets/slider.js";
import GUI from "./widgets/gui.js";
import AppRegistry from "./widgets/registry.js";
import { StackedWidgets } from "./widgets/stack_widgets.js";
import CubeRenderer from "./cube.js";
import { KeyWidget } from "./widgets/keyboard.js";
import PlaneRenderer from "./plane.js";
import CursorWidget from "./widgets/cursor.js";
import TextRenderer from "./text.js";

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
    render_opts.add('triangle', new ButtonWidget("Triangle", false));
    render_opts.add('particles', new ButtonWidget("Particles", false));
    render_opts.add('cube', new ButtonWidget("Cube", false));
    render_opts.add('plane', new ButtonWidget("Plane", false));
    render_opts.add('text', new ButtonWidget("Text", false));

    const particles = new GUI();
    particles.add("refresh", new ButtonWidget("Refresh", false))
    particles.add('debug', new CheckboxWidget("Debug"));
    particles.add('bounds', new CheckboxWidget("Bounds"));
    particles.add('amount', new NumberWidget("Amount", 100, 0, 100000));
    particles.add('size', new SliderWidget("Size", 0.01, 0.001, 0.3, 0.001));
    particles.add('bg_color', new ColorWidget("Background Color", [100.0, 100.0, 100.0, 1.0]));
    particles.add('color', new ColorWidget("Particles Color", [183.0, 138.0, 84.0, 0.9]));
    particles.add('cursor', new CursorWidget());

    const show_axis = new CheckboxWidget("Show axis", true);

    const camera = new StackedWidgets([], 3, 1);
    camera.add('-', new KeyWidget(''));
    camera.add('w', new KeyWidget('W'));
    camera.add('-', new KeyWidget(''));
    camera.add('a', new KeyWidget('A'));
    camera.add('s', new KeyWidget('S'));
    camera.add('d', new KeyWidget('D'));

    const cube = new GUI();
    cube.add('camera', camera);

    const plane_gui = new GUI();
    plane_gui.add('cursor', new CursorWidget());
    plane_gui.add('show_axis', show_axis);
    plane_gui.add('camera', camera);

    const text_controls = new StackedWidgets([], 1, 1);
    text_controls.add('scale', new SliderWidget("Font size", 6, 1, 30, 0.01));
    text_controls.add('px', new SliderWidget("Padding x", 1, 0, 10, 0.01));
    text_controls.add('py', new SliderWidget("Padding y", 0, 0, 10, 0.01));
    text_controls.add('mx', new SliderWidget("Margin x", 10, 0, 50, 0.01));
    text_controls.add('my', new SliderWidget("Margin y", 10, 0, 50, 0.01));

    const text_gui = new GUI();
    text_gui.add('bg', new ColorWidget('Background color', [147, 122, 122, 1.0]));
    text_gui.add('config', text_controls);
    text_gui.add('debug', new CheckboxWidget("Debug"));
    text_gui.add('word_wrap', new CheckboxWidget("Word wrap"));

    const particles_renderer = new ParticlesRenderer(device, context, particles);
    const triangle_render = new TriangleRenderer(device, context);
    const cube_render = new CubeRenderer(device, context, cube);
    const plane_render = new PlaneRenderer(device, context, plane_gui);
    const text_render = new TextRenderer(device, context, text_gui);

    const sections = new AppRegistry(device);
    sections.register(document.getElementById(render_opts.particles.id), particles_renderer, particles);
    sections.register(document.getElementById(render_opts.triangle.id), triangle_render);
    sections.register(document.getElementById(render_opts.cube.id), cube_render, cube);
    sections.register(document.getElementById(render_opts.plane.id), plane_render, plane_gui);
    sections.register(document.getElementById(render_opts.text.id), text_render, text_gui);

    document.getElementById(render_opts.text.id).click();
}

await main();

