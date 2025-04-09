import { ButtonWidget } from "./button.js";
import { CheckboxWidget } from "./checkbox.js";
import { ColorWidget } from "./color_picker.js";
import { CursorWidget } from "./cursor.js";
import { KeyWidget } from "./keyboard.js";
import { NumberWidget } from "./number.js";
import { SliderWidget } from "./slider.js";
import { WidgetT } from "./types.js";

export default function make_widget(name, input, label) {
    label = label === undefined ? name : label;
    const type = Array.isArray(input) ? 'array' : typeof input;
    switch (type) {
        case 'object':
            return input;
        case 'boolean':
            return new CheckboxWidget(label, input);
        case 'number':
            return new NumberWidget(label, input);
        case 'array':
            switch (input.length) {
                case 3:
                    return new NumberWidget(label, ...input);
                case 4:
                    return new SliderWidget(label, ...input);
                default:
                    switch (typeof input[0]) {
                        case 'string':
                            switch (input[0]) {
                                case WidgetT.RGBA:
                                    return new ColorWidget(label, input.slice(1));
                                case WidgetT.CURSOR:
                                    return new CursorWidget(label);
                                case WidgetT.KEY:
                                    return new KeyWidget(label, ...input.slice(1));
                                case WidgetT.BTN:
                                    return new ButtonWidget(label, ...input.slice(1));
                                default:
                                    throw new Error(`Invalid special case input! ${input}`);
                            }
                        default:
                            throw new Error(`Invalid input array! ${input}`);
                    }
            }
    }
}

