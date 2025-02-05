import { assert, generate_short_id } from "../utils.js";

export default class Widget {
    constructor() {
        this.id = null;
        this.value = null;
        this.border = "m-1 p-2 border rounded-lg shadow-sm bg-white";
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

    has_child_widgets() {
        return false;
    }

    get_child_widgets() {
        return this;
    }

    insert_border() {
        const element = document.getElementById(this.id);
        this.border.split(' ').map((style) => element.classList.add(style));
    }

    remove_border() {
        const element = document.getElementById(this.id);
        this.border.split(' ').map((style) => {
            if (element.classList.contains(style)) {
                element.classList.remove(style);
            }
        });
    }

}
