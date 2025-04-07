import { generate_short_id } from "../utils.js";
import Widget from "./widget.js";
import Visibility from "./visibility.js";
import make_widget from "./make.js";


export class StackedWidgets extends Widget {
    constructor(widgets = [], columns = 1, gap = 1) {
        super();
        this.id = generate_short_id() + "_stacked";
        this.gap = gap;
        this.columns = columns;
        this.widgets = widgets;
        this.visibility = new Visibility(this.id);
        this.insert();
        this.insert_border();
    }

    has_child_widgets() {
        return true;
    }

    get_child_widgets() {
        return [this, ...this.widgets];
    }

    get_value() {
        return this.widgets.map((widget) => widget.get_value());
    }

    insert() {
        const sidebar = document.getElementById("sidebar");
        sidebar.insertAdjacentHTML(
            "beforeend",
            `
            <div class="flex w-full justify-center">
                <div class='grid grid-cols-${this.columns} gap-${this.gap} w-fit' id=${this.id}></div>
            </div>`
        );
        const stack_widget = document.getElementById(this.id);
        for (const widget of this.widgets) {
            stack_widget.appendChild(document.getElementById(widget.id));
        }
    }

    add(name, input, label) {
        let widget = make_widget(name, input, label);
        this.widgets.push(widget);
        this[name] = widget;
        document.getElementById(this.id).appendChild(document.getElementById(widget.id));
    }
}
