let canvas;
let gl;
let program;

let line_points = [];

const MIN_LINE_SUB = 0;
const MAX_LINE_SUB = 8;
let line_subdivisions = MIN_LINE_SUB;

const MIN_SPHERE_SUB = 1;
const MAX_SPHERE_SUB = 5;

let sphere_subdivisions = 1;

let index = 0;
let t = 0;
let t_speed = .005;

let pointsArray = [];
let normalsArray = [];

let fovy = 100;
let near = -1;
let far = 1;

let va = vec4(0.0, 0.0, -1.0, 1);
let vb = vec4(0.0, 0.942809, 0.333333, 1);
let vc = vec4(-0.816497, -0.471405, 0.333333, 1);
let vd = vec4(0.816497, -0.471405, 0.333333, 1);

let lightPosition = vec4(-5.0, -5.0, -5.0, 0.0);
let lightAmbient = vec4(1.5, 1.0, 0.0, 1.0);
let lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
let lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

let materialAmbient = vec4(1.0, 1.0, 1.0, 1.0);
let materialDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
let materialSpecular = vec4(2.5, 2.5, 2.5, 1.0);
let materialShininess = 100.0;

let modelViewMatrix, projectionMatrix;
let modelViewMatrixLoc, projectionMatrixLoc;

let eye = vec3(0, 0, 2.5);
let at = vec3(0.0, 0.0, 0.0);
let up = vec3(0.0, 1.0, 0.0);

let is_playing = false;

const SIZE = 1.0;
const HALF_SIZE = SIZE * .5;

// Control vertices for line
let line_control_points = [
    vec2(SIZE + HALF_SIZE, HALF_SIZE),
    vec2(HALF_SIZE, HALF_SIZE),
    vec2(HALF_SIZE, HALF_SIZE + SIZE),

    vec2(HALF_SIZE - SIZE, HALF_SIZE + SIZE),
    vec2(HALF_SIZE - SIZE, HALF_SIZE),
    vec2(HALF_SIZE - SIZE * 2, HALF_SIZE),

    vec2(HALF_SIZE - SIZE * 2, -HALF_SIZE),
    vec2(HALF_SIZE - SIZE, -HALF_SIZE),
    vec2(HALF_SIZE - SIZE, -SIZE + -HALF_SIZE),

    vec2(HALF_SIZE, -SIZE + -HALF_SIZE),
    vec2(HALF_SIZE, -HALF_SIZE),
    vec2(HALF_SIZE + SIZE, -HALF_SIZE),

    vec2(SIZE + HALF_SIZE, HALF_SIZE),
    vec2(SIZE + HALF_SIZE * .25, HALF_SIZE),
];

// Control vertices for line
function chaikin(vertices, iterations) {
    if (iterations === 0) {
        return vertices;
    }

    let newVertices = [];

    for (let i = 0; i < vertices.length - 1; i++) {
        let v0 = vertices[i];
        let v1 = vertices[i + 1];

        let p0 = mix(v0, v1, 0.25);
        let p1 = mix(v0, v1, 0.75);

        newVertices.push(p0, p1);
    }
    return chaikin(newVertices, iterations - 1);
}

function triangle(a, b, c) {
    pointsArray.push(a);
    pointsArray.push(b);
    pointsArray.push(c);

    // normals are vectors

    normalsArray.push(a[0], a[1], a[2], 0.0);
    normalsArray.push(b[0], b[1], b[2], 0.0);
    normalsArray.push(c[0], c[1], c[2], 0.0);

    index += 3;

}

function divideTriangle(a, b, c, count) {
    if (count > 0) {
        let ab = mix(a, b, 0.5);
        let ac = mix(a, c, 0.5);
        let bc = mix(b, c, 0.5);

        ab = normalize(ab, true);
        ac = normalize(ac, true);
        bc = normalize(bc, true);

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

function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    window.addEventListener("keydown", on_key_down);

    index = 0;
    tetrahedron(va, vb, vc, vd, sphere_subdivisions);
    chaikin_init();

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //sphere section, isSphere === 1
    gl.uniform1i(gl.getUniformLocation(program, "isSphere"), 1);
    update_sphere_position();
    render_sphere();

    //line section, isSphere === 0
    gl.uniform1i(gl.getUniformLocation(program, "isSphere"), 0);
    render_chaikin();

    requestAnimationFrame(render);
}

function update_sphere_position() {
    if (t < 1) {
        //the current index based of t
        const t_index = Math.floor(t * (line_points.length - 1));

        //how far into the points we are
        const progress_percent = (t * (line_points.length - 1)) % 1;

        //get the current and next point to lerp between
        const start = line_points[t_index];
        const end = line_points[t_index + 1];

        gl.uniform1f(gl.getUniformLocation(program, "u_progress"), progress_percent);
        gl.uniform3fv(gl.getUniformLocation(program, "u_line_start"), [start[0], start[1], start[2]]);
        gl.uniform3fv(gl.getUniformLocation(program, "u_line_end"), [end[0], end[1], end[2]]);

        if (is_playing) {
            t += t_speed / line_points.length;
        }

        //limit to 0 and 1, rid of floating point issues according to internet
        if (t > 1) {
            t = 0;
        }
    } else {
        t = 0;
    }
}

function render_sphere() {
    //GPU info
    let vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    let vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    let vNormal = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vNormal);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    let vNormalPosition = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormalPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormalPosition);

    //lighting
    let diffuseProduct = mult(lightDiffuse, materialDiffuse);
    let specularProduct = mult(lightSpecular, materialSpecular);
    let ambientProduct = mult(lightAmbient, materialAmbient);

    //push lighting
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);

    //model info
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");

    //set up
    modelViewMatrix = lookAt(eye, at, up);
    projectionMatrix = perspective(fovy, 1, near, far);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    for (let i = 0; i < index; i += 3) {
        gl.drawArrays(gl.TRIANGLES, i, 3);
    }
}

function chaikin_init() {
    line_points = chaikin(line_control_points, line_subdivisions)
}

function render_chaikin() {
    //line info buffer
    let line_vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, line_vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(line_points), gl.STATIC_DRAW);

    //line position buffer
    let line_vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(line_vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(line_vPosition);

    //keep the line cented around middle
    let chaikin_position_matrix = mat4();

    modelViewMatrixLoc = gl.getUniformLocation(program, "lineViewMatrix");
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(chaikin_position_matrix));

    //render line
    gl.drawArrays(gl.LINE_STRIP, 0, line_points.length);
}

function on_key_down(event) {
    const key = event.key;
    if (key === 'q') {
        on_sphere_subdivision_change(-1);
    } else if (key === 'e') {
        on_sphere_subdivision_change(1);
    } else if (key === 'j') {
        on_line_subdivision_change(-1);
    } else if (key === 'i') {
        on_line_subdivision_change(1);
    } else if (key === 'a') {
        is_playing = true;
    }
}

function on_sphere_subdivision_change(change) {
    sphere_subdivisions += change;

    if (sphere_subdivisions < MIN_SPHERE_SUB) {
        sphere_subdivisions = MIN_SPHERE_SUB;
    }
    if (sphere_subdivisions > MAX_SPHERE_SUB) {
        sphere_subdivisions = MAX_SPHERE_SUB;
    }

    console.log(sphere_subdivisions);
    init();
}

function on_line_subdivision_change(change) {
    line_subdivisions += change;

    if (line_subdivisions < MIN_LINE_SUB) {
        line_subdivisions = MIN_LINE_SUB;
    }
    if (line_subdivisions > MAX_LINE_SUB) {
        line_subdivisions = MAX_LINE_SUB;
    }

    console.log(line_subdivisions);
    init();
}