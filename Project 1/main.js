let gl;
let program;

let points = [];
let colors = [];

let image_scale_x = 1;
let image_scale_y = 1;


const POINT_SIZE = 25;

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

    //render();

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

            //numbers and "shit"
            let left = file_view_box[0];
            let bot = file_view_box[1];
            let width = file_view_box[2];
            let height = file_view_box[3];

            let right = left + width;
            let top = bot + height;

            let aspect_ratio = width / height;

            let x_distance = right - left;
            let y_distance = top - bot;

            let mid_x = left + (width * .5);
            let mid_y = bot + (height * .5);
            console.log("Mid: " + mid_x + "," + mid_y);

            image_scale_x = 1 / (x_distance * .5);
            image_scale_y = 1 / (y_distance * .5);
            console.log("Scale: " + image_scale_x + "," + image_scale_y);

            //orthographic
            let orthographic_matrix = ortho(left, right, bot, top, -1, 1);
            let projection_matrix = gl.getUniformLocation(program, "u_projection_matrix");
            gl.uniformMatrix4fv(projection_matrix, false, flatten(orthographic_matrix));

            //camera info
            let camera_position = vec3(mid_x, mid_y, -1);
            let target_position = vec3(mid_x, mid_y, 0);
            let up_vector = vec3(0, 1, 0);

            let camera_matrix = lookAt(camera_position, target_position, up_vector);
            let view_matrix = gl.getUniformLocation(program, "u_view_matrix");
            gl.uniformMatrix4fv(view_matrix, false, flatten(camera_matrix));

            render();
        };

        reader.readAsText(event.target.files[0]);
    }
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

    //matrix info
    let start_matrix = rotateX(180);

    //srt
    let scale_matrix = scalem(image_scale_x, image_scale_y, 1.0);
    let model_matrix = mult(start_matrix, scale_matrix);

    let rotation_matrix = rotateZ(0);
    model_matrix = mult(model_matrix, rotation_matrix);

    let translate_matrix = translate(0, 0, 0);
    model_matrix = mult(model_matrix, translate_matrix);

    let modelMatrix = gl.getUniformLocation(program, "u_model_matrix");
    gl.uniformMatrix4fv(modelMatrix, false, flatten(model_matrix));

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.LINES, 0, points.length);

    requestAnimationFrame(render);
}
