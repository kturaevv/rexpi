import { assert } from "./utils.js";

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
        assert(z >= 0, "Depth buffer out of range [0;1]");
        this.data.set([x, y, z, 1.0, dx, dy, dz, 1.0, r], this.offset_idx);
        this.offset_idx += BallData.NFIELDS;
    }

    get_gpu_vertex_state() {
        return [
            {
                arrayStride: BallData.SIZE,
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
