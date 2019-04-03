// 160202034 - Ata Gülalan
// 160202015 - Oğuzhan Türker

var express = require('express')
var app = express()
var fs = require('fs')

app.post('/postScore/:name/:score', function (req, res) {
  fs.readFile("enyüksekskor.txt", "utf8", function(err, data){
    if(err) throw err

    let oldJSON = JSON.parse(data);
    oldJSON.scores.push({
      "name": req.params.name,
      "score": req.params.score
    })

    fs.writeFile("enyüksekskor.txt", JSON.stringify(oldJSON), function(err) {
      if(err) {
        return console.log(err);
      }
      res.sendStatus(200)
    });
  }); 
})

app.get('/getScores', function (req, res) {
  fs.readFile("enyüksekskor.txt", "utf8", function(err, data){
    if(err) throw err
    res.send(data)
  });
})

app.use('/', express.static('public'))
app.listen(4540)