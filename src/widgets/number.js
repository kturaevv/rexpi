import { generate_short_id } from "../utils.js";
import Visibility from "./visibility.js";
import Widget from "./widget.js";

var NUMBER_WIDGET_COUNT = 0;

export class NumberWidget extends Widget {
    constructor(label = "Number Widget", default_value) {
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

        this.register();
    }

    get_number_widget() {
        return `
            <!--Quantity Input Section -->
                <div class="m-1 p-2 border rounded-lg shadow-sm bg-white invisible" id=${this.id}>
                    <div class="flex items-center space-x-4">
                        <label class="w-20 text-gray-700 font-bold">${this.name}</label >
                        <input
                            type="number" min="1" max="100" value="${this.value}"
                            class="px-3 py-2 border rounded-lg w-24 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                            id=${this.input_name}
                        />
                        <div class="flex space-x-2">
                            <button id=${this.min_button} class="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors" > - </button>
                            <button id=${this.add_button} class="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors" > + </button>
                        </div>
                    </div >
                </div >
            `;
    }

    register() {
        const number_change_event = new CustomEvent(this.event);

        // Insert widget into the DOM
        const sidebar = document.getElementById("sidebar");
        sidebar.insertAdjacentHTML("beforeend", this.get_number_widget());

        // Get all required elements
        const number_input = document.getElementById(this.input_name);
        const add_button = document.getElementById(this.add_button);
        const min_button = document.getElementById(this.min_button);

        const increment = () => { number_input.value = parseInt(number_input.value) + 1; };
        const decrement = () => { number_input.value = parseInt(number_input.value) - 1; };

        add_button.addEventListener("click", async () => {
            increment();
            document.dispatchEvent(number_change_event);
        });

        min_button.addEventListener("click", async () => {
            decrement();
            document.dispatchEvent(number_change_event);
        });

        number_input.addEventListener("input", async () => {
            this.value = parseInt(number_input.value);
            document.dispatchEvent(number_change_event);
        });

        return this;
    }
}
