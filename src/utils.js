export default function () { throw new Error("Unimplemented!!!"); }

export function assert(condition, message) {
    if (!condition) throw new Error("Assertion failed: " + (message || ""));
}

export function random() {
    return Math.random() * 2 - 1;
}
