import { assert } from "../utils.js";

export default class Visibility {
    constructor(id) { this.id = id; assert(this.id, "ID should be passed") }

    toggle() {
        const element = document.getElementById(this.id);
        if (element.classList.contains('visible')) {
            element.classList.replace('visible', 'invisible');
        } else {
            element.classList.replace('invisible', 'visible');
        }
    }

    on() {
        const element = document.getElementById(this.id);
        if (element.classList.contains("invisible")) {
            element.classList.replace('invisible', 'visible');
        } else {
            element.classList.add("visible");
        }
    }

    off() {
        const element = document.getElementById(this.id);
        if (element.classList.contains("visible")) {
            element.classList.replace('visible', 'invisible');
        } else {
            element.classList.add("invisible");
        }
    }
}
