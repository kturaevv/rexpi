import { assert, generate_short_id } from "../utils.js";
import Visibility from "./visibility.js";

/**
 * Base Widget class that provides common functionality for UI components.
 * 
 * @class Widget
 * @property {string}} id - random id
 * @property {*} value - Current value of the widget, can be any type
 * @property {Function|null} event - Event handler function for the widget
 * @property {string|null} label - Display label for the widget
 * @property {Visibility} visibility - Controls the visibility state of the widget
 * @property {string
 */
export default class Widget {
    constructor() {
        this.id = generate_short_id();
        this.value = null;
        this.event = null;
        this.label = null;
        this.visibility = new Visibility(this.id);
        this.border = "m-1 p-2 border rounded-lg shadow-sm bg-white select-none";
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

    get_event() {
        assert(this.event !== null, "[event] value of a widget is null!");
        return this.event;
    }

    get_child_widgets() {
        throw new Error("[get_child_widgets] is unimplemented!!!");
    }

    has_child_widgets() {
        return false;
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
