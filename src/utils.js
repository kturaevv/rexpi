export default function () { throw new Error("Unimplemented!!!"); }

export function assert(condition, message, value) {
    let value_err_string = value ? ` - got ${value}` : '';
    if (!condition) throw new Error("Assertion failed: " + (message || "") + value_err_string);
}

export function random() {
    /** Returns a random number between -1 and 1 */
    return Math.random() * 2 - 1;
}


export function generate_short_id(length = 8) {
    return Math.random().toString(36).substring(2, 2 + length);
}


export const is_bool = (value) => {
    if (value === true ||
        value === false ||
        value === 0 ||
        value === 1 ||
        value === "0" ||
        value === "1" ||
        value === "true" ||
        value === "false") return true;
    return false;
};

assert(is_bool(true));      // true
assert(is_bool(false));     // true
assert(is_bool(1));         // true
assert(is_bool(0));         // true
assert(is_bool("1"));       // true
assert(is_bool("0"));       // true
assert(is_bool("true"));    // true
assert(is_bool("false"));   // true
assert(!is_bool(" TRUE "));  // false
assert(!is_bool(2));         // false
assert(!is_bool("yes"));     // false
assert(!is_bool(null));      // false
assert(!is_bool(undefined)); // false
