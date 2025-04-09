import { generate_short_id } from "../utils.js";
import Visibility from "./visibility.js";
import Widget from "./widget.js";

var NUMBER_WIDGET_COUNT = 0;

export class NumberWidget extends Widget {
    constructor(label = "Number Widget", default_value, min = 1, max = 100) {
        super();

        NUMBER_WIDGET_COUNT += 1;
        this.id = generate_short_id() + `_${NUMBER_WIDGET_COUNT}`;

        this.add_button = `add_button_${this.id}`;
        this.min_button = `min_button_${this.id}`;

        this.input_name = `number_input` + `${this.id}`;
        this.name = label;
        this.value = default_value;
        this.event = this.name + this.id;

        this.visibility = new Visibility(this.id);

        this.min = min;
        this.max = max;

        this.register();
    }

    style() {
        return `
            <!--Quantity Input Section -->
            <div class="h-8 flex items-center justify-between space-x-2" id=${this.id}>
                <label class="w-20 text-gray-700 font-bold">${this.name}</label >
                <input
                    type="number" min="${this.min}" max="${this.max}" value="${this.value}"
                    class="border-none rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    id=${this.input_name}
                />
                <div class="flex space-x-2">
                    <button id=${this.min_button} class="px-3 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors" > - </button>
                    <button id=${this.add_button} class="px-3 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors" > + </button>
                </div>
            </div >
            `;
    }

    register() {
        const number_change_event = new CustomEvent(this.event);

        // Insert widget into the DOM
        const sidebar = document.getElementById("sidebar");
        sidebar.insertAdjacentHTML("beforeend", this.style());

        // Get all required elements
        const number_input = document.getElementById(this.input_name);
        const add_button = document.getElementById(this.add_button);
        const min_button = document.getElementById(this.min_button);

        const in_range = (val) => {
            return (val >= this.min && val <= this.max) ? true : false;
        };

        const increment = () => {
            let newval = parseInt(number_input.value) + 1;
            if (!in_range(newval)) { return; }
            [this.value, number_input.value] = [newval, newval];
        };
        const decrement = () => {
            let newval = parseInt(number_input.value) - 1;
            if (!in_range(newval)) { return; }
            [this.value, number_input.value] = [newval, newval];
        };
        const set = () => {
            let newval = parseInt(number_input.value);
            let el = document.getElementById(this.id);
            if (!in_range(newval)) {
                el.classList.add('bg-red-50');
                return;
            }
            el.classList.remove('bg-red-50');
            [this.value, number_input.value] = [newval, newval];
        };

        add_button.addEventListener("click", async () => {
            increment();
            document.dispatchEvent(number_change_event);
        });

        min_button.addEventListener("click", async () => {
            decrement();
            document.dispatchEvent(number_change_event);
        });

        number_input.addEventListener("input", async () => {
            set();
            document.dispatchEvent(number_change_event);
        });

        return this;
    }
}
