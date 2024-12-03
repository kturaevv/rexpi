/// <reference types="@webgpu/types" />
import { assert } from "./utils.js";
import { render as triangle_render } from "./triangle.js";
import { render as circles_render } from "./circles.js";

async function init() {
    const adapter = await navigator.gpu.requestAdapter();
    assert(adapter, "Adapter not found");

    const device = await adapter.requestDevice();
    assert(device, "Device not found!");

    const canvas = document.getElementById("canvas");
    assert(canvas, "Canvas not found!");

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    console.log(canvas.width, canvas.height);

    /** @type {GPUCanvasContext} **/
    const context = canvas.getContext("webgpu");
    assert(context, "Context not found!");
    assert(context instanceof GPUCanvasContext, "Context has wrong type");

    context.configure({
        device: device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        size: {
            width: canvas.clientWidth,
            height: canvas.clientHeight,
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

    triangle_button.addEventListener('click', async () => {
        await triangle_render(device, context);
    });

    circles_button.addEventListener('click', async () => {
        await circles_render(device, context);
    });
}

await main();

