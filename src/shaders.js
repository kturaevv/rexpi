const shaderFiles = [
    './particles_cs.wgsl',
    './particles_fs.wgsl',
    './particles_vs.wgsl',
];

let shaders = {};
for (const shader of shaderFiles) {
    const shaderName = shader.match(/[^/]*(?=\.wgsl)/)[0];
    shaders[shaderName] = await fetch(shader)
        .then((v) => v.text())
        .then((txt) => txt)
        .catch((e) =>
            console.log("Catched error while loading shader module!", e)
        );
}

export default shaders;
