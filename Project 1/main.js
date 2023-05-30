let gl;
let program;

//arrays
let points = [];
let colors = [];

let model_matrix;
let width, height = 0;

//image info
let image_scale_x = 1, image_scale_y = 1;
let svg_mid_x = 0, svg_mid_y = 0;

//user input info
let user_scale = 1;
let user_translate_x = 0, user_translate_y = 0;
let user_rotate = 0;
let is_shift_pressed_down = false;
let is_dragging_mouse = false;

//mouse drag
let previous_x, previous_y = 0;
let delta_x, delta_y = 0;

let aspect_ratio = 0;

const ROTATE_CHANGE = 5;
const SCALE_CHANGE = .1;

const MIN_SCALE = .1
const MAX_SCALE = 10;

const POINT_SIZE = 25;
const CANVAS_SIZE = 400;

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
        previous_x = event.clientX;
        previous_y = event.clientY;
    })

    //mouse move
    canvas.addEventListener("mousemove", function (event) {
        if (is_dragging_mouse) {
            on_mouse_drag(event);
        }
    })

    canvas.addEventListener("mouseup", function (event) {
        is_dragging_mouse = false;
        delta_x = 0;
        delta_y = 0;
    })

    function on_file_upload(event) {
        let reader = new FileReader();
        reset_user_input();

        reader.onload = function (event) {
            //convert file -> xml
            const parser = new DOMParser();
            const xml_doc = parser.parseFromString(event.target.result, "application/xml");

            let file_view_box = xmlGetViewbox(xml_doc, 400);
            let lines = xmlGetLines(xml_doc, 0x000000);

            console.clear();
            console.log("ViewBox: " + file_view_box);
            points = lines[0];
            colors = lines[1];

            //numbers
            let left = file_view_box[0];
            let bot = file_view_box[1];
            width = file_view_box[2];
            height = file_view_box[3];

            //Set up the viewport with correct aspect ratio
            aspect_ratio = width / height;
            console.log("Aspect Ratio: " + aspect_ratio);

            let projection_matrix = ortho(-1, 1, -1, 1, -1, 1);
            let projection_matrix_location = gl.getUniformLocation(program, "u_projection_matrix");
            gl.uniformMatrix4fv(projection_matrix_location, false, flatten(projection_matrix));

            gl.viewport(0, 0, CANVAS_SIZE, CANVAS_SIZE / aspect_ratio);

            image_scale_x = 1 / (width * .5);
            image_scale_y = 1 / (height * .5);
            console.log("Scale:" + image_scale_x + "," + image_scale_y);

            svg_mid_x = (width * .5) + left;
            svg_mid_y = (height * .5) + bot;
            console.log("Translate:" + svg_mid_x + "," + svg_mid_y);

            camera_uniform();
            model_matrix_uniform();

            render();
        };

        reader.readAsText(event.target.files[0]);
    }
}

function on_mouse_drag(event) {
    let current_x = event.clientX;
    let current_y = event.clientY;

    //get the delta
    delta_x = current_x - previous_x;
    delta_y = current_y - previous_y;

    //scale the delta
    delta_x *= 1 / (CANVAS_SIZE * aspect_ratio) / user_scale * width;
    delta_y *= 1 / (CANVAS_SIZE * aspect_ratio) / user_scale * height;

    //apply the delta
    user_translate_x -= delta_x;
    user_translate_y -= delta_y;

    //set previous position
    previous_x = current_x;
    previous_y = current_y;

    requestAnimationFrame(render);
}

function on_scale(change) {
    user_scale += change;
    user_scale = clamp(user_scale, MIN_SCALE, MAX_SCALE);
    requestAnimationFrame(render);
}

function on_rotate(change) {
    user_rotate += change;
    requestAnimationFrame(render);
}

function reset_user_input() {
    user_scale = 1;
    user_translate_x = 0;
    user_translate_y = 0;
    user_rotate = 0;

    model_matrix = mat4();
    requestAnimationFrame(render);
}

function point_size_uniform() {
    //point size
    let vertex_point_size = gl.getUniformLocation(program, "u_vPoint_size");
    gl.uniform1f(vertex_point_size, POINT_SIZE);
}

function position_attribute() {
    let vertex_Position = gl.getAttribLocation(program, "a_vPosition");
    gl.enableVertexAttribArray(vertex_Position);
    gl.vertexAttribPointer(vertex_Position, 2, gl.FLOAT, false, 0, 0);
}

function color_attribute() {
    let vertex_Color = gl.getAttribLocation(program, "a_vColor");
    gl.enableVertexAttribArray(vertex_Color);
    gl.vertexAttribPointer(vertex_Color, 4, gl.FLOAT, false, 0, 0);
}

function color_buffer() {
    //color
    let color_Buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, color_Buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
}

function vertex_buffer() {
    //points
    let vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
}

function camera_uniform() {
    //camera info
    let camera_position = vec3(0, 0, -1);
    let target_position = vec3(0, 0, 0);
    let up_vector = vec3(0, 1, 0);

    let camera_matrix = lookAt(camera_position, target_position, up_vector);
    let view_matrix = gl.getUniformLocation(program, "u_view_matrix");
    gl.uniformMatrix4fv(view_matrix, false, flatten(camera_matrix));
}

function model_matrix_uniform() {
    model_matrix = mat4();

    //translate to origin (x, y)
    let current_x = user_translate_x - svg_mid_x;
    let current_y = user_translate_y - svg_mid_y;
    console.log(current_x + "," + current_y);
    model_matrix = translate(0, 0, 0);

    //TRS
    let translate_matrix = translate(current_x, current_y, 0);
    model_matrix = mult(model_matrix, translate_matrix);

    let rotation_matrix = rotateZ(180 + user_rotate);
    model_matrix = mult(model_matrix, rotation_matrix);

    let scale_matrix = scalem(image_scale_x * user_scale, image_scale_y * user_scale, 1.0);
    model_matrix = mult(model_matrix, scale_matrix);

    let modelMatrix = gl.getUniformLocation(program, "u_model_matrix");
    gl.uniformMatrix4fv(modelMatrix, false, flatten(model_matrix));
}

function drawing() {
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.LINES, 0, points.length);
}

function render() {
    //position
    vertex_buffer();
    position_attribute();

    //color
    color_buffer();
    color_attribute();

    //uniforms
    point_size_uniform();
    model_matrix_uniform();

    drawing();
}
