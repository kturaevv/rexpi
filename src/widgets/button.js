import { generate_short_id } from "../utils.js";
import Visibility from "./visibility.js";
import Widget from "./widget.js";

var BUTTON_WIDGET_COUNT = 0;

export class ButtonWidget extends Widget {
    constructor(label = "Button Widget", toggle = true) {
        super();
        BUTTON_WIDGET_COUNT += 1;
        this.toggle = toggle;
        this.id = generate_short_id() + `_${BUTTON_WIDGET_COUNT}`;
        this.value = false;
        this.label = label;
        this.event = label + `${this.id}`;
        this.button_tag = this.event;
        this.visibility = new Visibility(this.id);
        this.register();
    }

    get_button_widget() {
        return `
            <div class="m-1 p-2 border rounded-lg shadow-sm bg-white flex-none" id=${this.id}>
                <div class="flex items-center justify-between space-x-4">
                    <button
                        id=${this.button_tag}
                        class="px-4 py-2 bg-neutral-700 text-white rounded hover:bg-neutral-800 transition-colors duration-200 w-full"
                    >
                        ${this.label}
                    </button>
                </div>
            </div>
        `;
    }

    register() {
        const button_change_event = new CustomEvent(this.event);

        // Insert widget into the DOM
        const sidebar = document.getElementById("sidebar");
        sidebar.insertAdjacentHTML("beforeend", this.get_button_widget());

        // Get button element and add event listener
        const button = document.getElementById(this.button_tag);

        button.addEventListener("click", async () => {
            this.value = !this.value; // Toggle the value

            if (this.toggle) {
                // Update button appearance based on state
                if (this.value) {
                    button.classList.remove('bg-neutral-700', 'hover:bg-neutral-800');
                    button.classList.add('bg-green-600', 'hover:bg-green-700');
                } else {
                    button.classList.remove('bg-green-600', 'hover:bg-green-700');
                    button.classList.add('bg-neutral-700', 'hover:bg-neutral-800');
                }
            }

            document.dispatchEvent(button_change_event);
        });

        return this;
    }
}
