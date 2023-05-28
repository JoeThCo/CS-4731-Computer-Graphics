let gl;
let program;

let points = [];
let colors = [];

//image info
let image_scale_x = 1;
let image_scale_y = 1;
let image_translate_x = 0;
let image_translate_y = 0;

//user input info
let user_scale = 1;
let user_translate_x = 0;
let user_translate_y = 0;
let user_rotate = 0;
let is_shift_pressed_down = false;
let is_dragging_mouse = false;
let last_mouse_x = 0;
let last_mouse_y = 0;

const TRANSLATE_CHANGE = .25;
const ROTATE_CHANGE = 2.5;
const SCALE_CHANGE = .05;

const MIN_SCALE = .1
const MAX_SCALE = 10;

const POINT_SIZE = 25;


function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function main() {
    // Retrieve <canvas> element
    let canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Initialize shaders
    program = initShaders(gl, "vshader", "fshader");
    gl.useProgram(program);

    //Set up the viewport
    gl.viewport(0, 0, canvas.width, canvas.height);

    //get input and add listener
    const file_input = document.getElementById("fileupload");
    file_input.type = "file";

    file_input.addEventListener("change", on_file_upload, false);

    //on key down
    window.addEventListener("keydown", function (event) {
        const key = event.key;
        if (key === 'r') {
            reset_user_input();
        } else if (key === 'Shift') {
            is_shift_pressed_down = true;
        }
    })

    //on key up
    window.addEventListener("keyup", function (event) {
        if (event.key === 'Shift') {
            is_shift_pressed_down = false;
        }
    })

    //scrollwheel
    canvas.addEventListener("wheel", function (event) {
        const delta = Math.sign(event.deltaY);

        //scale
        if (is_shift_pressed_down) {
            //scroll down
            if (delta > 0) {
                on_scale(-SCALE_CHANGE)
            }
            //scroll up
            else {
                on_scale(SCALE_CHANGE)
            }
        }
        //rotate
        else {
            //scroll down
            if (delta > 0) {
                on_rotate(-ROTATE_CHANGE)
            }
            //scroll up
            else {
                on_rotate(ROTATE_CHANGE)
            }
        }
    })

    //mouse down
    canvas.addEventListener("mousedown", function (event) {
        is_dragging_mouse = true;
        last_mouse_x = event.clientX;
        last_mouse_y = event.clientY;
    })

    //mouse move
    canvas.addEventListener("mousemove", function (event) {
        let delta_x = (event.clientX - last_mouse_x) * TRANSLATE_CHANGE;
        let delta_y = (event.clientY - last_mouse_y) * TRANSLATE_CHANGE;

        if (is_dragging_mouse) {
            on_mouse_drag(delta_x, delta_y);
        }

        last_mouse_x = event.clientX;
        last_mouse_y = event.clientY;
    })

    canvas.addEventListener("mouseup", function (event) {
        is_dragging_mouse = false;
    })

    render();

    function on_file_upload(event) {
        let reader = new FileReader();

        reader.onload = function (event) {
            //convert file -> xml
            const parser = new DOMParser();
            const xml_doc = parser.parseFromString(event.target.result, "application/xml");

            let file_view_box = xmlGetViewbox(xml_doc, 400);
            let lines = xmlGetLines(xml_doc, 0x000000);

            console.log("~~~~~~~~~~~~~~~~~~~~~~~~~");
            console.log("ViewBox: " + file_view_box);
            points = lines[0];
            colors = lines[1];

            //numbers
            let left = file_view_box[0];
            let bot = file_view_box[1];
            let width = file_view_box[2];
            let height = file_view_box[3];

            image_scale_x = 1 / (width * .5);
            image_scale_y = 1 / (height * .5);
            console.log("Scale:" + image_scale_x + "," + image_scale_y);

            image_translate_x = (width * .5) + left;
            image_translate_y = (height * .5) + bot;
            console.log("Translate:" + image_translate_x + "," + image_translate_y);

            //camera info
            let camera_position = vec3(0, 0, -1);
            let target_position = vec3(0, 0, 0);
            let up_vector = vec3(0, 1, 0);

            let camera_matrix = lookAt(camera_position, target_position, up_vector);
            let view_matrix = gl.getUniformLocation(program, "u_view_matrix");
            gl.uniformMatrix4fv(view_matrix, false, flatten(camera_matrix));

            render();
        };

        reader.readAsText(event.target.files[0]);
    }
}

function on_mouse_drag(delta_x, delta_y) {
    user_translate_x += delta_x;
    user_translate_y += delta_y;

    //translate code goes here
}

function on_scale(change) {
    user_scale += change;

    user_scale = clamp(user_scale, MIN_SCALE, MAX_SCALE);
    //scaling code goes here
}

function on_rotate(change) {
    user_rotate += change;

    //rotate code codes here
}

function reset_user_input() {
    console.log("Reset!")

    user_scale = 1;
    user_translate_x = 0;
    user_translate_y = 0;
    user_rotate = 0;

    render();
}

function render() {
    //points
    let vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    let vPosition = gl.getAttribLocation(program, "a_vPosition");
    gl.enableVertexAttribArray(vPosition);
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);

    //color
    let cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    let vColor = gl.getAttribLocation(program, "a_vColor");
    gl.enableVertexAttribArray(vColor);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);

    //point size
    let vPointSize = gl.getUniformLocation(program, "u_vPoint_size");
    gl.uniform1f(vPointSize, POINT_SIZE);

    let model_matrix = mat4();

    //srt
    let scale_matrix = scalem(image_scale_x * user_scale, image_scale_y * user_scale, 1.0);
    model_matrix = mult(model_matrix, scale_matrix);

    let rotation_matrix = rotateZ(180 + user_rotate);
    model_matrix = mult(model_matrix, rotation_matrix);

    let translate_matrix = translate(-image_translate_x + user_translate_x, -image_translate_y + user_translate_y, 0);
    model_matrix = mult(model_matrix, translate_matrix);

    let modelMatrix = gl.getUniformLocation(program, "u_model_matrix");
    gl.uniformMatrix4fv(modelMatrix, false, flatten(model_matrix));

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.LINES, 0, points.length);

    requestAnimationFrame(render);
}
