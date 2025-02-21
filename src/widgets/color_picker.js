import { generate_short_id } from "../utils.js";
import Visibility from "./visibility.js";
import Widget from "./widget.js";

var COLOR_WIDGET_COUNT = 0;

export class ColorWidget extends Widget {
    constructor(label = "Text Widget", defaultval = [128, 128, 128, 1.0]) {
        super();

        COLOR_WIDGET_COUNT += 1;

        this.id = generate_short_id() + `_${COLOR_WIDGET_COUNT}`;

        this.red_slider = 'red_slider' + `_${this.id}`;
        this.green_slider = 'green_slider' + `_${this.id}`;
        this.blue_slider = 'blue_slider' + `_${this.id}`;
        this.alpha_slider = 'alpha_slider' + `_${this.id}`;

        this.red_value = 'red_value' + `_${this.id}`;
        this.green_value = 'green_value' + `_${this.id}`;
        this.blue_value = 'blue_value' + `_${this.id}`;
        this.alpha_value = 'alpha_value' + `_${this.id}`;

        this.color_preview = 'color_preview' + `_${this.id}`;

        this.label = label;
        this.value = null;
        this.event = this.label + this.id;
        this.start_values = defaultval;
        this.visibility = new Visibility(this.id);

        this.register();
    }

    get_color_picker_widget() {
        return `
        <!-- Color picker widget -->
        <div class="" id=${this.id}>
            <label class="w-20 text-gray-700 font-bold">${this.label}</label >
            
            <!-- Color Input Controls -->
            <div class="space-y-1">
                <!-- Red Input -->
                <div class="flex items-center">
                    <label for="red_slider" class="w-20 text-gray-700">Red:</label>
                    <input
                        type="range" min="0" max="255" value=${this.start_values[0]}
                        class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-neutral-600"
                        id=${this.red_slider}
                    />
                    <label for="alpha_slider" class="ml-2 w-12 text-right text-gray-600" id=${this.red_value}>1.0</label>
                </div>
                
                <!-- Green Input -->
                <div class="flex items-center">
                    <label for="green_slider" class="w-20 text-gray-700">Green:</label>
                    <input
                        type="range" min="0" max="255" value=${this.start_values[1]}
                        class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-neutral-600"
                        id=${this.green_slider}
                    />
                    <label for="alpha_slider" class="ml-2 w-12 text-right text-gray-600" id=${this.green_value}>1.0</label>
                </div>
                
                <!-- Blue Input -->
                <div class="flex items-center">
                    <label for="blue_slider" class="w-20 text-gray-700">Blue:</label>
                    <input
                        type="range" min="0" max="255" value=${this.start_values[2]}
                        class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-neutral-600"
                        id=${this.blue_slider}
                    />
                    <label for="alpha_slider" class="ml-2 w-12 text-right text-gray-600" id=${this.blue_value}>1.0</label>
                </div>
                
                <!-- Alpha Input -->
                <div class="flex items-center">
                    <label for="alpha_slider" class="w-20 text-gray-700">Alpha:</label>
                    <input
                        type="range" min="0" max="1" step="0.1" value=${this.start_values[3]}
                        class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-neutral-600"
                        id=${this.alpha_slider}
                    />
                    <label for="alpha_slider" class="ml-2 w-12 text-right text-gray-600" id=${this.alpha_value}>1.0</label>
                </div>
            </div>
            
            <!--Color _preview Box-->
            <div class="mt-2 h-4 rounded-lg border" id=${this.color_preview}></div>
        </div >
    `;
    }

    set_color(r, g, b, a) {
        if (r === null || g === null || b === null || a === null) {
            throw new Error("Color values cannot be null");
        }
        const red_value = document.getElementById(this.red_value);
        const green_value = document.getElementById(this.green_value);
        const blue_value = document.getElementById(this.blue_value);
        const alpha_value = document.getElementById(this.alpha_value);
        const color_preview = document.getElementById(this.color_preview);

        red_value.textContent = r;
        green_value.textContent = g;
        blue_value.textContent = b;
        alpha_value.textContent = parseFloat(a).toFixed(1);

        // Update color preview
        const rgbaColor = `rgba(${r}, ${g}, ${b}, ${a})`;
        color_preview.style.backgroundColor = rgbaColor;

        // Make data available for instance
        // bgra8unorm
        const colorArray = [
            parseInt(r) / 255,
            parseInt(g) / 255,
            parseInt(b) / 255,
            parseFloat(a)
        ];
        this.value = colorArray;
    }

    register() {
        // Custom event
        const color_change_event = new CustomEvent(this.event);

        // Insert widget into the DOM
        const sidebar = document.getElementById("sidebar");
        sidebar.insertAdjacentHTML("beforeend", this.get_color_picker_widget());

        // Get all required elements
        const red_slider = document.getElementById(this.red_slider);
        const green_slider = document.getElementById(this.green_slider);
        const blue_slider = document.getElementById(this.blue_slider);
        const alpha_slider = document.getElementById(this.alpha_slider);

        // Function to update color display
        const update_color = () => {
            const red = red_slider.value;
            const green = green_slider.value;
            const blue = blue_slider.value;
            const alpha = alpha_slider.value;

            // Update value displays
            this.set_color(red, green, blue, alpha);

            // Dispatch
            document.dispatchEvent(color_change_event);
        };

        // Add event listeners to all sliders
        red_slider.addEventListener('input', update_color);
        green_slider.addEventListener('input', update_color);
        blue_slider.addEventListener('input', update_color);
        alpha_slider.addEventListener('input', update_color);


        // Initialize color display
        update_color();

        return this;
    }

}

