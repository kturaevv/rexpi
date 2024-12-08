import { generate_short_id } from "../utils.js";
import Visibility from "./visibility.js";

var COLOR_WIDGET_COUNT = 0;

export class ColorWidget {
    constructor(label = "Text Widget") {
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

        this.visibility = new Visibility(this.id);
        this.register();
    }

    get_color_picker_widget() {
        return `
        <!-- Color picker widget -->
        <div class="m-1 p-2 border rounded-lg shadow-sm bg-white invisible" id=${this.id}>
            <label class="w-20 text-gray-700 font-bold">${this.label}</label >
            
            <!-- Color Input Controls -->
            <div class="space-y-4">
                <!-- Red Input -->
                <div class="flex items-center">
                    <label for="red_slider" class="w-20 text-gray-700">Red:</label>
                    <input
                        type="range" min="0" max="255" value="128"
                        class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        id=${this.red_slider}
                    />
                    <label for="alpha_slider" class="ml-2 w-12 text-right text-gray-600" id=${this.red_value}>1.0</label>
                </div>
                
                <!-- Green Input -->
                <div class="flex items-center">
                    <label for="green_slider" class="w-20 text-gray-700">Green:</label>
                    <input
                        type="range" min="0" max="255" value="128"
                        class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        id=${this.green_slider}
                    />
                    <label for="alpha_slider" class="ml-2 w-12 text-right text-gray-600" id=${this.green_value}>1.0</label>
                </div>
                
                <!-- Blue Input -->
                <div class="flex items-center">
                    <label for="blue_slider" class="w-20 text-gray-700">Blue:</label>
                    <input
                        type="range" min="0" max="255" value="128"
                        class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        id=${this.blue_slider}
                    />
                    <label for="alpha_slider" class="ml-2 w-12 text-right text-gray-600" id=${this.blue_value}>1.0</label>
                </div>
                
                <!-- Alpha Input -->
                <div class="flex items-center">
                    <label for="alpha_slider" class="w-20 text-gray-700">Alpha:</label>
                    <input
                        type="range" min="0" max="1" step="0.1" value="1"
                        class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        id=${this.alpha_slider}
                    />
                    <label for="alpha_slider" class="ml-2 w-12 text-right text-gray-600" id=${this.alpha_value}>1.0</label>
                </div>
            </div>
            
            <!--Color _preview Box-->
            <div class="mt-4 p-2">
                <div class="h-4 rounded-lg border" id=${this.color_preview}></div>
            </div>
        </div >
    `;
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

        const red_value = document.getElementById(this.red_value);
        const green_value = document.getElementById(this.green_value);
        const blue_value = document.getElementById(this.blue_value);
        const alpha_value = document.getElementById(this.alpha_value);

        const color_preview = document.getElementById(this.color_preview);

        // Function to update color display
        const update_color = () => {
            const red = red_slider.value;
            const green = green_slider.value;
            const blue = blue_slider.value;
            const alpha = alpha_slider.value;

            // Update value displays
            red_value.textContent = red;
            green_value.textContent = green;
            blue_value.textContent = blue;
            alpha_value.textContent = parseFloat(alpha).toFixed(1);

            // Update color preview
            const rgbaColor = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
            color_preview.style.backgroundColor = rgbaColor;

            // Make data available for instance
            // bgra8unorm
            const colorArray = [
                parseInt(red) / 255,
                parseInt(green) / 255,
                parseInt(blue) / 255,
                parseFloat(alpha)
            ];
            this.value = colorArray;

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

