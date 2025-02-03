import Renderer from "../renderer.js";
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
        this.elements.push([name, widget]);
    }

    /**
    * @returns {Array<Widget>}
    */
    widgets() {
        return this.elements.map(([_, widget]) => widget);
    }

    values() {
        return this.widgets().map((widget) => widget.get_value());
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
