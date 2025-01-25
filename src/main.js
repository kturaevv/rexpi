/// <reference types="@webgpu/types" />
import { assert } from "./utils.js";
import { render as render_triangle } from "./triangle.js";
import { init_balls as render_circles } from "./circles.js";
import { ColorWidget } from "./widgets/color_picker.js";
import { NumberWidget } from "./widgets/number.js";
import { CheckboxWidget } from "./widgets/checkbox.js";
import { SliderWidget } from "./widgets/slider.js";


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

    const triangle_button = document.getElementById('triangle_button');
    assert(triangle_button, "Triangle button is not found!");
    const circles_button = document.getElementById('circles_button');
    assert(circles_button, "Circles button is not found!");

    const circles_debug_mode = new CheckboxWidget("Debug");
    const circles_amount_widget = new NumberWidget("Amount", 100);
    const circles_bg_color_widget = new ColorWidget("Background Color");
    const circles_color_widget = new ColorWidget("Circles Color", [183.0, 138.0, 84.0, 0.9]);
    const circles_size_widget = new SliderWidget("Size", 0.1, 0.01, 0.3, 0.001);

    const circle_widgets = [
        circles_debug_mode,
        circles_amount_widget,
        circles_bg_color_widget,
        circles_size_widget,
        circles_color_widget
    ];

    triangle_button.addEventListener('click', async () => {
        await render_triangle(device, context);
        for (let widget of circle_widgets) {
            widget.visibility.off();
        }
    });

    circles_button.addEventListener('click', async () => {
        for (const widget of circle_widgets) {
            widget.visibility.on();
        }
        const args = [circles_bg_color_widget.value, circles_color_widget.value, circles_amount_widget.value, circles_size_widget.value, circles_debug_mode.value];
        console.log(circles_bg_color_widget.value, circles_color_widget.value);
        await render_circles(device, context, ...args);
    });

    for (const widget of circle_widgets) {
        document.addEventListener(widget.event, async () => {
            const args = [circles_bg_color_widget.value, circles_color_widget.value, circles_amount_widget.value, circles_size_widget.value, circles_debug_mode.value];
            await render_circles(device, context, ...args);
        });
    }

    circles_button.click();
}

await main();

