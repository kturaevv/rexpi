/// <reference types="@webgpu/types" />
import { assert } from "./utils.js";
import { render as render_triangle } from "./triangle.js";
import { render as render_circles } from "./circles.js";
import { ColorWidget } from "./widgets/color_picker.js";


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
    });

    return [device, context];
}

async function main() {
    const [device, context] = await init();

    const triangle_button = document.getElementById('triangle_button');
    assert(triangle_button, "Triangle button is not found!");
    const circles_button = document.getElementById('circles_button');
    assert(circles_button, "Circles button is not found!");

    const circles_color_widget = new ColorWidget("Background Color");

    triangle_button.addEventListener('click', async () => {
        await render_triangle(device, context);
        circles_color_widget.visibility.off();
    });

    circles_button.addEventListener('click', async () => {
        await render_circles(device, context);
        circles_color_widget.visibility.on();
    });

    document.addEventListener(circles_color_widget.event, async () => {
        await render_circles(device, context);
    });

    circles_button.click();
}

await main();

