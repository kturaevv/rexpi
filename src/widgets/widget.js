import { assert } from "../utils.js";

export default class Widget {
    constructor() {
        this.id = null;
        this.value = null;
    }

    init() {
        throw new Error("init() must be implemented!");
    }

    get_id() {
        assert(this.id !== null, "[id] value of a widget is null!");
        return this.id;
    }

    get_value() {
        assert(this.value !== null, "[value] value of a widget is null!");
        return this.value;
    }
}
