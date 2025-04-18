import { quat, mat4, vec3, vec2 } from "gl-matrix";
import Renderer from "./renderer.js";
import Buffers from "./buffers.js";
import GUI from "./gui/gui.js";
import wasd_keys from "./gui/wasd.js";

const shader_code = `
struct Settings { fov: f32, near: f32, far: f32, show_axis: u32}

struct Cursor {
    curr: vec2<f32>,
    is_dragging: u32,
}

@group(0) @binding(0) var<uniform> inverse_view_matrix: mat4x4<f32>;
@group(0) @binding(1) var<uniform> camera_position: vec3<f32>;
@group(0) @binding(2) var<uniform> cursor_position: Cursor;
@group(0) @binding(3) var<uniform> settings: Settings;

const V = array<vec4<f32>, 4>(
    vec4(-1.0,  1.0, 0.0, 1.0),
    vec4( 1.0,  1.0, 0.0, 1.0),
    vec4(-1.0, -1.0, 0.0, 1.0),
    vec4( 1.0, -1.0, 0.0, 1.0),
);
const INDICES = array<u32, 6>(
    0, 1, 2,
    2, 1, 3,
);

struct VertexOut {
    @builtin(position) pos: vec4<f32>,
    @location(0) near_point: vec3<f32>,
    @location(1) far_point: vec3<f32>,
}

fn unproject_point(clip_pos: vec3<f32>) -> vec3<f32> {
    let world_pos = inverse_view_matrix * vec4(clip_pos, 1.0);
    return world_pos.xyz / world_pos.w;
}

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VertexOut {
    let clip_quad = V[INDICES[vi]];

    let near_point = unproject_point(vec3(clip_quad.xy, 0.0));
    let far_point  = unproject_point(vec3(clip_quad.xy, 1.0));
    
    var out: VertexOut;
    out.pos = clip_quad;
    out.near_point = near_point;
    out.far_point = far_point;
    return out;
}

fn make_grid(frag_coord: vec3<f32>, scale: f32, show_axis: u32) -> vec4<f32> {
    let coord = frag_coord.xz * scale;
    let derivative = fwidth(coord);

    let grid = abs(fract(coord + 0.5) - 0.5) / derivative;

    var color = vec4(0.2, 0.2, 0.2, 1.0);
    color.w = 1.0 - min(min(grid.x, grid.y), 1.0); 

    let minx = min(derivative.x, 1.0);
    let minz = min(derivative.y, 1.0);

    if (bool(show_axis)) {
        if (abs(frag_coord.x) < 0.1 * minx) { color.x = 1.0; color.w = 0.4; }
        if (abs(frag_coord.z) < 0.1 * minz) { color.z = 1.0; color.w = 0.4; }
    }

    return color;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
    let t = -in.near_point.y / (in.far_point.y - in.near_point.y);
    let frag_coord = (in.near_point + t * (in.far_point - in.near_point));

    let big_grid  = make_grid(frag_coord, 1.0, settings.show_axis);
    let smol_grid = make_grid(frag_coord, 5.0, settings.show_axis);

    var color = vec4(0.0, 0.0, 0.0, 1.0);
    color = (big_grid + smol_grid) * f32(t > 0);

    let norm = max(settings.near, min(settings.far, length(camera_position - frag_coord))) / settings.far;
    let fade = 1 - min(1.0, 1 - pow(2, -10 * norm));
    color *= fade;

    // Color cursor
    if (length(in.pos.xy - cursor_position.curr) <= 5) { color = vec4(1.0, 1.0, 1.0, 0.5); };
    if (length(in.pos.xy - cursor_position.curr) <= 7 && cursor_position.is_dragging != 0) { color = vec4(1.0, 1.0, 1.0, 0.5); };

    return color ;
}
`
export default class PlaneRenderer extends Renderer {
    /**
     * @param {GPUDevice} device
     * @param {GPUCanvasContext} context
     **/
    constructor(device, context) {
        super();

        this.gui = new GUI();
        this.gui.add('cursor', ['cursor']);
        this.gui.add('show_axis', true, "Show axis");
        this.gui.add('camera', wasd_keys());

        this.device = device;
        this.context = context;
        this.buffers = new Buffers(device, 'Plane');

        this.settings = {
            fov: 60 * Math.PI / 180,
            near_plane: 0.01,
            far_plane: 100.0,
            show_axis: this.gui.show_axis.value,
            buffer_view: function () {
                return new Float32Array([this.fov, this.near_plane, this.far_plane, this.show_axis]);
            }
        };

        this.cursor = new Float32Array([0.0, 0.0, 0, 0]);
        this.eye = new Float32Array([0, 0.0, -5.0]);
        this.look_at = vec3.fromValues(0, 0, 0);
        this.up = vec3.fromValues(0, 1, 0);

        vec3.rotateX(this.eye, this.eye, this.look_at, 15 * Math.PI / 180);
        vec3.rotateY(this.eye, this.eye, this.look_at, 45 * Math.PI / 180);

        this.create_view_projection();
        this.create_inverse_view_projection_buffer();

        this.camera_position_buffer = this.buffers.create_buffer(this.eye, GPUBufferUsage.UNIFORM);
        this.cursor_position_buffer = this.buffers.create_buffer(this.cursor, GPUBufferUsage.UNIFORM);
        this.settings_buffer = this.buffers.create_buffer(this.settings.buffer_view(), GPUBufferUsage.UNIFORM);

        const shader = device.createShaderModule({ code: shader_code });

        this.MULTISAMPLE_COUNT = 4;

        this.pipeline = device.createRenderPipeline({
            label: 'Plane',
            layout: 'auto',
            multisample: {
                count: this.MULTISAMPLE_COUNT,
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'none',
            },
            vertex: {
                module: shader,
                entryPoint: 'vs_main'
            },
            fragment: {
                module: shader,
                entryPoint: 'fs_main',
                targets: [{
                    format: "rgba8unorm",
                    blend: {
                        color: {
                            srcFactor: 'src-alpha',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add',
                        },
                        alpha: {
                            srcFactor: 'one',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add',
                        },
                    }
                }],
            },
        });

        let /** @type {GPUTexture} */ multisampling_texture;

        this.render_callback = () => {
            const enc = device.createCommandEncoder();
            const canvas_texture = this.context.getCurrentTexture();

            if (!multisampling_texture ||
                multisampling_texture.width / 2 != canvas_texture.width ||
                multisampling_texture.height / 2 != canvas_texture.height) {

                if (multisampling_texture) {
                    multisampling_texture.destroy();
                }

                multisampling_texture = device.createTexture({
                    label: "MSAA texture",
                    size: [canvas_texture.width, canvas_texture.height],
                    format: canvas_texture.format,
                    usage: GPUTextureUsage.RENDER_ATTACHMENT,
                    sampleCount: this.MULTISAMPLE_COUNT,
                });
            }

            const pass = enc.beginRenderPass({
                colorAttachments: [
                    {
                        clearValue: [0.0, 0.0, 0.0, 1.0],
                        loadOp: "clear",
                        storeOp: "store",
                        view: multisampling_texture.createView(),
                        resolveTarget: canvas_texture.createView(),
                    },
                ],
            });
            pass.setPipeline(this.pipeline);
            pass.setBindGroup(0, this.buffers.get_bind_group(this.pipeline));
            pass.draw(6);
            pass.end();
            device.queue.submit([enc.finish()]);
        }

        const move_camera_eye = (key_label) => {
            const key = key_label.toLowerCase();
            const move_by = 0.01;

            const direction = vec3.create();
            vec3.sub(direction, this.look_at, this.eye);
            vec3.scale(direction, direction, move_by);

            const move = (direction) => {
                vec3.add(this.eye, this.eye, direction);
                vec3.add(this.look_at, this.look_at, direction);
            }

            switch (key) {
                case 'w': break;
                case "s": vec3.negate(direction, direction); break;
                case "d": vec3.cross(direction, direction, this.up); break;
                case "a": vec3.cross(direction, this.up, direction); break;
            }

            move(direction);

            this.update_view_buffers();
        };

        const handle_drag = (v) => {
            this.cursor.set([v.curr.x, v.curr.y], 0);
            this.cursor.set([v.is_dragging ? 1 : 0], 2);
            device.queue.writeBuffer(this.cursor_position_buffer, 0, this.cursor)

            if (v.is_dragging === true) {
                const orbit_x = (v.curr.x - v.prev.x) * 0.005;
                const orbit_y = (v.curr.y - v.prev.y) * 0.005;

                // Vertical rotation
                vec3.rotateY(this.eye, this.eye, this.look_at, -orbit_x);

                // Horizontal rotation
                const direction = vec3.create();
                vec3.subtract(direction, this.look_at, this.eye);
                vec3.normalize(direction, direction); // Normalize to avoid scaling issues

                const right_axis = vec3.create();
                vec3.cross(right_axis, [0, 1, 0], direction);
                vec3.normalize(right_axis, right_axis); // Normalize right axis

                // Prevent extreme angles that cause flipping
                const angle = vec3.angle(direction, [0, 1, 0]);
                const new_angle = (angle + orbit_y) / Math.PI * 180;
                if (new_angle > 170 || new_angle < 10) {
                    return;
                }

                const rotation = mat4.create();
                mat4.fromRotation(rotation, orbit_y, right_axis);
                vec3.subtract(this.eye, this.eye, this.look_at);
                vec3.transformMat4(this.eye, this.eye, rotation);
                vec3.add(this.eye, this.eye, this.look_at);

                this.update_view_buffers();
            }
        };

        const update_settings = () => {
            this.settings.show_axis ^= true;
            device.queue.writeBuffer(this.settings_buffer, 0, this.settings.buffer_view());
        };

        document.addEventListener('canvas_resize', () => this.update_view_buffers());
        this.gui.show_axis.listen(() => update_settings());
        this.gui.cursor.listen(() => handle_drag(this.gui.cursor.value));
        this.gui.camera.w.listen(() => move_camera_eye(this.gui.camera.w.key));
        this.gui.camera.a.listen(() => move_camera_eye(this.gui.camera.a.key));
        this.gui.camera.s.listen(() => move_camera_eye(this.gui.camera.s.key));
        this.gui.camera.d.listen(() => move_camera_eye(this.gui.camera.d.key));
    }

    create_inverse_view_projection_buffer() {
        this.inv_vp_matrix = mat4.create();
        mat4.invert(this.inv_vp_matrix, this.view_proj_matrix);
        this.inv_view_projection_buffer = this.buffers.create_buffer(this.inv_vp_matrix, GPUBufferUsage.UNIFORM);
    }

    create_view_projection() {
        this.view_matrix = mat4.create();
        mat4.lookAt(this.view_matrix, this.eye, this.look_at, [0, 1, 0]);

        this.proj_matrix = mat4.create();
        mat4.perspective(
            this.proj_matrix,
            this.settings.fov,
            canvas.width / canvas.height,
            this.settings.near_plane,
            this.settings.far_plane
        );

        this.view_proj_matrix = mat4.create();
        mat4.multiply(this.view_proj_matrix, this.proj_matrix, this.view_matrix);

        this.inv_vp_matrix = mat4.create();
        mat4.invert(this.inv_vp_matrix, this.view_proj_matrix);
    }

    update_view_buffers() {
        this.create_view_projection();
        this.device.queue.writeBuffer(this.camera_position_buffer, 0, this.eye);
        this.device.queue.writeBuffer(this.inv_view_projection_buffer, 0, this.inv_vp_matrix);
    }
}
