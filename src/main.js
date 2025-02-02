/// <reference types="@webgpu/types" />
import { assert } from "./utils.js";
import { TriangleRenderer } from "./triangle.js";
import { CirclesRenderer } from "./circles.js";
import { ColorWidget } from "./widgets/color_picker.js";
import { NumberWidget } from "./widgets/number.js";
import { CheckboxWidget } from "./widgets/checkbox.js";
import { SliderWidget } from "./widgets/slider.js";
import CubeRenderer from "./cube.js";
import GUI from "./widgets/gui.js";


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
    const circles_button = document.getElementById('circles_button');
    const cube_button = document.getElementById('cube_button');

    assert(triangle_button, "Triangle button is not found!");
    assert(circles_button, "Circles button is not found!");
    assert(circles_button, "Cube button is not found!");

    let currently_running_renderer = null;
    const turn_off_renderer = (renderer) => {
        if (currently_running_renderer) {
            currently_running_renderer.terminate();
        }
        currently_running_renderer = renderer;
    };

    const circles_gui = new GUI();
    circles_gui.add('debug', new CheckboxWidget("Debug"));
    circles_gui.add('amount', new NumberWidget("Amount", 100));
    circles_gui.add('bg_color', new ColorWidget("Background Color"));
    circles_gui.add('color', new ColorWidget("Circles Color", [183.0, 138.0, 84.0, 0.9]));
    circles_gui.add('size', new SliderWidget("Size", 0.1, 0.001, 0.3, 0.001));

    const triangle_renderer = new TriangleRenderer().init(device, context);

    triangle_button.addEventListener('click', async () => {
        triangle_renderer.render();
        turn_off_renderer(triangle_renderer);
        circles_gui.make_invisible();
    });

    console.log(circles_gui.values());

    circles_button.addEventListener('click', async () => {
        circles_gui.make_visible();
        const circles_renderer = new CirclesRenderer();
        await circles_renderer.init(device, context, circles_gui);
        circles_renderer.render();
        turn_off_renderer(circles_renderer);
    });

    cube_button.addEventListener("click", async () => {
        circles_gui.make_invisible();
        const cube_renderer = new CubeRenderer();
        await cube_renderer.init(device, context);
        cube_renderer.render();
    });

    for (const widget of circles_gui.widgets()) {
        document.addEventListener(widget.event, async () => {
            const circles_renderer = new CirclesRenderer();
            await circles_renderer.init(device, context, circles_gui);
            circles_renderer.render();
            turn_off_renderer(circles_renderer);
        });
    }

    circles_button.click();
}

await main();

