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
    fileUpload.type = "file";
    fileUpload.addEventListener("change",on_file_upload,false);

    function on_file_upload(event)
    {
        //get the uploaded file
        const file = event.target.files[0];
        console.log(file.name + " uploaded!");

        //open the file as xml
        const reader = new FileReader();
        reader.onload = function (e){
            //get file contents
            const fileContent = e.target.result;

            //make file parser and read file as XML
            const parser = new DOMParser();
            const xml_Doc = parser.parseFromString(fileContent.toString(),"application/xml");

            //using supplied methods, get the viewbox and line info
            const view_box = xmlGetViewbox(xml_Doc,400);
            const lines = xmlGetLines(xml_Doc,0x000000);

            console.log(view_box)
            console.log(lines)
        }
        reader.readAsText(file);
    }
}

//todo upload an SVG
//viewbox xmlGetViewbox()
//lines x1 y1 x2 y2 stroke style
//images line https://canvas.wpi.edu/courses/45717/pages/project-1-images