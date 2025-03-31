
export default class Buffers {
    /**
     * @param {GPUDevice} device
     * @param {GPUCanvasContext} context
     **/
    constructor(device, base_label) {
        this.device = device;
        this.label = base_label;
        this.binding = 0;
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
        this.entries.push({ binding: this.binding, resource: { buffer: buf } });
        this.binding += 1;
        return buf;
    }

    get_bind_group(pipeline) {
        return this.device.createBindGroup({
            label: "TextBindGroup",
            layout: pipeline.getBindGroupLayout(0),
            entries: this.entries
        });
    }
}
