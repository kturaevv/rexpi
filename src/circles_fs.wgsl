fn clip_to_pixel_space(data: vec2<f32>) -> vec2<f32> {
    let out = vec2<f32>(
        0.5 * config.viewport_size.x * (1.0 + data.x / get_aspect()),
        0.5 * config.viewport_size.y * (1.0 - data.y)
    );
    return out;
}

fn pixel_to_world(data: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(
        data.x / config.viewport_size.x * 2 - 1.0,
        data.y / config.viewport_size.y * 2 - 1.0,
    );
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let center = clip_to_pixel_space(in.center);
    let pixel_to_center_distance = distance(center, in.pixel_pos.xy);
    let scaled_radius = in.radius * config.viewport_size.y * 0.5;

    if pixel_to_center_distance > scaled_radius {
        discard;
    }

    var color = config.color;

    if distance(cursor_position.pos, center) <= scaled_radius && pixel_to_center_distance >= scaled_radius * 0.99 {
        return vec4(1.0, 0.0, 0.0, 1.0);
    }


    return color;
}

