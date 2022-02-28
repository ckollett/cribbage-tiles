var lastGameWinner;

function getLastWinner() {
  return new Promise(function (resolve, reject) {
      const url = "https://sheets.googleapis.com/v4/spreadsheets/1gCBMVv-61otx1OEZQKz4_sPqXpFQSbWcJC6Vx1FlfhE/values/Latest!A:C?key=AIzaSyDOUQdHsH-KQZje1ipkNGowjA_fvXfipak&majorDimension=COLUMNS";
      var xhr = new XMLHttpRequest();
      xhr.responseType = "json";

      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
              const winner = xhr.response.values[1];
              updateCribSheetLink(winner.length+1);
              resolve(winner[winner.length-1]);
          } catch (e) {
              resolve(null);
          }
        } else {
            resolve(null);
        }
      };
      xhr.onerror = function () {
          resolve(null);
      };

      xhr.open('GET', url, true);
      xhr.send('');    
  });
}

function updateCribSheetLink(rowNum) {
    // Update the crib sheet link to go to the first empty row.
    const sheetLink = document.getElementById('cribsheetlink');
    var link = sheetLink.getAttribute('href');
    link += '&range=A' + rowNum;
    sheetLink.setAttribute('href', link);              
}
