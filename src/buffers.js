import { assert } from "./utils.js";

export default class Buffers {
    /**
     * @param {GPUDevice} device
     * @param {GPUCanvasContext} context
     **/
    constructor(device, base_label) {
        this.device = device;
        this.label = base_label;
        this.binding_ix = 0;
        this.entries = [];
    }

    /**
     * @param {Float32Array} data
     * */
    create_buffer(data, usage, label = '') {
        const buf = this.device.createBuffer({
            label: this.label + ":" + label,
            size: data.byteLength,
            usage: usage | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(buf, 0, data);
        this.update_bind_group({ buffer: buf });
        return buf;
    }

    update_bind_group(resource) {
        assert(resource !== undefined && resource !== null, "resource cannot be null");
        this.entries.push({ binding: this.binding_ix, resource: resource });
        this.binding_ix += 1;
    }

    get_bind_group(pipeline) {
        return this.device.createBindGroup({
            label: this.label + "BindGroup",
            layout: pipeline.getBindGroupLayout(0),
            entries: this.entries
        });
    }
}
