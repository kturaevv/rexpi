import { quat, mat4, vec3, vec2 } from "gl-matrix";
import Renderer from "./renderer.js";
import Buffers from "./buffers.js";
import make_ascii_sprite_sheet from "./bitmap_font.js";


const shader_code = `
struct Config { 
    dims: vec2f, 
    padding: vec2f, 
    margins: vec2f,
    scale: f32, 
    debug: u32
};
struct VertexOut { @builtin(position) pos: vec4f };

@group(0) @binding(0) var<uniform> config: Config;
@group(0) @binding(1) var<uniform> bg_color: vec4<f32>;
@group(0) @binding(2) var<storage, read> text: array<u32>;
@group(0) @binding(3) var font_sampler: sampler;
@group(0) @binding(4) var font_texture: texture_2d<f32>;

const QUAD = array<vec4<f32>, 4>(
    vec4(-1.0,  1.0, 0.0, 1.0),
    vec4( 1.0,  1.0, 0.0, 1.0),
    vec4(-1.0, -1.0, 0.0, 1.0),
    vec4( 1.0, -1.0, 0.0, 1.0),
);

const INDICES = array<u32, 6>(0, 1, 2, 2, 1, 3);

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VertexOut {
    var out: VertexOut;
    out.pos = QUAD[INDICES[vi]];
    return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4f {
    let SPRITE_DIMS = vec2(5f, 8f) * f32(config.scale);
    let ELEMENT_DIMS = SPRITE_DIMS + config.padding * f32(config.scale);
    let MARGIN_DIMS = config.margins * f32(config.scale);

    let screen_pos = in.pos.xy - MARGIN_DIMS;
    let is_margin = any(
        any(in.pos.xy < MARGIN_DIMS) ||
        any((in.pos.xy + MARGIN_DIMS) > config.dims)
    );

    // Chars are packed into f32 array thus we need to x4 to get actual size
    let char_count = f32(arrayLength(&text)) * 4f;

    // Compute to which char_ix sprite belongs to 
    let element_pos = floor(screen_pos / ELEMENT_DIMS);
    let line_capacity = floor((config.dims.x - 2 * MARGIN_DIMS.x) / ELEMENT_DIMS.x); 

    // Text array is f32 but char_ix is u8
    let char_ix = element_pos.y * line_capacity + element_pos.x;
    let char_maj = u32(floor(char_ix / 4f));
    let char_min = u32(fract(char_ix / 4f) * 4f);
    let char_byte = unpack4x8unorm(text[char_maj])[char_min] * 255;

    let is_out_of_bounds = f32(char_ix) > char_count; 
    let is_special_char = char_byte < 33;
    let is_sprite_clipped = floor((element_pos.x + 1) * ELEMENT_DIMS.x) > (config.dims.x - 2 * MARGIN_DIMS.x);

    let inner_pos = fract(screen_pos / ELEMENT_DIMS);

    // Check padding and remap element to sprite pos in range 0..1
    let element_sprite_ratio = ELEMENT_DIMS / SPRITE_DIMS;
    let is_padding = any(inner_pos >= (vec2(1f, 1f) / element_sprite_ratio));

    let sprite_pos = inner_pos * element_sprite_ratio;

    // If atlas has N sprites of height H then current is cur / N 
    // Range over atlas [h * byte..h * (byte + 1)] will query y-axis
    let uv = vec2(
        sprite_pos.x,
        (char_byte / 128.0) + (sprite_pos.y * (1.0 / 128.0)),
    );
    let texture = textureSample(font_texture, font_sampler, uv);
    let text_color = vec4f(0f, 0f, 0f, texture.r); 
    let text_bg_mix = mix(bg_color, text_color, text_color.a);
    
    let is_bg = 
        is_margin || \
        is_padding || \
        is_special_char || \
        is_sprite_clipped || \
        is_out_of_bounds; 
    let text_result = select(text_bg_mix, bg_color, is_bg);

    // Debug values
    let bl = vec4f(0f);
    let wh = vec4f(1f);
    let r = vec4f(1f, 0f, 0f, 1f);
    let g = vec4f(0f, 1f, 0f, 1f);
    let b = vec4f(0f, 0f, 1f, 1f);
    let pos_norm = vec4f(screen_pos.xy / config.dims, 0.0, 1.0);

    var debug = mix(bl, g, f32(is_margin));
    debug = mix(debug, wh, f32((is_padding || is_out_of_bounds) && !is_margin));
    debug = mix(debug, b, f32(is_sprite_clipped && !is_margin && !is_out_of_bounds));
    debug = mix(debug, pos_norm, f32(!is_bg));

    return select(text_result, debug, bool(config.debug));
}
`

export default class TextRenderer extends Renderer {
    /**
     * @param {GPUDevice} device
     * @param {GPUCanvasContext} context
     **/
    constructor(device, context, gui) {
        super();

        this.gui = gui;
        this.device = device;
        this.context = context;

        this.buffers = new Buffers(device, 'Text');

        let TEXT = "\tThis text is rendered on a GPU!\nAdded padding, so this shit is readible :)";

        const get_text = () => {
            return preprocess(TEXT, ...get_config());
        };

        const get_config = () =>
            new Float32Array(
                [
                    context.canvas.width, context.canvas.height,
                    this.gui.config.px.value, this.gui.config.py.value,
                    this.gui.config.mx.value, this.gui.config.my.value,
                    this.gui.config.scale.value, this.gui.debug.value,
                ]
            );
        const get_bg_color = () => new Float32Array(this.gui.bg.value);
        const update_text_buf = () => {
            this.device.queue.writeBuffer(this.text_buf, 0, get_text());
        }

        this.config = this.buffers.create_buffer(get_config(), GPUBufferUsage.UNIFORM, 'Config');
        this.bg_color = this.buffers.create_buffer(get_bg_color(), GPUBufferUsage.UNIFORM, 'Background');

        document.addEventListener('canvas_resize', () => {
            this.device.queue.writeBuffer(this.config, 0, get_config());
            update_text_buf();
        });
        document.addEventListener(this.gui.debug.event, () => {
            this.device.queue.writeBuffer(this.config, 0, get_config());
            update_text_buf();
        });
        document.addEventListener(this.gui.config.scale.event, () => {
            this.device.queue.writeBuffer(this.config, 0, get_config());
            update_text_buf();
        });
        document.addEventListener(this.gui.config.px.event, () => {
            this.device.queue.writeBuffer(this.config, 0, get_config());
            update_text_buf();
        });
        document.addEventListener(this.gui.config.py.event, () => {
            this.device.queue.writeBuffer(this.config, 0, get_config());
            update_text_buf();
        });
        document.addEventListener(this.gui.config.mx.event, () => {
            this.device.queue.writeBuffer(this.config, 0, get_config());
            update_text_buf();
        });
        document.addEventListener(this.gui.config.my.event, () => {
            this.device.queue.writeBuffer(this.config, 0, get_config());
            update_text_buf();
        });
        document.addEventListener(this.gui.bg.event, () => {
            this.device.queue.writeBuffer(this.bg_color, 0, get_bg_color());
            update_text_buf();
        });

        { // Texture
            const sprite_sheet = make_ascii_sprite_sheet(0, 128);

            this.sampler = this.device.createSampler({
                label: 'TextSampler',
                magFilter: 'nearest',
                minFilter: 'nearest',
            });
            this.ascii_atlas_texture = this.device.createTexture({
                label: "ASCII atlas",
                size: { width: sprite_sheet.sprite_width, height: sprite_sheet.sprite_height * 128 },
                format: 'r8unorm',
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
            });

            this.device.queue.writeTexture(
                { texture: this.ascii_atlas_texture },
                sprite_sheet.sprite_data,
                { bytesPerRow: sprite_sheet.sprite_width },
                { width: sprite_sheet.sprite_width, height: sprite_sheet.sprite_height * 128 }
            );
        }

        this.text_buf = this.buffers.create_buffer(get_text(), GPUBufferUsage.STORAGE);
        this.buffers.update_bind_group(this.sampler);
        this.buffers.update_bind_group(this.ascii_atlas_texture.createView());

        this.shader = device.createShaderModule({
            label: "TextRenderShader",
            code: shader_code,
        });

        this.pipeline = device.createRenderPipeline({
            label: "TextRenderPipeline",
            layout: 'auto',
            vertex: {
                module: this.shader,
                entryPoint: 'vs_main',
            },
            fragment: {
                module: this.shader,
                entryPoint: 'fs_main',
                targets: [{
                    format: "rgba8unorm",
                }]
            },
            primitive: { topology: "triangle-list" },
        });
        this.bind_group = this.buffers.get_bind_group(this.pipeline);

        this.render_callback = () => {
            const command_encoder = device.createCommandEncoder({ label: "TextCommandEncoder" });

            const pass = command_encoder.beginRenderPass({
                label: "TextRenderPass",
                colorAttachments: [{
                    view: context.getCurrentTexture().createView(),
                    clearValue: [1.0, 1.0, 1.0, 1.0],
                    loadOp: 'clear',
                    storeOp: 'store'
                }],
            });

            pass.setPipeline(this.pipeline);
            pass.setBindGroup(0, this.bind_group);
            pass.draw(6);
            pass.end();

            device.queue.submit([command_encoder.finish()]);
            requestAnimationFrame(this.render_callback);
        };
    }
}

let preprocess = (
    txt,
    width,
    _height,
    px,
    _py,
    mx,
    _my,
    font_size
) => {
    // Simple pre-processing, just swap special. chars with ' ' spaces 
    const floor = (v) => Math.floor(v);
    let out = new Uint8Array(txt.length * 4);
    let sprite_w = 5;
    let element_size = (sprite_w + px) * font_size;
    let line_capacity = floor((width - 2 * mx * font_size) / element_size);

    let i = 0;
    let edit = 0;
    for (; i < txt.length; i++) {
        if (txt[i] === '\t') {
            for (let j = 0; j < 4; j++) {
                out[edit++] = ' '.charCodeAt(0);
            }
        } else if (txt[i] === '\n') {
            let chars_remaining = line_capacity - edit % line_capacity;
            if (chars_remaining == line_capacity) continue;

            for (let j = 0; j < chars_remaining; j++) {
                out[edit++] = ' '.charCodeAt(0)
            }
        } else {
            out[edit++] = txt[i].charCodeAt(0);
        }
    }
    return out;
};

