export default function () { throw new Error("Unimplemented!!!"); }

export function assert(condition, message) {
    if (!condition) throw new Error("Assertion failed: " + (message || ""));
}

export function random() {
    /** Returns a random number between -1 and 1 */
    return Math.random() * 2 - 1;
}


export function generate_short_id(length = 8) {
    return Math.random().toString(36).substring(2, 2 + length);
}

