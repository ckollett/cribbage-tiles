var lastGameWinner;

function getLastScore() {
  const url = "https://sheets.googleapis.com/v4/spreadsheets/1gCBMVv-61otx1OEZQKz4_sPqXpFQSbWcJC6Vx1FlfhE/values/Results!A:C?key=AIzaSyDOUQdHsH-KQZje1ipkNGowjA_fvXfipak&majorDimension=COLUMNS";
  var xhr = new XMLHttpRequest();
  xhr.responseType = "json";
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      showLastScore(xhr.response);
    }
  }

  xhr.open('GET', url, true);
  xhr.send('');    
}

function showLastScore(scoreData) {
    const winner = scoreData.values[1];
    lastGameWinner = winner[winner.length-1];
    const msg = "Last game winner: " + lastGameWinner;
    document.getElementById('lastscore').innerHTML = msg;
}