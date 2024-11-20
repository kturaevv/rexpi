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
}

console.log("Starting WebGPU!");
await main();
