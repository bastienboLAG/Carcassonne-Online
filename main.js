console.log("Le script main.js est bien lancé !");

async function test() {
    const board = document.getElementById('board');
    if(!board) {
        alert("Attention : Balise #board introuvable !");
        return;
    }

    // On crée un carré de couleur pour voir si la grille répond
    const testCarre = document.createElement('div');
    testCarre.style.width = "100px";
    testCarre.style.height = "100px";
    testCarre.style.backgroundColor = "red";
    testCarre.style.gridColumn = "50";
    testCarre.style.gridRow = "50";
    testCarre.innerText = "TEST";
    
    board.appendChild(testCarre);
    console.log("Carré rouge ajouté à la grille");
}

test();
