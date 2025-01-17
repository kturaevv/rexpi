struct BallData {
   position: vec4<f32>,
   velocity: vec4<f32>, 
   radius: f32,
}

@group(0) @binding(0) var<storage, read_write> balls: array<BallData>;

@compute @workgroup_size(32)
fn compute_main(@builtin(global_invocation_id) id: vec3<u32>) {
    if id.x >= arrayLength(&balls) { return; }
    let dt = 0.0016;
    let index = id.x;
    balls[index].position.x += balls[index].velocity.x * dt;
    balls[index].position.y += balls[index].velocity.y * dt;
}
