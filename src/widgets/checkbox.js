import { generate_short_id } from "../utils.js";
import Visibility from "./visibility.js";
import Widget from "./widget.js";

var CHECKBOX_WIDGET_COUNT = 0;

export class CheckboxWidget extends Widget {
    constructor(label = "Checkbox Widget") {
        super();

        CHECKBOX_WIDGET_COUNT += 1;

        this.id = generate_short_id() + `_${CHECKBOX_WIDGET_COUNT}`;

        this.value = false;
        this.label = label;
        this.event = label + `${this.id}`;
        this.input_tag = this.event;
        this.visibility = new Visibility(this.id);

        this.register();
    }

    get_checkbox_widget() {
        return `
            <div class="h-8 flex items-center justify-between space-x-4" id=${this.id}>
                <label class="text-gray-700 text-nowrap font-bold">${this.label}</label>
                <input
                    type="checkbox"
                    value="false"
                    class="w-4 h-4 rounded-lg border-gray-300 text-blue-500"
                    id=${this.input_tag}
                />
            </div>
    `;
    }

    register() {
        const checkbox_change_event = new CustomEvent(this.event);

        // Insert widget into the DOM
        const sidebar = document.getElementById("sidebar");
        sidebar.insertAdjacentHTML("beforeend", this.get_checkbox_widget());

        // Get all required elements
        const checkbox = document.getElementById(this.input_tag);

        checkbox.addEventListener("change", async (event) => {
            this.value = event.target.checked;
            document.dispatchEvent(checkbox_change_event);
        });

        return this;
    }
}
