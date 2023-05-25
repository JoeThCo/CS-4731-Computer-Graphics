let gl;
let program;

let points = [];
let colors = [];

let image_scale = 1;

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

            console.log("ViewBox: " + file_view_box);
            points = lines[0];
            colors = lines[1];

            for(let i = 0; i < points.length;i++){
                console.log(points[i]);
            }

            render();
        };

        reader.readAsText(event.target.files[0]);
    }
}

function render() {
    //points
    // Create a GPU buffer for vertex data
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
    let vPointSize = gl.getUniformLocation(program, "u_vPointSize");
    gl.uniform1f(vPointSize, POINT_SIZE);

    //matrix info
    let start_matrix = rotateX(180);

    //srt
    let scale_matrix = scalem(image_scale, image_scale, image_scale);
    let model_matrix = mult(start_matrix, scale_matrix);

    let rotation_matrix = rotateZ(0);
    model_matrix = mult(model_matrix, rotation_matrix);

    let translate_matrix = translate(0, 0, 0);
    model_matrix = mult(model_matrix, translate_matrix);

    let modelMatrix = gl.getUniformLocation(program, "u_modelMatrix");
    gl.uniformMatrix4fv(modelMatrix, false, flatten(model_matrix));

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.LINES, 0, points.length);

    requestAnimationFrame(render);
}
