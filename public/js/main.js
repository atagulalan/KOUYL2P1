$ = (q, e) => {
    let i = typeof e === "number" ? e : undefined;
    let o = typeof e === "object" ? e : undefined;
    let r = o ? o.querySelectorAll(q) : document.querySelectorAll(q);
    if(i!==undefined){
        return r[i];
    }else if(r.length===1){
        return r[0];
    }else{
        return r;
    }
}
HTMLElement.prototype.find = function(q){return $(q, this)};
HTMLElement.prototype.hasClass = function(q){return this.classList ? this.classList.contains(q) : new RegExp('(^| )' + q + '( |$)', 'gi').test(this.q); }
HTMLElement.prototype.addClass = function(q){return this.classList ? this.classList.add(q) : this.className += ' ' + q;}
HTMLElement.prototype.removeClass = function(q){return this.classList ? this.classList.remove(q) : this.className = this.className.replace(new RegExp('(^|\\b)' + q.split(' ').join('|') + '(\\b|$)', 'gi'), ' '); }
HTMLElement.prototype.toggleClass =  function(q){return this.hasClass(q) ? this.removeClass(q) : this.addClass(q); }
HTMLElement.prototype.attr = function(q,s){return s!==undefined ? this.setAttribute(q, s) : this.getAttribute(q); }
HTMLElement.prototype.data = function(q,s){return this.attr("data-"+q,s); }
HTMLElement.prototype.html = function(q){return this.innerHTML=q; }
HTMLElement.prototype.forEach = function(q,s){return [this].forEach(q,s); }
HTMLElement.prototype.append = function(q){return this.appendChild(q); }

let boxSize = 640,
    boxSlice = 4,
    threshold = 0,
    boxLength = boxSlice * boxSlice,
    pieceSize = boxSize / boxSlice,
    puzzle,
    imageParts,
    selected,
    imgObject,
    gameStart,
    gameOver,
    waitLoad,
    oldCorrect,
    points;

function toImageData(image) {
    let canvas = document.createElement('canvas'),
        context = canvas.getContext('2d');
    [canvas.width, canvas.height] = [image.width, image.height];
    context.clearRect(0, 0, image.width, image.height);
    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, image.width, image.height);
}

function equal(a, b, tolerance) {
    [a, b] = [toImageData(a), toImageData(b)];
    tolerance = tolerance || 0;
    for (var i = a.data.length; i--;)
        if (a.data[i] !== b.data[i] && Math.abs(a.data[i] - b.data[i]) > tolerance) return false;
    return true;
}

// RESETS GLOBAL VARIABLES TO THEIR INITIAL STATE & PREPARES BOXES
function resetGame() {
    $('.grid').innerHTML = "";
    [puzzle, imageParts, gameStart, gameOver, selected, oldCorrect, points] = ["", [], false, false, -1, 0, 0];
    imgObject = new Image();
    $(".button.light").removeClass("disabled");

    for (let i = 0; i < boxLength; i++) {
        let newBox = document.createElement('img');
        [newBox.className, newBox.style.width, newBox.style.height, newBox.draggable] = ['box', pieceSize, pieceSize, false]
        $('.grid').appendChild(newBox);
    }

    $(".box").forEach(function (e, i) {
        [e.style.top, e.style.left] = [(Math.floor(i / boxSlice) * (pieceSize)) + 'px', (i % boxSlice * (pieceSize)) + 'px'];
        e.addEventListener("click", function () {
            if (!gameOver) {
                if (selected === -1) {
                    this.addClass("selected");
                    selected = this;
                } else {
                    swapBoxes([selected, this]);
                    boxControl();
                }
            }
        });
    });

    getTop5();
}

// https://stackoverflow.com/questions/19262141/resize-image-with-javascript-canvas-smoothly
// https://yellowpencil.com/blog/cropping-images-with-javascript/
function getImagePortion(imgObj, newWidth, newHeight, startX, startY, scaleX, scaleY) {
    let canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d'),
        oc = document.createElement('canvas'),
        octx = oc.getContext('2d');

    // DRAW ORIGINAL IMAGE TO BUFFER
    [oc.width, oc.height] = [imgObj.width, imgObj.height];
    octx.drawImage(imgObj, 0, 0, oc.width, oc.height);

    newWidth = newWidth === "oc" ? oc.width : newWidth;
    newHeight = newHeight === "oc" ? oc.height : newHeight;
    scaleX = scaleX ? scaleX : newWidth;
    scaleY = scaleY ? scaleY : newHeight;

    [canvas.width, canvas.height] = [scaleX, scaleY];

    // FOR A CRISP IMAGE
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(oc, startX, startY, newWidth, newHeight, 0, 0, scaleX, scaleY);
    return canvas.toDataURL();
}

// TRIGGERED WHEN IMAGE IS FULLY LOADED
function onImgLoaded(resized) {
    if (waitLoad != null) clearTimeout(waitLoad);
    if (!imgObject.complete) {
        waitLoad = setTimeout(function () {
            onImgLoaded();
        }, 3);
    } else {
        if (!resized) {
            puzzle = getImagePortion(imgObject, "oc", "oc", 0, 0, boxSize, boxSize);
            imgObject = new Image();
            imgObject.src = puzzle;
            imgObject.onLoad = onImgLoaded(true);
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
        let fileReader = new FileReader();
        fileReader.addEventListener("load", function (e) {
            puzzle = e.target.result;
            imgObject.src = puzzle;
            imgObject.onLoad = onImgLoaded();
        });
        fileReader.readAsDataURL(e.files[0]);
    }
}



// SLICE IMAGE PARTS AND FILL BOXES WITH THEM
function fillImages() {
    $(".box").forEach(function (el, i) {
        let portion = getImagePortion(
            imgObject, // imgObj
            pieceSize, // newWidth
            pieceSize, // newHeight
            (i % boxSlice) * pieceSize, // startX
            Math.floor(i / boxSlice) * pieceSize // startY
        );
        el.src = portion;
        imageParts.push(el);
    });
    gameStart = true;
}

function changePoints(correctness) {
    let balance = 0;
    if (correctness === 0) {
        balance = -4;
    } else if (correctness < 0) {
        balance = ~~(correctness * 30);
    } else if (correctness > 0) {
        $(".button.light").addClass("disabled")
        balance = ~~(correctness * 6.25);
    }
    points += balance
    points = points > 100 ? 100 : points < 0 ? 0 : points
    $("#points").innerHTML = points;
}

function boxControl() {
    // WAIT IMAGE RENDER TO BE READY
    let isLoaded = true;
    for (let i = 0; i < imageParts.length; i++) {
        if (imageParts[i].width === 0) {
            isLoaded = false;
            break;
        }
    }
    if (!isLoaded) {
        setTimeout(function () {
            boxControl();
        }, 100)
    } else {
        let correctBoxCount = 0;

        $(".box").forEach(function (el, i) {
            let eqArray = [];
            for (let j = 0; j < boxLength; j++) eqArray.push(equal(el, imageParts[j], threshold));
            if (eqArray[i]) correctBoxCount++;
            eqArray[i] ? imageParts[i].addClass("correct") : imageParts[i].removeClass("correct")
        });

        changePoints(correctBoxCount - oldCorrect);
        oldCorrect = correctBoxCount;

        if (correctBoxCount === boxLength) {
            gameOver = true;
            gameStart = false;
            setTimeout(function () {
                saveScore();
            }, 400)
        }
    }
}

function swapBoxes(boxes) {
    [boxes[1].style.top, boxes[1].style.left, boxes[0].style.top, boxes[0].style.left] 
        = [boxes[0].style.top, boxes[0].style.left, boxes[1].style.top, boxes[1].style.left];
    boxes[0].removeClass("selected");
    let [a, b] = [imageParts.findIndex(e => {
        return e === boxes[0];
    }), imageParts.findIndex(e => {
        return e === boxes[1];
    })];
    [imageParts[a], imageParts[b]] = [imageParts[b], imageParts[a]]
    // UNSELECT PIECE
    selected = -1;
}

//https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
function shuffle() {
    if (gameStart) {
        if (points === 0) {
            points = 0;
            oldCorrect = 0;
            for (let i = (boxLength) - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                swapBoxes([$(".box", i), $(".box", j)]);
            }
            // CONTROL
            boxControl();
        }
    }
}

function getTop5() {
    var http = new XMLHttpRequest();
    http.open('GET', '/getScores', true);
    http.onreadystatechange = function () {
        if (http.readyState == 4 && http.status == 200) {
            let parsed = JSON.parse(http.responseText);
            parsed.scores.sort((a, b) => b.score - a.score)
            $("#scores").innerHTML = "";
            for (let i = 0; i < (parsed.scores.length > 5 ? 5 : parsed.scores.length); i++) {
                let newScore = document.createElement('div');
                newScore.className = 'score';
                newScore.innerHTML = parsed.scores[i].name + " <b>" + parsed.scores[i].score + "</b>"
                $("#scores").appendChild(newScore);
            }
        }
    }
    http.send();
}

function saveScore() {
    let name = prompt("Please enter your name");
    name = name ? encodeURI(name) : "Anonymous";
    var http = new XMLHttpRequest();
    http.open('POST', '/postScore/' + name + '/' + points, true);
    http.onreadystatechange = function () {
        if (http.readyState == 4 && http.status == 200) {
            getTop5();
        }
    }
    http.send();
}

resetGame();