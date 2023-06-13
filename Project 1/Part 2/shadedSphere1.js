let canvas;
let gl;
let program;

let sphere_subdivsions = 1;
const MAX_SPHERE_SUB = 5;
const MIN_SPHERE_SUB = 0;

let index = 0;

let pointsArray = [];
let normalsArray = [];

let fovy = 90;
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

let eye = vec3(0, 0, 5.0);
let at = vec3(0.0, 0.0, 0.0);
let up = vec3(0.0, 1.0, 0.0);

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

    index = 0;
    pointsArray = [];
    normalsArray = [];

    window.addEventListener("keydown", on_key_down);

    //lighting
    let diffuseProduct = mult(lightDiffuse, materialDiffuse);
    let specularProduct = mult(lightSpecular, materialSpecular);
    let ambientProduct = mult(lightAmbient, materialAmbient);

    tetrahedron(va, vb, vc, vd, sphere_subdivsions);

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

    //model info
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");

    //push lighting
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    modelViewMatrix = lookAt(eye, at, up);
    //projectionMatrix = ortho(left, right, bottom, ytop, near, far);

    projectionMatrix = perspective(fovy, 1, near, far);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    for (let i = 0; i < index; i += 3) {
        gl.drawArrays(gl.TRIANGLES, i, 3);
    }
}

function on_key_down(event) {
    const key = event.key;

    if (key === 'q') {
        on_sphere_subdivision_change(-1);
    } else if (key === 'e') {
        on_sphere_subdivision_change(1);
    }
}

function on_sphere_subdivision_change(change) {
    sphere_subdivsions += change;

    //clamp?
    if (sphere_subdivsions < MIN_SPHERE_SUB) {
        sphere_subdivsions = MIN_SPHERE_SUB;
    }
    if (sphere_subdivsions > MAX_SPHERE_SUB) {
        sphere_subdivsions = MAX_SPHERE_SUB;
    }

    console.log(sphere_subdivsions);
    init();
}