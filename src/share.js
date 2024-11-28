
export default class BallData {
    // x y z w dx dy dz dw r of size f32
    static get NFIELDS() {
        return 9;
    }
    static get SIZE() {
        return BallData.NFIELDS * 4; // 4 bytes for f32
    }

    constructor(length) {
        this.length = length;
        assert(this.length, "Ball data length have not been provided!");
        this.blength = length * BallData.SIZE;
        assert(this.blength, "BallData byte length have not been set!");

        this.buf = new ArrayBuffer(length * BallData.SIZE);
        this.data = new Float32Array(this.buf);
        this.offset_idx = 0;
    }

    add(x, y, z, dx, dy, dz, r) {
        assert(x, "x is not set");
        assert(y, "y is not set");
        assert(z, "z is not set");
        assert(dx, "dx is not set");
        assert(dy, "dy is not set");
        assert(dz, "dz is not set");
        assert(r, "r is not set");
        this.data.set([x, y, z, 1.0, dx, dy, dz, 1.0, r], this.offset_idx);
        this.offset_idx += BallData.NFIELDS;
    }

    get_gpu_vertex_state() {
        return [
            {
                arrayStride: 36,
                stepMode: "instance",
                attributes: [
                    {
                        format: "float32x4",
                        offset: 0,
                        shaderLocation: 0, // position
                    },
                    {
                        format: "float32x4",
                        offset: 16,
                        shaderLocation: 1, // velocity
                    },
                    {
                        format: "float32",
                        offset: 32,
                        shaderLocation: 2, // radius
                    },
                ],
            },
        ];
    }
}



// ... in main

const NUM_BALLS = 10;
const ball_data = new BallData(NUM_BALLS);
for (let i = 0; i < NUM_BALLS; i++) {
    ball_data.add(
        Math.random(),
        Math.random(),
        Math.random(),
        Math.random(),
        Math.random(),
        Math.random(),
        Math.random(),
    );
}


const vertex_buffer = device.createBuffer({
    size: ball_data.data.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});

device.queue.writeBuffer(
    vertex_buffer,
    0,
    ball_data.data,
);

const pipeline_descriptor = {
    vertex: {
        module: shader_module,
        entrypoint: "vs_main",
        buffers: ball_data.get_gpu_vertex_state(),
    },
    fragment: {
        module: shader_module,
        entrypoint: "fs_main",
        targets: [{
            format: navigator.gpu.getPreferredCanvasFormat(),
        }],
    },
    primitive: { topology: "point-list" },
    layout: "auto",
};
