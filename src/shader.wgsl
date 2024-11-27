struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) world_pos: vec4f,  // store original position
    @location(1) velocity: vec4f,
    @location(2) radius: f32,
};


@vertex
fn vs_main(
    @location(0) position: vec4f,
    @location(1) velocity: vec4f,
    @location(2) radius: f32,
) -> VertexOutput {
    var output: VertexOutput;
    output.world_pos = position;
    output.position = position;
    output.velocity = velocity;
    output.radius = radius;
    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
    let dist = length(input.world_pos.xy - input.position.xy);
    if dist > input.radius {
        discard;
    }
    return vec4f(1.0, 1.0, 0.0, 1.0);
}
