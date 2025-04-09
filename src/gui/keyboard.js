import { generate_short_id } from "../utils.js";
import Visibility from "./visibility.js";
import Widget from "./widget.js";

var KEYBOARD_WIDGET_COUNT = 0;

export class KeyWidget extends Widget {
    constructor(key = "", caption = '') {
        super();
        KEYBOARD_WIDGET_COUNT += 1;
        this.label = "KeyWidget";
        this.caption = caption;
        this.id = generate_short_id() + `_${KEYBOARD_WIDGET_COUNT}`;
        this.value = false;
        this.key = key;
        this.event = key + `${this.id}`;
        this.visibility = new Visibility(this.id);
        this.register();

        if (this.key === '') {
            document.getElementById(this.id).classList.add('invisible');
        }
    }

    style() {
        return `
            <div class="flex flex-row space-x-2" id="${this.id}">
                <div id="${this.key}" class="
                    min-w-16 h-16 bg-neutral-700 rounded-lg border 
                    select-none flex items-center justify-center text-white font-semibold text-sm
                ">${this.key}</div>
            </div>
        `
    }

    register() {
        const key_press_event = new CustomEvent(this.event);

        const sidebar = document.getElementById("sidebar");
        sidebar.insertAdjacentHTML("beforeend", this.style());

        const press = (e) => {
            if (e.key.toLowerCase() === this.key.toLowerCase()) {
                document.getElementById(this.key).classList.add('bg-neutral-300');
                document.dispatchEvent(key_press_event);
            }
        };

        const release = (e) => {
            if (e.key.toLowerCase() === this.key.toLowerCase()) {
                document.getElementById(this.key).classList.remove('bg-neutral-300');
            }
        };
        document.addEventListener('keydown', (e) => press(e));
        document.addEventListener('keyup', (e) => release(e));
    }

}

