let canvas;
let gl;
let program;

const MIN_SPHERE_SUBDIVISIONS = 0;
const MAX_SPHERE_SUBDIVISIONS = 5;
let sphere_subdivisions = 0;

const MIN_LINE_SUBDIVISIONS = 0;
const MAX_LINE_SUBDIVISIONS = 8;
let line_subdivisions = 2;

let line_points = [];
let line_control_points = []

let position_attribute_location;

let is_playing = true;
let t = 0;
let t_speed = 0;
const MAX_SPEED = 0.005;

let lightPosition = vec4(5.0, 5.0, -5.0, 0.0);
let lightAmbient = vec4(1.0, 1.0, 1.0, 1.0);
let lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
let lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

let materialAmbient = vec4(1.0, 0.0, 0.0, 1.0);
let materialDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
let materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);
let materialShininess = 1000;

let modelViewMatrix, projectionMatrix;
let modelViewMatrixLoc, projectionMatrixLoc;

let sphere_vBuffer, sphere_normal_buffer, chaikin_vertex_buffer;
let line_start_location, line_end_location, progress_location;

let fovy = 105;
let eye = vec3(0.0, 0.0, 5.0);
let at = vec3(0.0, 0.0, 0.0);
let up = vec3(0.0, 1.0, 0.0);

const initial_vertices = [
    -0.5, -0.5, -0.5,
    0.5, -0.5, -0.5,
    0.5, 0.5, -0.5,
    -0.5, 0.5, -0.5,
    -0.5, -0.5, 0.5,
    0.5, -0.5, 0.5,
    0.5, 0.5, 0.5,
    -0.5, 0.5, 0.5
];
const initial_indices = [
    0, 1, 2, 0, 2, 3,  // Front face
    1, 5, 6, 1, 6, 2,  // Right face
    5, 4, 7, 5, 7, 6,  // Back face
    4, 0, 3, 4, 3, 7,  // Left face
    3, 2, 6, 3, 6, 7,  // Top face
    4, 5, 1, 4, 1, 0   // Bottom face
];

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function chaikin(vertices, iterations) {
    //no iterations return array
    if (iterations === 0) {
        return vertices;
    }

    let newVertices = [];

    for (let i = 0; i < vertices.length - 1; i++) {

        //get vertices
        let first_vertex = vertices[i];
        let second_vertex = vertices[i + 1];

        //make two new points
        //one that is 25% between first and second
        //one that is 75% between first and second
        let point_one = mix(first_vertex, second_vertex, 0.25);
        let point_two = mix(first_vertex, second_vertex, 0.75);

        //add the new points
        newVertices.push(point_one, point_two);
    }

    //repeat until no more iterations
    return chaikin(newVertices, iterations - 1);
}

function init() {
    canvas = document.getElementById("canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    window.addEventListener('keydown', on_key_down);
    window.addEventListener('keyup', on_key_up);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    //console.log(line_subdivisions + " " + sphere_subdivisions);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    line_start_location = gl.getUniformLocation(program, "u_line_start");
    line_end_location = gl.getUniformLocation(program, "u_line_end");
    progress_location = gl.getUniformLocation(program, "u_progress");

    view_init();
    lighting_init();

    sphere_init();
    chaikin_init();

    render();
}

function view_init() {
    modelViewMatrixLoc = gl.getUniformLocation(program, "u_model_view_matrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "u_projection_matrix");
}

function lighting_init() {
    let diffuseProduct = mult(lightDiffuse, materialDiffuse);
    let specularProduct = mult(lightSpecular, materialSpecular);
    let ambientProduct = mult(lightAmbient, materialAmbient);

    gl.uniform4fv(gl.getUniformLocation(program, "u_diffuse_product"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "u_specular_product"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "u_ambient_product"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "u_lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "u_shininess"), materialShininess);
}

function sphere_init() {
    sphere_vBuffer = gl.createBuffer();
    sphere_normal_buffer = gl.createBuffer();
}

function chaikin_init() {
    line_points = [];
    chaikin_vertex_buffer = gl.createBuffer();

    make_chaikin();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    line_control_points = [];

    //const sphere_info = subdivide_cube(sphere_subdivisions);
    const sphere_info = subdivide_cube(sphere_subdivisions);

    make_sphere(sphere_info);
    update_sphere_position();

    render_sphere(sphere_info);
    render_chaikin();

    requestAnimationFrame(render);
}

function subdivide_cube(sub_count) {
    const vertices = initial_vertices.slice();
    let indices = initial_indices.slice();
    let normals = [];

    //subdivide
    for (let level = 0; level < sub_count; level++) {
        const newVertices = [];
        const newIndices = [];
        const vertexCache = {};

        function getSubdividedVertex(v1, v2) {
            const cacheKey = `${v1}_${v2}`;
            if (vertexCache[cacheKey]) {
                return vertexCache[cacheKey];
            }

            const index1 = v1 * 3;
            const index2 = v2 * 3;
            const v1Pos = vertices.slice(index1, index1 + 3);
            const v2Pos = vertices.slice(index2, index2 + 3);

            const newVertex = [
                (v1Pos[0] + v2Pos[0]) / 2,
                (v1Pos[1] + v2Pos[1]) / 2,
                (v1Pos[2] + v2Pos[2]) / 2
            ];

            const newIndex = vertices.length / 3;
            vertices.push(...newVertex);
            vertexCache[cacheKey] = newIndex;
            return newIndex;
        }

        for (let i = 0; i < indices.length; i += 3) {
            const v1 = indices[i];
            const v2 = indices[i + 1];
            const v3 = indices[i + 2];

            const mid1 = getSubdividedVertex(v1, v2);
            const mid2 = getSubdividedVertex(v2, v3);
            const mid3 = getSubdividedVertex(v3, v1);

            newIndices.push(
                v1, mid1, mid3,
                mid1, v2, mid2,
                mid1, mid2, mid3,
                mid3, mid2, v3
            );
        }
        indices = newIndices;
    }

    //normalize
    for (let i = 0; i < vertices.length; i += 3) {
        const vertex = vertices.slice(i, i + 3);
        const length = Math.sqrt(vertex[0] ** 2 + vertex[1] ** 2 + vertex[2] ** 2);
        vertices[i] /= length;
        vertices[i + 1] /= length;
        vertices[i + 2] /= length;
    }

    //face normals
    for (let i = 0; i < indices.length; i += 3) {
        const v1 = indices[i] * 3;
        const v2 = indices[i + 1] * 3;
        const v3 = indices[i + 2] * 3;

        const p1 = vertices.slice(v1, v1 + 3);
        const p2 = vertices.slice(v2, v2 + 3);
        const p3 = vertices.slice(v3, v3 + 3);

        const u = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
        const v = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];

        const normal = [
            u[1] * v[2] - u[2] * v[1],
            u[2] * v[0] - u[0] * v[2],
            u[0] * v[1] - u[1] * v[0]
        ];

        const length = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);
        normal[0] /= length;
        normal[1] /= length;
        normal[2] /= length;

        normals.push(...normal, ...normal, ...normal);
    }

    return {
        sub_vertices: vertices,
        sub_indices: indices,
        sub_normals: normals
    }
}

function make_sphere(sphere_info) {
    // Create the vertex buffer
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphere_info.sub_vertices), gl.STATIC_DRAW);

    // Create the index buffer
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sphere_info.sub_indices), gl.STATIC_DRAW);

    position_attribute_location = gl.getAttribLocation(program, "a_Position");
    gl.enableVertexAttribArray(position_attribute_location);
    gl.vertexAttribPointer(position_attribute_location, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, sphere_normal_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphere_info.sub_normals), gl.STATIC_DRAW);

    let normal_attribute_location = gl.getAttribLocation(program, "a_Normal");
    gl.enableVertexAttribArray(normal_attribute_location);
    gl.vertexAttribPointer(normal_attribute_location, 4, gl.FLOAT, false, 0, 0);
}

function render_sphere(sphere_info) {
    let move_sphere_location = gl.getUniformLocation(program, "is_sphere");
    gl.uniform1i(move_sphere_location, 1);

    modelViewMatrix = lookAt(eye, at, up);
    projectionMatrix = perspective(fovy, 1, -1, 1);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    gl.drawElements(gl.TRIANGLES, sphere_info.sub_indices.length, gl.UNSIGNED_SHORT, 0);
}

function make_chaikin() {
    let size = 5.0;

    //top arc
    line_control_points.push(vec4(size, 0.0, 0.0));
    line_control_points.push(vec4(0.0, size, 0.0));
    line_control_points.push(vec4(-size, 0.0, 0.0));

    //bot arc
    line_control_points.push(vec4(size, 0.0, 0.0));
    line_control_points.push(vec4(0.0, -size, 0.0));
    line_control_points.push(vec4(-size, 0.0, 0.0));

    line_points = chaikin(line_control_points, line_subdivisions);
}

function render_chaikin() {
    let move_chaikin_location = gl.getUniformLocation(program, "is_sphere");
    gl.uniform1i(move_chaikin_location, 0);

    //let chaikin_position_matrix = rotateX(0);
    let chaikin_position_matrix = mat4();

    let chaikin_location = gl.getUniformLocation(program, "u_chaikin_position_matrix");
    gl.uniformMatrix4fv(chaikin_location, false, flatten(chaikin_position_matrix))

    gl.bindBuffer(gl.ARRAY_BUFFER, chaikin_vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(line_points), gl.STATIC_DRAW);

    gl.vertexAttribPointer(position_attribute_location, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(position_attribute_location);

    gl.drawArrays(gl.LINE_STRIP, 0, line_points.length);
}

function update_sphere_position() {
    if (is_playing) {
        t += t_speed * 1 / line_points.length;

        if (t < 1) {
            const t_index = Math.floor(t * (line_points.length - 1));
            const progress = (t * (line_points.length - 1)) % 1;

            const start = line_points[t_index];
            const end = line_points[t_index + 1];

            gl.uniform1f(progress_location, progress);

            gl.uniform3fv(line_start_location, [start[0], start[1], start[2]]);
            gl.uniform3fv(line_end_location, [end[0], end[1], end[2]]);
        } else {
            t = 0;
        }
    }
}

function on_key_up(event) {
    const key = event.key;
    if (key === 'a') {
        t_speed = 0;
    }
}

function on_key_down(event) {
    const key = event.key;
    if (key === 'q') {
        sphere_subdivision_down();
    } else if (key === 'e') {
        sphere_subdivision_up();
    } else if (key === 'i') {
        line_subdivision_up();
    } else if (key === 'j') {
        line_subdivision_down();
    } else if (key === 'a') {
        t_speed = MAX_SPEED;
    }
}

function clamp_line_subdivisions() {
    return clamp(line_subdivisions, MIN_LINE_SUBDIVISIONS, MAX_LINE_SUBDIVISIONS);
}

function clamp_sphere_subdivision() {
    return clamp(sphere_subdivisions, MIN_SPHERE_SUBDIVISIONS, MAX_SPHERE_SUBDIVISIONS);
}

function sphere_subdivision_down() {
    sphere_subdivisions--;
    sphere_subdivisions = clamp_sphere_subdivision();

    init();
}

function sphere_subdivision_up() {
    sphere_subdivisions++;
    sphere_subdivisions = clamp_sphere_subdivision();

    init();
}

function line_subdivision_up() {
    line_subdivisions++;
    line_subdivisions = clamp_line_subdivisions();

    init();
}

function line_subdivision_down() {
    line_subdivisions--;
    line_subdivisions = clamp_line_subdivisions();

    init();
}