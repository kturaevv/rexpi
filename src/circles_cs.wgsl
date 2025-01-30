@group(0) @binding(0) var<storage, read_write> position: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> velocity: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> radius: array<f32>;

@compute @workgroup_size(32)
fn compute_main(@builtin(global_invocation_id) id: vec3<u32>) {
    if id.x >= arrayLength(&position) { return; }
    let dt = 0.0016;
    let index = id.x;
    position[index].x += velocity[index].x * dt;
    position[index].y += velocity[index].y * dt;
}
