let gl;
let program;

//camera info
const eye = vec3(0, 0, 5);
const at = vec3(0, 0, 0);
const up = vec3(0, 1, 0);
const zNear = 0.1;
const zFar = 25;
const fovy = 100;

let projectionMatrixUniformLoc;
let viewMatrixUniformLoc;
let worldMatrixUniformLoc

// Define the vertex positions
const positions = [
    // Vertex 1
    -0.5, 0.5, 0.0,
    // Vertex 2
    -0.5, -0.5, 0.0,
    // Vertex 3
    0.5, -0.5, 0.0
];

// Define the vertex normals
const normals = [
    // Vertex 1
    0.0, 0.0, 1.0,
    // Vertex 2
    0.0, 0.0, 1.0,
    // Vertex 3
    0.0, 0.0, 1.0
];

function main() {
    // Retrieve <canvas> element
    let canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    gl = WebGLUtils.setupWebGL(canvas, undefined);

    //Check that the return value is not null.
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Initialize shaders
    program = initShaders(gl, "vshader", "fshader");
    gl.useProgram(program);

    //get attribute locations
    const positionAttributeLoc = gl.getAttribLocation(program, "a_position");
    const normalAttributeLoc = gl.getAttribLocation(program, "a_normal");

    //enable postion/normal data
    gl.enableVertexAttribArray(positionAttributeLoc);
    gl.enableVertexAttribArray(normalAttributeLoc);

    //get uniform locations
    projectionMatrixUniformLoc = gl.getUniformLocation(program, "u_projection_matrix");
    viewMatrixUniformLoc = gl.getUniformLocation(program, "u_view_matrix");
    worldMatrixUniformLoc = gl.getUniformLocation(program, "u_world_matrix");

    //make attribute buffers
    const positionBuffer = gl.createBuffer();
    const normalBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(positionAttributeLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    gl.vertexAttribPointer(normalAttributeLoc, 3, gl.FLOAT, false, 0, 0);

    // Get the stop sign
    let stopSign = new Model(
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/stopsign.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/stopsign.mtl");

    loadModel(stopSign);

    render();
}

let alpha = 0;
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    const projection_matrix = perspective(fovy, 1, zNear, zFar);
    const world_matrix = rotateY(alpha);
    const view_matrix = lookAt(eye, at, up);

    gl.uniformMatrix4fv(projectionMatrixUniformLoc, false, flatten(projection_matrix));
    gl.uniformMatrix4fv(viewMatrixUniformLoc, false, flatten(view_matrix));
    gl.uniformMatrix4fv(worldMatrixUniformLoc, false, flatten(world_matrix));

    gl.drawArrays(gl.TRIANGLES, 0, positions.length);

    alpha += 3;
    requestAnimationFrame(render);
}

//main loading model function
function loadModel(model) {
    waitForLoadedModel(model).then(
        function (value) {
            console.log("Model Loaded!");
            displayModel(model);
        },
        function (reason) {
            console.log("Model Failed to Load!");
        }
    )
}

//How to display the model
function displayModel(model) {
    for (let i = 0; i < model.faces.length; i++) {
        let c_face = model.faces[i];

        for (let j = 0; j < c_face.faceVertices.length; j++) {
            let c_faceVert = c_face.faceVertices[j];
            console.log(c_faceVert);
        }
    }
}

//Promise that checks every 1.5 seconds if model has loaded
function checkIsLoaded(model) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(model.objParsed);
        }, 1500)
    });
}

//Waits for model to be loaded
async function waitForLoadedModel(model) {
    while (true) {
        if (await checkIsLoaded(model)) {
            break;
        }
    }
}

//other objs
/*
// Get the lamp
    let lamp = new Model(
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/lamp.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/lamp.mtl");

    // Get the car
    let car = new Model(
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/car.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/car.mtl");

    // Get the street
    let street = new Model(
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/street.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/street.mtl");

    // Get the bunny (you will not need this one until Part II)
    let bunny = new Model(
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/bunny.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/bunny.mtl");
 */