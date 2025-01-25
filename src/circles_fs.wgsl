fn to_pixel_space(data: vec2<f32>) -> vec2<f32> {
    let out = vec2<f32>(
        (data.x / get_aspect() + 1.0) * 0.5 * config.viewport_size.x,
        abs(data.y - 1.0) * 0.5 * config.viewport_size.y,
    );
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let center = to_pixel_space(in.center);
    let pixel_to_center_distance = distance(center, in.pixel_pos.xy);

    if pixel_to_center_distance > in.radius * config.viewport_size.y * 0.5 {
        discard;
    }

    return config.color;
}

