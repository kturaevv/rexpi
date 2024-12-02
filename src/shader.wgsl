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
    let vertex_center_edge = sqrt(3 * pow(radius, 2) + pow(half_side, 2));
    var vertices = array<vec2<f32>, 3>(
        vec2(out.center.x, out.center.y + vertex_center_edge), // top
        vec2(out.center.x - half_side, out.center.y - radius), // bottom left
        vec2(out.center.x + half_side, out.center.y - radius), // bottom right
    );

    for (var i: i32 = 0; i < 3; i++) {
        vertices[i].x = vertices[i].x / get_aspect();
    }

    out.pixel_pos = vec4(vertices[vertexIndex], position.z, 1.0);
    return out;
}

fn to_pixel_space(data: vec2<f32>) -> vec2<f32> {
    let out = vec2<f32>(
        (data.x / get_aspect() + 1.0) * 0.5 * VIEWPORT_SIZE.x,
        abs(data.y - 1.0) * 0.5 * VIEWPORT_SIZE.y,
    );
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let center = to_pixel_space(in.center);
    let pixel_to_center_distance = distance(center, in.pixel_pos.xy);

    if pixel_to_center_distance <= 1 {
        return vec4(0.0, 0.0, 0.0, 0.0);
    }

    if pixel_to_center_distance > in.radius * VIEWPORT_SIZE.y * 0.5 {
        return vec4(1.0, 0.0, 0.0, 1.0);
    }

    return vec4(0.0, 1.0, 0.0, 1.0);
}

