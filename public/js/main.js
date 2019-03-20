$ = ((e, t) => {
    let n = "number" == typeof t ? t : void 0,
        a = "object" == typeof t ? t : void 0,
        o = a ? a.querySelectorAll(e) : document.querySelectorAll(e);
    return void 0 !== n ? o[n] : 1 === o.length ? o[0] : o
}), HTMLElement.prototype.find = function (e) {
    return $(e, this)
}, HTMLElement.prototype.hasClass = function (e) {
    return this.classList ? this.classList.contains(e) : new RegExp("(^| )" + e + "( |$)", "gi").test(this.q)
}, HTMLElement.prototype.addClass = function (e) {
    return this.classList ? this.classList.add(e) : this.className += " " + e
}, HTMLElement.prototype.removeClass = function (e) {
    return this.classList ? this.classList.remove(e) : this.className = this.className.replace(new RegExp("(^|\\b)" + e.split(" ").join("|") + "(\\b|$)", "gi"), " ")
}, HTMLElement.prototype.toggleClass = function (e) {
    return this.hasClass(e) ? this.removeClass(e) : this.addClass(e)
}, HTMLElement.prototype.attr = function (e, t) {
    return void 0 !== t ? this.setAttribute(e, t) : this.getAttribute(e)
}, HTMLElement.prototype.data = function (e, t) {
    return this.attr("data-" + e, t)
}, HTMLElement.prototype.html = function (e) {
    return this.innerHTML = e
}, HTMLElement.prototype.forEach = function (e, t) {
    return [this].forEach(e, t)
}, HTMLElement.prototype.append = function (e) {
    return this.appendChild(e)
};

let puzzle = "";
let imageParts = [];
let boxSize = 640;
let boxSlice = 4;
let threshold = 0;
let selected = -1;
let imgObject = new Image();
let gameStart = false;
let gameOver = false;
let waitLoad;
let body = $('.grid');
let oldCorrect = 0;
let points = 0;
let canvas = document.createElement('canvas');
let context = canvas.getContext('2d');

function toImageData (image) {
  canvas.width = image.width;
  canvas.height = image.height;
  context.clearRect(0, 0, image.width, image.height);
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, image.width, image.height);
}

function equal(a, b, tolerance) {
  a = toImageData(a);
  b = toImageData(b);
  tolerance = tolerance || 0;
  for (var i = a.data.length; i--;) if (a.data[i] !== b.data[i] && Math.abs(a.data[i] - b.data[i]) > tolerance) return false;
  return true;
}

// RESETS GLOBAL VARIABLES TO THEIR INITIAL STATE & PREPARES BOXES
function resetGame(){
    body.innerHTML = "";
    puzzle = "";
    imageParts = [];
    gameOver = false;
    selected = -1;
    imgObject = new Image();
    gameStart = false;
    points = 0;
    $(".button.light").removeClass("disabled");

    for(let i=0; i<boxSlice*boxSlice; i++){
        let newBox = document.createElement('img');
        newBox.className = 'box';
        newBox.style.width = boxSize/boxSlice;
        newBox.style.height = boxSize/boxSlice;
        newBox.draggable = false;
        body.appendChild(newBox);
    }

    $(".box").forEach(function(e, i) {
        e.style.top = (Math.floor(i/boxSlice) * (boxSize/boxSlice)) + 'px';
        e.style.left = (i%boxSlice * (boxSize/boxSlice)) + 'px';
        e.addEventListener("click", function(){
            if(!gameOver){
                if(selected===-1){
                    // SELECT
                    this.addClass("selected");
                    selected = this;
                }else{
                    // SWAP
                    swapBoxes([selected,this]);
                    // CONTROL
                    boxControl();
                }
            }
        });
    });

    getTop5();
}

// https://stackoverflow.com/questions/19262141/resize-image-with-javascript-canvas-smoothly
function resizePuzzle(){
    let canvas = document.createElement('canvas'),
        ctx = canvas.getContext("2d");
        oc = document.createElement('canvas'),
        octx = oc.getContext('2d');

    canvas.height = canvas.width = boxSize;

    // DRAW IMAGE TO CANVAS
    oc.width = imgObject.width;
    oc.height = imgObject.height;
    octx.drawImage(imgObject, 0, 0, oc.width, oc.height);

    // FOR A CRISP IMAGE
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;

    // SCALE & DRAW
    ctx.drawImage(oc, 0, 0, oc.width, oc.height, 0, 0, boxSize, boxSize);

    puzzle = canvas.toDataURL();
    imgObject = new Image();
    imgObject.src = puzzle;
    imgObject.onLoad = onImgLoaded(true);
}

// TRIGGERED WHEN IMAGE IS FULLY LOADED
function onImgLoaded(resized) {
    if (waitLoad != null) clearTimeout(waitLoad);
    if (!imgObject.complete) {
        waitLoad = setTimeout(function() {
            onImgLoaded();
        }, 3);
    } else {
        if (!resized) {
            resizePuzzle();
        } else {
            fillImages();
            shuffle();
        }
    }
}

// READS FILE AND FILLS THE IMAGE WITH IT
function readFile(e) {
    resetGame();
    if (e.files && e.files[0]) {
        let fileReader= new FileReader();
        fileReader.addEventListener("load", function(e) {
            puzzle = e.target.result;
            imgObject.src = puzzle;
            imgObject.onLoad = onImgLoaded();
        }); 
        fileReader.readAsDataURL( e.files[0] );
    }
}

// https://yellowpencil.com/blog/cropping-images-with-javascript/
function getImagePortion(imgObj, newWidth, newHeight, startX, startY){
    let canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d'),
        bufferCanvas = document.createElement('canvas'),
        bufferContext = bufferCanvas.getContext('2d');

    canvas.width = canvas.height = newHeight;
    
    // DRAW ORIGINAL IMAGE TO BUFFER
    bufferCanvas.width = imgObj.width;
    bufferCanvas.height = imgObj.height;
    bufferContext.drawImage(imgObj, 0, 0);

    // FOR A CRISP IMAGE
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(bufferCanvas, startX,startY,newWidth, newHeight,0,0,newWidth,newHeight);
    return canvas.toDataURL();
}

// SLICE IMAGE PARTS AND FILL BOXES WITH THEM
function fillImages(){
    $(".box").forEach(function(e, i) {
        let portion = getImagePortion(
            imgObject,                              // imgObj
            boxSize/boxSlice,                       // newWidth
            boxSize/boxSlice,                       // newHeight
            (i%boxSlice)*boxSize/boxSlice,          // startX
            Math.floor(i/boxSlice)*boxSize/boxSlice // startY
        );
        e.src = portion;
        imageParts.push(e);
    });
    gameStart = true;
}

function getPoints(correctness){
    //console.log(correctness, "correct!");
    let balance = 0;
    if(correctness===0){
        //console.log(":(");
        balance = -4;
    }else if(correctness<0){
        balance = ~~(correctness * 30);
    }else{
        balance = ~~(correctness * 6.25);
    }
    points += balance
    points = points > 100 ? 100 : points < 0 ? 0 : points
    $("#points").innerHTML = points;
}

function boxControl(){
    // WAIT IMAGE RENDER TO BE READY
    let isLoaded = true;
    for(let i = 0; i<imageParts.length; i++){
        if(imageParts[i].width===0){
            isLoaded = false;
            break;
        }
    }
    if(!isLoaded){ 
        setTimeout(function(){
            boxControl();
        },100)
    }else{
        let correctBoxCount = 0;
        $(".box").forEach(function(el, i) {
            let eqArray = [];
            for(let j = 0; j < boxSlice*boxSlice; j++){
                // IF ITS EQUAL
                let isEqual = equal(el, imageParts[j], threshold);
                eqArray.push(isEqual);
                //console.log("eq", isEqual)
            }

            if(eqArray[i]){
                correctBoxCount++;
                imageParts[i].addClass("correct");
            }else{
                imageParts[i].removeClass("correct");
            }
            //console.log("\n\n")
        });
        //console.log(correctBoxCount, "/", boxSlice*boxSlice)

        if(correctBoxCount-oldCorrect>0){
            $(".button.light").addClass("disabled");
        }

        getPoints(correctBoxCount-oldCorrect);
        oldCorrect = correctBoxCount;

        if(correctBoxCount===boxSlice*boxSlice){
            gameOver = true;
            gameStart = false;
            setTimeout(function(){
                saveScore();
            },400)
        }
    }
}

function swapBoxes(boxes){
    let tempLoc = [boxes[1].style.top, boxes[1].style.left];
    boxes[1].style.top = boxes[0].style.top;
    boxes[1].style.left = boxes[0].style.left;
    boxes[0].style.top = tempLoc[0];
    boxes[0].style.left = tempLoc[1];
    boxes[0].removeClass("selected");
    let k = imageParts.findIndex(e=>{return e===boxes[0];})
    let l = imageParts.findIndex(e=>{return e===boxes[1];})
    let tempResPar = imageParts[k]
    imageParts[k] = imageParts[l];
    imageParts[l] = tempResPar;

    // RESET
    selected = -1;
}

//https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
function shuffle() {
    if(gameStart){
        if(points===0){
            points = 0;
            oldCorrect = 0;
            for (let i = (boxSlice*boxSlice)-1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                swapBoxes([$(".box", i), $(".box", j)]);
            }
            // CONTROL
            boxControl();
        }
    }
}

function getTop5(){
    //console.log("getting top 5");
    var http = new XMLHttpRequest();
    http.open('GET', '/getScores', true);
    http.onreadystatechange = function() {
        if(http.readyState == 4 && http.status == 200) {
            let parsed = JSON.parse(http.responseText);
            parsed.scores.sort(function(a, b) {
                return b.score - a.score;
            })
            //console.log(parsed);
            $("#scores").innerHTML = "";
            for(let i=0; i < (parsed.scores.length > 5 ? 5 : parsed.scores.length); i++){
                let newScore = document.createElement('div');
                newScore.className = 'score';
                newScore.innerHTML = parsed.scores[i].name+" <b>"+parsed.scores[i].score+"</b>"
                $("#scores").appendChild(newScore);
            }
        }
    }
    http.send();
}

function saveScore(){
    let name = prompt("Please enter your name");
    if (name !== null) {
        name = encodeURI(name);
        //console.log(name);
        // POST TO BACKEND
        var http = new XMLHttpRequest();
        http.open('POST', '/postScore/'+name+'/'+points, true);
        http.onreadystatechange = function() {
            if(http.readyState == 4 && http.status == 200) {
                getTop5();
            }
        }
        http.send();
    }
    //console.log("game over")
}

resetGame();