let gl;
let program;

//arrays
let points = [];
let colors = [];

let width, height = 0;
let model_matrix;

//image info
let svg_scale_x = 1, svg_scale_y = 1;
let svg_center_x = 0, svg_center_y = 0;

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
const CANVAS_SIZE = 500;

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

    //keyboard input
    window.addEventListener("keydown", on_key_down);
    window.addEventListener("keyup", on_key_up);

    //for mouse input
    canvas.addEventListener("wheel", on_wheel_scroll);
    canvas.addEventListener("mousedown", on_mouse_down);
    canvas.addEventListener("mousemove", on_mouse_move);
    canvas.addEventListener("mouseup", on_mouse_up);

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

            //set up camera
            let projection_matrix = ortho(-1, 1, -1, 1, -1, 1);
            let projection_matrix_location = gl.getUniformLocation(program, "u_projection_matrix");
            gl.uniformMatrix4fv(projection_matrix_location, false, flatten(projection_matrix));

            gl.viewport(0, 0, CANVAS_SIZE, CANVAS_SIZE / aspect_ratio);

            //get svg info
            svg_scale_x = 1 / width * 2;
            svg_scale_y = 1 / height * 2;

            svg_center_x = left + (width * .5);
            svg_center_y = bot + (height * .5);

            console.log("SVG Scale:" + svg_scale_x + "," + svg_scale_y);
            render();
        };

        reader.readAsText(event.target.files[0]);
    }
}

function transformation_matrix_uniform() {
    //translate to origin (x, y)
    let current_x = (user_translate_x + svg_center_x) * svg_scale_x;
    let current_y = (user_translate_y + svg_center_y) * svg_scale_y;
    console.log(current_x + " " + current_y);

    //translate to webgl origin
    let origin_matrix = translate(current_x, current_y, 0);
    let origin_location = gl.getUniformLocation(program, "u_to_origin");
    gl.uniformMatrix4fv(origin_location, false, flatten(origin_matrix));

    //rotate
    let rotate_matrix = rotateZ(180 + user_rotate);
    model_matrix = mult(model_matrix, rotate_matrix);
    let rotate_location = gl.getUniformLocation(program, "u_rotate");
    gl.uniformMatrix4fv(rotate_location, false, flatten(rotate_matrix));

    //scale
    let scale_matrix = scalem(svg_scale_x * user_scale, svg_scale_y * user_scale, 1.0);
    model_matrix = mult(model_matrix, scale_matrix);
    let scale_location = gl.getUniformLocation(program, "u_scale");
    gl.uniformMatrix4fv(scale_location, false, flatten(scale_matrix));

    //Could not get to work properly
    let to_point_matrix = translate(current_x, current_y, 0);
    let to_point_location = gl.getUniformLocation(program, "u_to_point");
    gl.uniformMatrix4fv(to_point_location, false, flatten(to_point_matrix));
}

function on_key_up(event) {
    if (event.key === 'Shift') {
        is_shift_pressed_down = false;
    }
}

function on_key_down(event) {
    const key = event.key;
    if (key === 'r') {
        reset_user_input();
        requestAnimationFrame(render);
    } else if (key === 'Shift') {
        is_shift_pressed_down = true;
    }
}

function on_wheel_scroll(event) {
    const delta = event.deltaY;

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
}

function on_mouse_down(event) {
    is_dragging_mouse = true;
    previous_x = event.clientX;
    previous_y = event.clientY;
}

function on_mouse_move(event) {
    if (is_dragging_mouse) {
        on_mouse_drag(event);
    }
}

function on_mouse_up(event) {
    is_dragging_mouse = false;
    delta_x = 0;
    delta_y = 0;
}

function on_mouse_drag(event) {
    let current_x = event.clientX;
    let current_y = event.clientY;

    //get the delta
    delta_x = current_x - previous_x;
    delta_y = current_y - previous_y;

    //apply the delta
    delta_x *= 1 / (CANVAS_SIZE * aspect_ratio) * width;
    delta_y *= 1 / (CANVAS_SIZE * aspect_ratio) * height;

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
}

function point_size_uniform() {
    //point size
    let vertex_point_size = gl.getUniformLocation(program, "u_point_size");
    gl.uniform1f(vertex_point_size, POINT_SIZE);
}

function position_attribute() {
    let vertex_Position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(vertex_Position);
    gl.vertexAttribPointer(vertex_Position, 2, gl.FLOAT, false, 0, 0);
}

function color_attribute() {
    let vertex_Color = gl.getAttribLocation(program, "a_color");
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

function drawing() {
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.LINES, 0, points.length);
}

function render() {
    //position
    vertex_buffer();
    position_attribute();
    camera_uniform();

    //color
    color_buffer();
    color_attribute();

    //uniforms
    point_size_uniform();
    transformation_matrix_uniform();

    drawing();
}
