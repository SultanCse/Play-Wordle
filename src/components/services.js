export const rowColorFilter = (row, index) => {
    for(let i =0; i<row.length; i++){
      if(row[i].color == ' #B4A037'){
        for(let j =i+1; j<row.length; j++){
          if(row[i].char == row[j].char && row[j].color=='#538D4C'){
            row.splice(i,1);
            j--;
          }else if(row[i].char == row[j].char && row[j].color==' #B4A037'){
            row.splice(j,1);
            j--;
          }
        }
      } 
      else if(row[i].color == '#538D4C'){
        for(let j =i+1; j<row.length; j++){
          if(row[i].char == row[j].char && row[j].color==' #B4A037'){
            row.splice(j,1);
            j--;
          }else if(row[i].char == row[j].char && row[j].color=='#538D4C'){
            row.splice(i,1);
            j--;
          }
        }
      } 
      else if(row[i].color == '#3A3A3C'){
        for(let j =i+1; j<row.length; j++){
          if(row[i].char == row[j].char && row[j].color=='#3A3A3C'){
            row.splice(i,1);
            j--;
          }
        }
      }

    }
}