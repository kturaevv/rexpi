/// <reference types="@webgpu/types" />
import { assert } from "./utils.js";
import { TriangleRenderer } from "./triangle.js";
import { CirclesRenderer } from "./circles.js";
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
    render_opts.add('circles', new ButtonWidget("Circles", false));
    render_opts.add('cube', new ButtonWidget("Cube", false));
    render_opts.add('plane', new ButtonWidget("Plane", false));
    render_opts.add('text', new ButtonWidget("Text", false));

    const circles = new GUI();
    circles.add("refresh", new ButtonWidget("Refresh", false))
    circles.add('debug', new CheckboxWidget("Debug"));
    circles.add('bounds', new CheckboxWidget("Bounds"));
    circles.add('amount', new NumberWidget("Amount", 100, 0, 100000));
    circles.add('size', new SliderWidget("Size", 0.01, 0.001, 0.3, 0.001));
    circles.add('bg_color', new ColorWidget("Background Color", [100.0, 100.0, 100.0, 1.0]));
    circles.add('color', new ColorWidget("Circles Color", [183.0, 138.0, 84.0, 0.9]));
    circles.add('cursor', new CursorWidget());

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

    const circles_renderer = new CirclesRenderer(device, context, circles);
    const triangle_render = new TriangleRenderer(device, context);
    const cube_render = new CubeRenderer(device, context, cube);
    const plane_render = new PlaneRenderer(device, context, plane_gui);
    const text_render = new TextRenderer(device, context);

    const sections = new AppRegistry(device);
    sections.register(document.getElementById(render_opts.circles.id), circles_renderer, circles);
    sections.register(document.getElementById(render_opts.triangle.id), triangle_render);
    sections.register(document.getElementById(render_opts.cube.id), cube_render, cube);
    sections.register(document.getElementById(render_opts.plane.id), plane_render, plane_gui);
    sections.register(document.getElementById(render_opts.text.id), text_render);

    document.getElementById(render_opts.circles.id).click();
}

await main();

