let gl;
let program;

let points;
let colors;

const POINT_SIZE = 10;

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

    render();

    function on_file_upload(event) {
        let reader = new FileReader();

        reader.onload = function (event) {
            //convert file -> xml
            const parser = new DOMParser();
            const xml_doc = parser.parseFromString(event.target.result, "application/xml");

            let file_view_box = xmlGetViewbox(xml_doc, 400);
            let file_points = xmlGetLines(xml_doc, 0x000000)[0];

            console.log(file_view_box);
            console.log(file_points);

            for (let i = 0; i < file_points.length; i++) {

            }
        };

        reader.readAsText(event.target.files[0]);
    }

    window.onkeypress = function (event) {
        var key = event.key;
        switch (key) {
            case 'a':
                gl.clearColor(0.0, 0.0, 0.0, 1.0);
                gl.clear(gl.COLOR_BUFFER_BIT);

                gl.drawArrays(gl.POINTS, 0, points.length);
                break;
        }
    }

    window.onclick = function (event) {
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
}

function render() {
    points = [];
    points.push(vec4(-1.0, -1.0, 0.0, 1.0));
    points.push(vec4(1.0, -1.0, 0.0, 1.0));
    points.push(vec4(0.0, 1.0, 0.0, 1.0));

    // Create a GPU buffer for vertex data
    let vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    let vPosition = gl.getAttribLocation(program, "a_vPosition");
    gl.enableVertexAttribArray(vPosition);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

    //color
    colors = [];
    colors.push(vec4(1.0, 0.0, 0.0, 1.0));
    colors.push(vec4(0.0, 1.0, 0.0, 1.0));
    colors.push(vec4(0.0, 0.0, 1.0, 1.0));

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
    let scale_matrix = scalem(1, 1, 1);
    let output_matrix = mult(start_matrix, scale_matrix);

    let rotation_matrix = rotateZ(0);
    output_matrix = mult(output_matrix, rotation_matrix);

    let translate_matrix = translate(0, 0, 0);
    output_matrix = mult(output_matrix, translate_matrix);

    let modelMatrix = gl.getUniformLocation(program, "u_modelMatrix");
    gl.uniformMatrix4fv(modelMatrix, false, flatten(output_matrix));

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.LINE_LOOP, 0, points.length);

    requestAnimationFrame(render);
}
