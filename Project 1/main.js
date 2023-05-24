function main()
{
    // Retrieve <canvas> element
    let canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    let gl = WebGLUtils.setupWebGL(canvas, undefined);

    //Check that the return value is not null.
    if (!gl)
    {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Initialize shaders
    let program = initShaders(gl, "vshader", "fshader");
    gl.useProgram(program);

    //Set up the viewport
    gl.viewport( 0, 0, 400, 400);

    //get the input and add a listener for file upload
    const fileUpload = document.getElementById("files");
    fileUpload.addEventListener("change",on_file_upload,false);

    function on_file_upload()
    {
        //get the uploaded file
        const file = this.files[0];
        console.log(file.name + " uploaded!");

    }
}

//todo upload an SVG
//viewbox xmlGetViewbox()
//lines x1 y1 x2 y2 stroke style
//images line https://canvas.wpi.edu/courses/45717/pages/project-1-images