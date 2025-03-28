struct Config {
    color: vec4<f32>,
    viewport_size: vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> position: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> velocity: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> radius: array<f32>;
@group(0) @binding(3) var<uniform> config: Config;

@compute @workgroup_size(64)
fn compute_main(@builtin(global_invocation_id) id: vec3<u32>) {
    if id.x >= arrayLength(&position) { return; }

    let dt = 0.0016;
    let ix = id.x;
    let r = radius[ix];

    let pos = &position[ix];
    let vel = &velocity[ix];

    pos.x += vel.x * dt;
    pos.y += vel.y * dt;

    // Reverse velocity direction upon hitting canvas boundaries
    let boundary = 1f;
    if abs(pos.x) + r > boundary {vel.x = -vel.x;}
    if abs(pos.y) + r > boundary {vel.y = -vel.y;}
}
