import Widget from "./widget.js";

export default class CursorWidget extends Widget {
    constructor(label = "Mouse") {
        super();
        this.event = this.id + label;
        this.value = { curr: { x: null, y: null }, is_dragging: false, prev: { x: null, y: null } };
        this._tag = `
        <div 
            id="${this.id}" 
            class=" absolute bg-neutral-700 text-black font-mono font-thin text-sm z-[1000] rounded-lg">
        </div>
        `;
        this._cursor = `
        <div 
            id="${this.id}_cursor" 
            class="fixed w-1.5 h-1.5 bg-black rounded-full transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
        ></div>
        `;
        this.setup();
    }

    setup() {
        document.body.insertAdjacentHTML('beforeend', this._tag);
        document.body.insertAdjacentHTML('beforeend', this._cursor);

        const event = new CustomEvent(this.event);
        const canvas = document.getElementById('canvas');
        const cursor = document.getElementById(this.id + '_cursor');
        const out = document.getElementById(this.id);
        out.style.display = 'none';

        const get_mouse_pos = (canvas, evt) => {
            const rect = canvas.getBoundingClientRect();
            const scale_x = canvas.width / rect.width;
            const scale_y = canvas.height / rect.height;
            return {
                x: Math.floor((evt.clientX - rect.left) * scale_x),
                y: Math.floor((evt.clientY - rect.top) * scale_y)
            };
        };

        const self = this;

        canvas.addEventListener('mousemove', (e) => {
            self.value.prev = { ...self.value.curr };
            self.value.curr = get_mouse_pos(canvas, e);
            // out.textContent = `x: ${this.value.x}, y: ${this.value.y}`;
            // out.style.left = (e.clientX) + 'px';
            // out.style.top = (e.clientY - 45) + 'px';
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
            document.dispatchEvent(event);
        });

        canvas.addEventListener('click', (e) => {
            document.dispatchEvent(event);
        });

        canvas.addEventListener('mousedown', (e) => {
            self.value.is_dragging = true;
            document.dispatchEvent(event);
        });

        canvas.addEventListener('mouseup', (e) => {
            self.value.is_dragging = false;
            document.dispatchEvent(event);
        });

        canvas.addEventListener('mouseout', () => {
            self.value.is_dragging = false;
            cursor.classList.add('hidden');
        });

        canvas.addEventListener('mouseleave', () => {
            self.value.is_dragging = false;
        });

        canvas.addEventListener('mouseover', () => {
            if (out.classList.contains('hidden')) return;
            cursor.classList.remove('hidden');
        });
    }
}
