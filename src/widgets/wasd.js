import { StackedWidgets } from "./stack_widgets.js";

export default function wasd_keys() {
    let wasd = new StackedWidgets([], 3, 1);
    wasd.add('-', ['key'], '');
    wasd.add('w', ['key'], 'W');
    wasd.add('-', ['key'], '');
    wasd.add('a', ['key'], 'A');
    wasd.add('s', ['key'], 'S');
    wasd.add('d', ['key'], 'D');
    return wasd;
}
