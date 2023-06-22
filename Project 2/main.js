//webgl "stuff"
let gl;
let program;

//camera info
let eye = vec3(0, 2.5, 5.5);
const up = vec3(0, 1, 0);
const zNear = 0.1;
const zFar = 25;
const fovy = 95;

//uniform locations
let modelMatrixUniformLoc;
let projectionMatrixUniformLoc;
let viewMatrixUniformLoc;
let worldMatrixUniformLoc
let isTextureUniformLoc;
let faceColorUniformLoc;

//attribute locations
let positionAttributeLoc;
let normalAttributeLoc;
let texCoordAttributeLoc;
let colorAttributeLoc;

//all object info
let matrix_stack = [];
let all_model_info = [];
let object_positions = [
    vec3(0, 0, 0), //street
    vec3(0.0, 0, 0),//lamp
    vec3(5.0, 0.0, -1.0), //stop sign
    vec3(1.0, 0.0, 2.0), //car
    vec3(0, 0.75, 1.75) //bunny
];
let object_rotations = [
    0, //street
    0, //lamp
    -90, //stop sign
    -90, //car
    0 //bunny
];
let object_additional = [];

const CAR_INDEX = 3;

//lighting
let is_light_on = true;
const LIGHT_ON = vec4(.75, .75, .75, 1.0);
const LIGHT_OFF = vec4(.25, .25, .25, 1.0);

let lightPosition = vec4(0.0, 0.0, 50.0, 1.0);
let lightAmbient = LIGHT_ON;
let lightDiffuse = LIGHT_ON;
let lightSpecular = LIGHT_ON;

//material info
let materialAmbient = vec4(0.75, 0.75, 0.75, 1.0);
let materialDiffuse = vec4(0.5, 0.5, 0.5, 1.0);
let materialSpecular = vec4(0.5, 0.5, 0.5, 1.0);
let materialShininess = 1.0;

//render variables
let is_car_moving = false
let is_playing = true;
let is_camera_nested = false;

const ALPHA_PLAY = 1;

let camera_alpha = 150;
let car_alpha = 0;

let alpha_delta = ALPHA_PLAY

//car variables
let car_radius = 3;
let car_speed = .01;

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

    //z distance rendering
    gl.enable(gl.DEPTH_TEST);

    //backface culling
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    //matrix init
    matrix_stack = [];
    matrix_stack.push(mat4());

    window.addEventListener("keydown", on_key_down);

    make_lighting();

    attribute_init();
    uniform_init();

    load_all_models();
    render();
}

function make_lighting() {
    let diffuseProduct = mult(lightDiffuse, materialDiffuse);
    let specularProduct = mult(lightSpecular, materialSpecular);
    let ambientProduct = mult(lightAmbient, materialAmbient);

    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "u_light_position"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);
}

function attribute_init() {
    //get attribute locations
    positionAttributeLoc = gl.getAttribLocation(program, "a_position");
    normalAttributeLoc = gl.getAttribLocation(program, "a_normal");
    texCoordAttributeLoc = gl.getAttribLocation(program, "a_texcoord");
    colorAttributeLoc = gl.getAttribLocation(program, "a_color");

    //enable postion/normal data
    gl.enableVertexAttribArray(positionAttributeLoc);
    gl.enableVertexAttribArray(normalAttributeLoc);
    gl.enableVertexAttribArray(texCoordAttributeLoc);
    gl.enableVertexAttribArray(colorAttributeLoc);
}

function uniform_init() {
    //get uniform locations
    projectionMatrixUniformLoc = gl.getUniformLocation(program, "u_projection_matrix");
    viewMatrixUniformLoc = gl.getUniformLocation(program, "u_view_matrix");
    worldMatrixUniformLoc = gl.getUniformLocation(program, "u_world_matrix");
    modelMatrixUniformLoc = gl.getUniformLocation(program, "u_model_matrix");
    isTextureUniformLoc = gl.getUniformLocation(program, "u_is_textured");
    faceColorUniformLoc = gl.getUniformLocation(program, "u_face_color");
}

function load_all_models() {
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

    let bunny = new Model(
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/bunny.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/bunny.mtl");

    loadModel(street);
    loadModel(lamp);
    loadModel(stopSign);
    loadModel(car);
    loadModel(bunny);
}

function set_buffers(model_info) {
    //position buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model_info.vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(positionAttributeLoc, 3, gl.FLOAT, false, 0, 0);

    //normal buffer
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model_info.normals), gl.STATIC_DRAW);
    gl.vertexAttribPointer(normalAttributeLoc, 3, gl.FLOAT, false, 0, 0);

    //texcoord
    const texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model_info.texCoords), gl.STATIC_DRAW);
    gl.vertexAttribPointer(texCoordAttributeLoc, 2, gl.FLOAT, false, 0, 0);

    //color
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model_info.diffuse), gl.STATIC_DRAW);
    gl.vertexAttribPointer(colorAttributeLoc, 4, gl.FLOAT, false, 0, 0);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //matrix zone
    const projection_matrix = perspective(fovy, 1, zNear, zFar);

    //add a trig function for the up and down
    const world_matrix = rotateY(camera_alpha);
    const view_matrix = lookAt(eye, vec3(0, 0, 0), up);

    //get the current model matrix
    let model_matrix = matrix_stack[matrix_stack.length - 1];

    for (let i = 0; i < all_model_info.length; i++) {
        matrix_stack.push(matrix_stack[matrix_stack.length - 1]);

        //get the current model info
        let current_model_info = all_model_info[i];
        set_buffers(current_model_info);

        //move object to cords
        let current_pos = object_positions[i];

        //model matrix
        let x = current_pos[0];
        let y = current_pos[1];
        let z = current_pos[2];

        //get into position and rotation
        model_matrix = mult(model_matrix, translate(x, y, z));
        model_matrix = mult(model_matrix, rotateY(object_rotations[i]));

        //apply any extra movements from the object_extra
        if (i === CAR_INDEX) {
            //move the car to the center
            model_matrix = mat4();

            let angle = car_alpha * car_speed;

            //get the coords
            const car_x = car_radius * Math.cos(angle);
            const car_z = car_radius * Math.sin(angle);

            //get the direction
            const dir_x = Math.sin(angle);
            const dir_z = Math.cos(angle);

            //get direction in rads and convert to degrees
            let car_rotation = Math.atan2(dir_z, dir_x) * (180 / Math.PI);

            //move and rotate car
            model_matrix = mult(model_matrix, translate(car_x, 0, car_z));
            model_matrix = mult(model_matrix, rotateY(car_rotation + 90));

            //if we want to move
            if (is_car_moving) {
                car_alpha -= alpha_delta;
            }
        }

        //textured or not
        gl.uniform1i(isTextureUniformLoc, current_model_info.textured);

        //position
        gl.uniformMatrix4fv(projectionMatrixUniformLoc, false, flatten(projection_matrix));
        gl.uniformMatrix4fv(viewMatrixUniformLoc, false, flatten(view_matrix));
        gl.uniformMatrix4fv(worldMatrixUniformLoc, false, flatten(world_matrix));
        gl.uniformMatrix4fv(modelMatrixUniformLoc, false, flatten(model_matrix));

        //index through the positions/normal length array for offset
        gl.drawArrays(gl.TRIANGLES, 0, current_model_info.vertices.length);

        matrix_stack.pop();
    }

    if (is_playing) {
        camera_alpha += alpha_delta;
    }
    requestAnimationFrame(render);
}

//main loading model function
function loadModel(model) {
    waitForLoadedModel(model).then(
        function (value) {
            console.log("Model Loaded!");

            if (model.textured) {
                pushModelTexture(model);
            }

            all_model_info.push(getModelInfo(model));
        },
        function (reason) {
            console.log("Model Failed to load: ", reason);
        }
    )
}

//How to display the model
function getModelInfo(model) {
    let vertices = [];
    let normals = [];
    let texCoords = [];
    let diffuse = [];
    let specular = [];

    for (let i = 0; i < model.faces.length; i++) {
        let c_face = model.faces[i];

        for (let j = 0; j < c_face.faceVertices.length; j++) {

            let c_faceVertices = c_face.faceVertices[j];
            let c_faceNormals = c_face.faceNormals[j];
            let c_faceTexCoords = c_face.faceTexCoords[j];
            let c_faceMaterial = model.diffuseMap.get(c_face.material);

            for (let m = 0; m < 4; m++) {
                diffuse.push(c_faceMaterial[m]);
            }

            for (let k = 0; k < 3; k++) {
                //add to a combined postions array
                vertices.push(c_faceVertices[k]);

                //add to a combinded normal array
                normals.push(c_faceNormals[k]);

                //colors
            }

            if (model.textured) {
                for (let t = 0; t < 2; t++) {
                    //add to a combined text cords array
                    texCoords.push(c_faceTexCoords[t]);
                }
            }
        }
    }

    return {
        vertices: vertices,
        normals: normals,
        texCoords: texCoords,
        diffuse: diffuse,
        textured: model.textured
    };
}

//how to load a texture
function pushModelTexture(model) {
    //make texture
    gl.activeTexture(gl.TEXTURE0);

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    //make image
    const image = new Image();
    image.crossOrigin = "";

    image.addEventListener('load', function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
    })

    image.src = model.imagePath;

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

//Promise that checks every 1.5 seconds if model has loaded
function checkIsModelLoaded(model) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(model.objParsed && model.mtlParsed);
        }, 1500)
    });
}

//Waits for model to be loaded
async function waitForLoadedModel(model) {
    while (true) {
        if (await checkIsModelLoaded(model)) {
            break;
        }
    }
}

//user key pressed input
function on_key_down(event) {
    const key = event.key;

    if (key === 'l') {
        set_street_light(is_light_on = !is_light_on);
    } else if (key === 'c') {
        is_playing = !is_playing
    } else if (key === 'f') {
        alpha_delta = -alpha_delta;
    } else if (key === 'm') {
        is_car_moving = !is_car_moving;
    } else if (key === 'd') {
        is_camera_nested = !is_camera_nested;
    }
}

//set the streetlight state
function set_street_light(state) {
    if (state) {
        lightSpecular = LIGHT_ON;
        lightDiffuse = LIGHT_ON;
        lightAmbient = LIGHT_ON;
    } else {
        lightSpecular = LIGHT_OFF;
        lightDiffuse = LIGHT_OFF;
        lightAmbient = LIGHT_OFF;
    }

    make_lighting();
    console.log("Light is: " + state);
}