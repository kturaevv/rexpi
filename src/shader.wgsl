struct VertexOut {
    @builtin(position) pos: vec4f,  // CLIP space xyza
    @location(0) color: vec4f,      // rgba
}

@vertex
fn vs_main(
    @location(0) pos: vec4f,
    @location(1) color: vec4f,
) -> VertexOut {

    var data: VertexOut;
    data.pos = pos;
    data.color = color;
    return data;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4f {
    return in.color;
}
