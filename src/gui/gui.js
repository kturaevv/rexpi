import { assert } from "../utils.js";
import make_widget from "./make.js";
import Widget from "./widget.js";

/**
 * @class GUI
 * @property {Array<[string, Widget]>} elements
 * @property {Widget} [*] - any property added is a widget
 * */
export default class GUI {

    constructor() {
        this.elements = [];
    }

    /**
     * @param {String} name
     * */
    add(name, input, label) {
        assert(name !== undefined, 'Widget [name] is undefined!', name);

        let widget = make_widget(name, input, label);

        this[name] = widget;
        this.elements.push([name, widget]);
        widget.insert_border();
    }

    /**
    * @returns {Array<Widget>}
    */
    widgets() {
        return this.elements.flatMap(
            ([_, widget]) => widget.has_child_widgets() ? widget.get_child_widgets() : widget
        );
    }

    data() {
        // Return an object with values from all widgets { widget_name: widget_data }
        return this.elements.reduce((accumulator, [name, widget]) => {
            accumulator[name] = widget.get_value();
            return accumulator;
        }, {});
    }

    make_visible() {
        for (const widget of this.widgets()) {
            widget.visibility.on();
        }
    }

    make_invisible() {
        for (const widget of this.widgets()) {
            widget.visibility.off();
        }
    }
}
