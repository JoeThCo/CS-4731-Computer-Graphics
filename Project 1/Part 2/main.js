let canvas;
let gl;
let program;

let sphere_subdivisions = 2;
const MIN_SPHERE_SUBDIVISIONS = 1;
const MAX_SPHERE_SUBDIVISIONS = 4;

let line_subdivisions = 3;
const MIN_LINE_SUBDIVISIONS = 1;
const MAX_LINE_SUBDIVISIONS = 5;

let line_points = [];
let line_control_points = []

let position_attribute_location;
let index = 0;

let is_playing = true;
let t = 0;
let t_speed = 0.005;

let pointsArray = [];
let normalsArray = [];
let flatShadingArray = [];

let va = vec4(0.0, 0.0, -1.0, 1);
let vb = vec4(0.0, 0.942809, 0.333333, 1);
let vc = vec4(-0.816497, -0.471405, 0.333333, 1);
let vd = vec4(0.816497, -0.471405, 0.333333, 1);

let lightPosition = vec4(5.0, 5.0, -5.0, 0.0);
let lightAmbient = vec4(1.0, 1.0, 1.0, 0.5);
let lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
let lightSpecular = vec4(0.5, 0.5, 0.5, 1.0);

let materialAmbient = vec4(1.0, 0.0, 0.0, 1.0);
let materialDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
let materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);
let materialShininess = 20;

let modelViewMatrix, projectionMatrix;
let modelViewMatrixLoc, projectionMatrixLoc;

let sphere_vBuffer, sphere_vNormalBuffer, chaikin_vBuffer;
let line_start_location, line_end_location, progress_location;

let eye = vec3(0.0, 0.0, 5.0);
let at = vec3(0.0, 0.0, 0.0);
let up = vec3(0.0, 1.0, 0.0);

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function triangle(a, b, c) {
    pointsArray.push(a);
    pointsArray.push(b);
    pointsArray.push(c);

    flatShadingArray.push(a);
    flatShadingArray.push(a);
    flatShadingArray.push(a);

    // normals are vectors
    normalsArray.push(a[0], a[1], a[2], 0.0);
    normalsArray.push(a[0], a[1], a[2], 0.0);
    normalsArray.push(a[0], a[1], a[2], 0.0);

    index += 3;
}

function divideTriangle(a, b, c, count) {
    if (count > 0) {
        //makes new points on the half ways of the input values
        let ab = mix(a, b, 0.5);
        let ac = mix(a, c, 0.5);
        let bc = mix(b, c, 0.5);

        //normlize all the new points
        ab = normalize(ab, true);
        ac = normalize(ac, true);
        bc = normalize(bc, true);

        //make new triangles
        divideTriangle(a, ab, ac, count - 1);
        divideTriangle(ab, b, bc, count - 1);
        divideTriangle(bc, c, ac, count - 1);
        divideTriangle(ab, bc, ac, count - 1);
    } else {
        triangle(a, b, c);
    }
}

function tetrahedron(a, b, c, d, n) {
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
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

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    line_start_location = gl.getUniformLocation(program, "u_line_start");
    line_end_location = gl.getUniformLocation(program, "u_line_end");
    progress_location = gl.getUniformLocation(program, "u_progress");

    set_color();
    set_speed();

    sphere_init();
    chaikin_init();

    render();

    console.log("Init!")
}

function sphere_init() {
    sphere_vBuffer = gl.createBuffer();
    sphere_vNormalBuffer = gl.createBuffer();

    modelViewMatrixLoc = gl.getUniformLocation(program, "u_model_view_matrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "u_projection_matrix");

    let diffuseProduct = mult(lightDiffuse, materialDiffuse);
    let specularProduct = mult(lightSpecular, materialSpecular);
    let ambientProduct = mult(lightAmbient, materialAmbient);

    gl.uniform4fv(gl.getUniformLocation(program, "u_diffuse_product"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "u_specular_product"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "u_ambient_product"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "u_lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "u_shininess"), materialShininess);
}

function chaikin_init() {
    line_points = [];
    chaikin_vBuffer = gl.createBuffer();

    make_chaikin();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    pointsArray = [];
    normalsArray = [];
    flatShadingArray = [];
    line_control_points = [];

    make_sphere();
    update_sphere_position();

    render_sphere();
    render_chaikin();

    requestAnimationFrame(render);
}

function make_sphere() {
    tetrahedron(va, vb, vc, vd, sphere_subdivisions);

    gl.bindBuffer(gl.ARRAY_BUFFER, sphere_vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    position_attribute_location = gl.getAttribLocation(program, "a_Position");
    gl.vertexAttribPointer(position_attribute_location, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(position_attribute_location);

    gl.bindBuffer(gl.ARRAY_BUFFER, sphere_vNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    let vNormalPosition = gl.getAttribLocation(program, "a_Normal");
    gl.vertexAttribPointer(vNormalPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormalPosition);
}

function render_sphere() {
    let move_sphere_location = gl.getUniformLocation(program, "is_sphere");
    gl.uniform1i(move_sphere_location, 1);

    modelViewMatrix = lookAt(eye, at, up);
    projectionMatrix = perspective(110, 1, -1, 1);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    for (let i = 0; i < index; i += 3) {
        gl.drawArrays(gl.TRIANGLES, i, 3);
    }
}

function make_chaikin() {
    let size = 5.0;

    //top arc
    line_control_points.push(vec4(size, 0.0, 0.0, 1.0));
    line_control_points.push(vec4(0.0, size, 0.0, 1.0));
    line_control_points.push(vec4(-size, 0.0, 0.0, 1.0));

    //bot arc
    line_control_points.push(vec4(size, 0.0, 0.0, 1.0));
    line_control_points.push(vec4(0.0, -size, 0.0, 1.0));
    line_control_points.push(vec4(-size, 0.0, 0.0, 1.0));

    line_points = chaikin(line_control_points, line_subdivisions);
}

function render_chaikin() {
    let move_chaikin_location = gl.getUniformLocation(program, "is_sphere");
    gl.uniform1i(move_chaikin_location, 0);

    //let chaikin_position_matrix = rotateX(0);
    let chaikin_position_matrix = mat4();

    let chaikin_location = gl.getUniformLocation(program, "u_chaikin_position_matrix");
    gl.uniformMatrix4fv(chaikin_location, false, flatten(chaikin_position_matrix))

    gl.bindBuffer(gl.ARRAY_BUFFER, chaikin_vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(line_points), gl.STATIC_DRAW);

    gl.vertexAttribPointer(position_attribute_location, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(position_attribute_location);

    gl.drawArrays(gl.LINES, 0, line_points.length);
}

function update_sphere_position() {
    if (is_playing) {
        if (t < 1) {
            const t_index = Math.floor(t * (line_points.length - 1));
            const progress = (t * (line_points.length - 1)) % 1;

            const start = line_points[t_index];
            const end = line_points[t_index + 1];

            gl.uniform1f(progress_location, progress);

            gl.uniform3fv(line_start_location, [start[0], start[1], start[2]]);
            gl.uniform3fv(line_end_location, [end[0], end[1], end[2]]);

            t += t_speed;
        } else {
            t = 0;
        }
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
    }
}

function set_speed() {
    const speed_slider = document.getElementById("speed_slider");
    t_speed = parseFloat(speed_slider.value);
}

function set_color() {
    const red_slider = document.getElementById("red_slider");
    const green_slider = document.getElementById("green_slider");
    const blue_slider = document.getElementById("blue_slider");

    const r = parseFloat(red_slider.value);
    const g = parseFloat(green_slider.value);
    const b = parseFloat(blue_slider.value);

    materialAmbient = vec4(r, g, b, 1.0);
}

function on_paused_checked() {
    is_playing = !is_playing;
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