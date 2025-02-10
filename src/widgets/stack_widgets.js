import { generate_short_id } from "../utils.js";
import Widget from "./widget.js";
import Visibility from "./visibility.js";


export class StackedWidgets extends Widget {
    constructor(widgets = [], columns = 1, gap = 0) {
        super();
        this.id = generate_short_id() + "_stacked";
        this.gap = gap;
        this.columns = columns;
        this.widgets = widgets;
        this.visibility = new Visibility(this.id);
        this.register();
        this.insert_border();
    }

    has_child_widgets() {
        return true;
    }

    get_child_widgets() {
        return this.widgets;
    }

    get_value() {
        return this.widgets.map((widget) => widget.get_value());
    }

    register() {
        const sidebar = document.getElementById("sidebar");
        sidebar.insertAdjacentHTML("beforeend", `<div id=${this.id} class='grid grid-cols-${this.columns} gap-${this.gap}'></div>`);
        const stack_widget = document.getElementById(this.id);
        for (const widget of this.widgets) {
            stack_widget.appendChild(document.getElementById(widget.id));
        }
    }

    add(widget) {
        this.widgets.push(widget);
        this[widget.label.toLowerCase()] = widget;
        const stack_widget = document.getElementById(this.id);
        stack_widget.appendChild(document.getElementById(widget.id));
    }
}
