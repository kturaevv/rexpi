struct VertexOutput {
    @builtin(position) pixel_pos: vec4<f32>,
    @location(0) center: vec2<f32>,
    @location(1) radius: f32,
}

@group(0) @binding(0) var<uniform> VIEWPORT_SIZE: vec2<f32>;

fn get_aspect() -> f32 {
    return VIEWPORT_SIZE.x / VIEWPORT_SIZE.y;
}

@vertex
fn vs_main(
    @builtin(vertex_index) vertexIndex: u32,
    @location(0) position: vec4<f32>,
    @location(1) velocity: vec4<f32>,
    @location(2) radius: f32,
) -> VertexOutput {
    var out: VertexOutput;
    out.center.x = position.x * get_aspect();
    out.center.y = position.y;
    out.radius = radius;
    // r = (x/2)/sqrt3
    // x/2 = r*sqrt3
    // x = r*sqrt3*2 - side len
    // x = r*sqrt3   - half-side len
    let half_side = radius * sqrt(3);
    let vertex_center_edge = sqrt(pow(radius, 2) + pow(half_side, 2));
    var vertices = array<vec2<f32>, 3>(
        vec2(out.center.x, out.center.y + vertex_center_edge), // top
        vec2(out.center.x - half_side, out.center.y - radius), // bottom left
        vec2(out.center.x + half_side, out.center.y - radius), // bottom right
    );

    for (var i: i32 = 0; i < 3; i++) {
        vertices[i].x = vertices[i].x / get_aspect();
    }

    out.pixel_pos = vec4(vertices[vertexIndex], 0, 1.0);
    return out;
}
