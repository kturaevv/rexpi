struct BallData {
   position: vec4<f32>,
   velocity: vec4<f32>, 
   radius: f32,
}

@group(0) @binding(0) var<storage, read_write> position: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> velocity: array<vec4<f32>>;

@compute @workgroup_size(32)
fn compute_main(@builtin(global_invocation_id) id: vec3<u32>) {
    if id.x >= arrayLength(&position) { return; }
    let dt = 0.0016;
    let index = id.x;
    position[index].x += velocity[index].x * dt;
    position[index].y += velocity[index].y * dt;
}
