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


async function init() {
    const adapter = await navigator.gpu.requestAdapter();
    assert(adapter, "Adapter not found");

    const device = await adapter.requestDevice();
    assert(device, "Device not found!");

    const canvas = document.getElementById("canvas");
    assert(canvas, "Canvas not found!");

    /** @type {GPUCanvasContext} **/
    const context = canvas.getContext("webgpu");
    assert(context, "Context not found!");
    assert(context instanceof GPUCanvasContext, "Context has wrong type");

    const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
            const canvas = entry.target;
            const width = entry.contentBoxSize[0].inlineSize;
            const height = entry.contentBoxSize[0].blockSize;
            canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
            canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
        }
    });
    observer.observe(canvas);

    context.configure({
        device: device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        size: {
            width: canvas.width,
            height: canvas.height,
        },
        format: "rgba8unorm",
        alphaMode: "premultiplied",
        colorSpace: "srgb",
    });

    return [device, context];
}

async function main() {
    const [device, context] = await init();

    const render_opts = new StackedWidgets([], 2);
    render_opts.add(new ButtonWidget("Triangle", false));
    render_opts.add(new ButtonWidget("Circles", false));

    const circles = new GUI();
    circles.add('debug', new CheckboxWidget("Debug"));
    circles.add('amount', new NumberWidget("Amount", 100));
    circles.add('bg_color', new ColorWidget("Background Color"));
    circles.add('color', new ColorWidget("Circles Color", [183.0, 138.0, 84.0, 0.9]));
    circles.add('size', new SliderWidget("Size", 0.1, 0.001, 0.3, 0.001));

    const sections = new AppRegistry();
    sections.register(document.getElementById(render_opts.widgets[0].id), TriangleRenderer, [device, context]);
    sections.register(document.getElementById(render_opts.widgets[1].id), CirclesRenderer, [device, context, circles], circles);

    document.getElementById(render_opts.widgets[1].id).click();
}

await main();

