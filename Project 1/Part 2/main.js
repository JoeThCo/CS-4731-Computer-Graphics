let canvas;
let gl;
let program;

const WANT_DEBUG_INFO = false;

let sphere_subdivisions = 2;
const MIN_SPHERE_SUBDIVISIONS = 1;
const MAX_SPHERE_SUBDIVISIONS = 5;

let line_subdivisions = 4;
const MIN_LINE_SUBDIVISIONS = 1;
const MAX_LINE_SUBDIVISIONS = 7;

let line_points = [];
let line_control_points = []
let new_points = []

let position_attribute_location;
let index = 0;

let pointsArray = [];
let normalsArray = [];
let flatShadingArray = [];

let va = vec4(0.0, 0.0, -1.0, 1);
let vb = vec4(0.0, 0.942809, 0.333333, 1);
let vc = vec4(-0.816497, -0.471405, 0.333333, 1);
let vd = vec4(0.816497, -0.471405, 0.333333, 1);

let lightPosition = vec4(10.0, 10.0, 0.0, 0.0);
let lightAmbient = vec4(1.0, 1.0, 1.0, 0.5);
let lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
let lightSpecular = vec4(0.5, 0.5, 0.5, 1.0);

let materialAmbient = vec4(0.5, 0.5, 0.5, 1.0);
let materialDiffuse = vec4(0.5, 0.5, 0.5, 1.0);
let materialSpecular = vec4(0.1, 0.1, 0.1, 1.0);
let materialShininess = 15;

let modelViewMatrix, projectionMatrix;
let modelViewMatrixLoc, projectionMatrixLoc;

let eye;
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
    pointsArray = [];
    normalsArray = [];
    flatShadingArray = [];

    line_control_points = [];
    new_points = [];

    canvas = document.getElementById("canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    window.addEventListener('keydown', on_key_down);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    debug_info(WANT_DEBUG_INFO);

    make_sphere();
    render_sphere();

    make_chaikin();
    render_chaikin();
}

function debug_info(state)
{
    if(!state) return;
    console.log("SD: " + sphere_subdivisions + " | LD: " + line_subdivisions);
}

function make_sphere() {
    tetrahedron(va, vb, vc, vd, sphere_subdivisions);

    let vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    position_attribute_location = gl.getAttribLocation(program, "a_Position");
    gl.vertexAttribPointer(position_attribute_location, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(position_attribute_location);

    let vNormal = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vNormal);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    let vNormalPosition = gl.getAttribLocation(program, "a_Normal");
    gl.vertexAttribPointer(vNormalPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormalPosition);

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

function render_sphere() {
    eye = vec3(0.0, 0.0, 3.0);
    modelViewMatrix = lookAt(eye, at, up);

    // projectionMatrix = ortho(left, right, bottom, ytop, near, far);
    projectionMatrix = perspective(110, 1, -1, 1);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    for (let i = 0; i < index; i += 3) {
        gl.drawArrays(gl.TRIANGLES, i, 3);
    }
}

function make_chaikin() {
    //points go here

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

    let vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(line_points), gl.STATIC_DRAW);

    gl.vertexAttribPointer(position_attribute_location, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(position_attribute_location);
}

function render_chaikin() {
    gl.drawArrays(gl.LINES, 0, line_points.length);
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



