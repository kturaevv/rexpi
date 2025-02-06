import { generate_short_id } from "../utils.js";
import Visibility from "./visibility.js";
import Widget from "./widget.js";

var SLIDER_WIDGET_COUNT = 0;

export class SliderWidget extends Widget {
    constructor(label = "Slider Widget", default_value = 0, min = 0, max = 1, step) {
        super();

        SLIDER_WIDGET_COUNT += 1;
        this.id = generate_short_id() + `_${SLIDER_WIDGET_COUNT}`;

        this.label = label;
        this.value = default_value;
        this.slider_tag = `tag_` + this.id;
        this.slider_value_tag = `value_tag_` + this.id;
        this.slider_min = min;
        this.slider_max = max;
        this.slider_step = step;
        this.event = this.label + this.id;

        this.visibility = new Visibility(this.id);

        this.register();
    }

    get_slider_widget() {
        return `    
        <div class="h-8 flex items-center" id=${this.id}>
            <label for="green_slider" class="w-20 text-gray-700 font-bold">${this.label}</label>
            <input
                type="range" min=${this.slider_min} max=${this.slider_max} value=${this.value} step=${this.slider_step}
                class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-neutral-600"
                id=${this.slider_tag}
            />
            <label for=${this.slider_tag} class="ml-2 w-12 text-right text-gray-600" id=${this.slider_value_tag}>${this.value}</label>
        </div>
        `;
    }

    register() {
        const slider_change_event = new CustomEvent(this.event);

        // Insert widget into the DOM
        const sidebar = document.getElementById("sidebar");
        sidebar.insertAdjacentHTML("beforeend", this.get_slider_widget());

        // Get all required elements
        const self = document.getElementById(this.id);
        console.log(self);
        const slider = document.getElementById(this.slider_tag);
        const slider_value = document.getElementById(this.slider_value_tag);

        slider.addEventListener("input", async (event) => {
            this.value = event.target.value;
            slider_value.textContent = this.value;
            document.dispatchEvent(slider_change_event);
        });

        return this;
    }
}
