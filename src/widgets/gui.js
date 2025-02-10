import Widget from "./widget.js";

export default class GUI {
    constructor() {
        this.elements = [];
    }

    /**
     * @param {String} name
     * @param {Widget} widget
     * */
    add(name = null, widget) {
        this[name] = widget;
        this.elements.push([name, widget]);
        widget.insert_border();
    }

    /**
    * @returns {Array<Widget>}
    */
    widgets() {
        return this.elements.flatMap(([_, widget]) => widget.has_child_widgets() ? widget.get_child_widgets() : widget);
    }

    data() {
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
