import { assert } from "../utils.js";

export default class Visibility {
    constructor(id) { this.id = id; assert(this.id, "ID should be passed") }

    toggle() {
        const element = document.getElementById(this.id);
        element.classList.toggle('hidden')
    }

    on() {
        const element = document.getElementById(this.id);
        if (element.classList.contains("hidden")) {
            this.toggle();
        }
    }

    off() {
        const element = document.getElementById(this.id);
        if (!element.classList.contains("hidden")) {
            this.toggle();
        }
    }
}
