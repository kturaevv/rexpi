class Position {
    constructor(x = 0, y = 0, z = 0) {
        this.buffer = new Float32Array(3);
        this.buffer.set([x, y, z]);
    }
}

class Voxel {
    static get POSITION_OFFSET() { return 0; };
    static get COLOR_OFFSET() { return 12; };

    constructor(pos, color) {
        let pos_size, pos_len = [3, 3];
        let col_size, col_len = [3, 3];

        this.buffer = new ArrayBuffer(num_elements * size_elements);

        this.position = new Float32Array(this.buffer, this.POSITION_OFFSET, 3);
        this.color = new Float32Array(this.buffer, this.COLOR_OFFSET, 3);
    }
}

console.log(Position(2, 3, 4));

