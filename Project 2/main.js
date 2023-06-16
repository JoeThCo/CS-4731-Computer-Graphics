let gl;
let program;

//camera info
const eye = vec3(0, 1.5, 5);
const at = vec3(0, 0, 0);
const up = vec3(0, 1, 0);
const zNear = 0.1;
const zFar = 25;
const fovy = 75;

let projectionMatrixUniformLoc;
let viewMatrixUniformLoc;
let worldMatrixUniformLoc

let positionAttributeLoc;
let normalAttributeLoc;

let combined_positions = [];
let combined_normals = [];
let object_lengths = [];

const triangle_positions = [
    // Vertex 1
    -0.5, 0.5, 0.0,
    // Vertex 2
    -0.5, -0.5, 0.0,
    // Vertex 3
    0.5, -0.5, 0.0
];
const triangle_normals = [
    // Vertex 1
    0.0, 0.0, 1.0,
    // Vertex 2
    0.0, 0.0, 1.0,
    // Vertex 3
    0.0, 0.0, 1.0
];

const square_positions = [
    // Vertex 1
    -0.5, 0.5, 0.0,
    // Vertex 2
    -0.5, -0.5, 0.0,
    // Vertex 3
    0.5, -0.5, 0.0,
    // Vertex 4
    0.5, 0.5, 0.0
];
const square_normals = [
    // Vertex 1
    0.0, 0.0, 1.0,
    // Vertex 2
    0.0, 0.0, 1.0,
    // Vertex 3
    0.0, 0.0, 1.0,
    // Vertex 4
    0.0, 0.0, 1.0
];

let object_count = 0;
let want_test_shapes = false;

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
    positionAttributeLoc = gl.getAttribLocation(program, "a_position");
    normalAttributeLoc = gl.getAttribLocation(program, "a_normal");

    //enable postion/normal data
    gl.enableVertexAttribArray(positionAttributeLoc);
    gl.enableVertexAttribArray(normalAttributeLoc);

    //get uniform locations
    projectionMatrixUniformLoc = gl.getUniformLocation(program, "u_projection_matrix");
    viewMatrixUniformLoc = gl.getUniformLocation(program, "u_view_matrix");
    worldMatrixUniformLoc = gl.getUniformLocation(program, "u_world_matrix");

    if (want_test_shapes) {
        //test triangle
        combined_positions.push(...triangle_positions);
        combined_normals.push(...triangle_normals);
        object_lengths.push(triangle_positions.length);
        object_count++;

        //test square
        combined_positions.push(...square_positions);
        combined_normals.push(...square_normals);
        object_lengths.push(square_positions.length);
        object_count++;
    }

    make_buffers();

    // Get the stop sign
    let stopSign = new Model(
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/stopsign.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/stopsign.mtl");

    let lamp = new Model(
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/lamp.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/lamp.mtl");

    let car = new Model(
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/car.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/car.mtl");

    let street = new Model(
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/street.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/street.mtl");

    loadModel(street);
    loadModel(stopSign);
    loadModel(lamp);
    loadModel(car);

    render();
}

function make_buffers() {
    //position buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(combined_positions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(positionAttributeLoc, 3, gl.FLOAT, false, 0, 0);

    //normal buffer
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(combined_normals), gl.STATIC_DRAW);
    gl.vertexAttribPointer(normalAttributeLoc, 3, gl.FLOAT, false, 0, 0);
}

let alpha = 0;
let alpha_speed = 3;

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const projection_matrix = perspective(fovy, 1, zNear, zFar);
    const world_matrix = rotateY(alpha);
    const view_matrix = lookAt(eye, at, up);

    gl.uniformMatrix4fv(projectionMatrixUniformLoc, false, flatten(projection_matrix));
    gl.uniformMatrix4fv(viewMatrixUniformLoc, false, flatten(view_matrix));
    gl.uniformMatrix4fv(worldMatrixUniformLoc, false, flatten(world_matrix));

    let last_count = 0;
    for (let i = 0; i < object_count; i++) {
        //index through the positions/normal length array for offset
        const current_count = object_lengths[i] / 3;

        gl.drawArrays(gl.TRIANGLES, last_count, current_count);

        //save last
        last_count = current_count;
    }

    alpha += alpha_speed;
    requestAnimationFrame(render);
}

//main loading model function
function loadModel(model) {
    waitForLoadedModel(model).then(
        function (value) {
            console.log("Model Loaded!");
            pushModelInfo(model);
            make_buffers();
        },
        function (reason) {
            console.log("Model Failed to Load!");
        }
    )
}

//How to display the model
function pushModelInfo(model) {
    const vector_size = 3;
    let total = 0;
    //add a new object steps
    for (let i = 0; i < model.faces.length; i++) {
        let c_face = model.faces[i];

        for (let j = 0; j < c_face.faceVertices.length; j++) {
            let c_faceVertices = c_face.faceVertices[j];
            let c_faceNormals = c_face.faceNormals[j];

            //get the first vec3 numbers
            for (let k = 0; k < vector_size; k++) {
                //add to a combined postions array
                combined_positions.push(c_faceVertices[k]);

                //add to a combinded normal array
                combined_normals.push(c_faceNormals[k]);
            }

            total += vector_size;
        }
    }

    //add positions/normal length to an object size array
    object_lengths.push(total);

    //increase object count
    object_count++;
}

//Promise that checks every 1.5 seconds if model has loaded
function checkIsLoaded(model) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(model.objParsed && model.mtlParsed);
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
    // Get the bunny (you will not need this one until Part II)
    let bunny = new Model(
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/bunny.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/bunny.mtl");
 */