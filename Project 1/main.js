let gl;
let points;
let program;

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

    points = [];
    points.push(vec4(-1.0, -1.0, 0.0, 1.0));
    points.push(vec4(1.0, -1.0, 0.0, 1.0));
    points.push(vec4(0.0, 1.0, 0.0, 1.0));

    // Create a GPU buffer for vertex data
    let vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    let vPosition = gl.getAttribLocation(program, "vPosition");
    gl.enableVertexAttribArray(vPosition);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

    //color
    let colors = [];
    colors.push(vec4(1.0, 0.0, 0.0, 1.0));
    colors.push(vec4(0.0, 1.0, 0.0, 1.0));
    colors.push(vec4(0.0, 0.0, 1.0, 1.0));

    let cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    let vColor = gl.getAttribLocation(program, "vColor");
    gl.enableVertexAttribArray(vColor);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);

    //point size
    let vPointSize = gl.getUniformLocation(program, "vPointSize");
    gl.uniform1f(vPointSize, POINT_SIZE);
    render();


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
    let defaultMatrix = rotateX(180);

    let modelMatrix = gl.getUniformLocation(program, "modelMatrix");
    gl.uniformMatrix4fv(modelMatrix, false, flatten(defaultMatrix));

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.LINE_LOOP, 0, points.length);

    requestAnimationFrame(render);
}
