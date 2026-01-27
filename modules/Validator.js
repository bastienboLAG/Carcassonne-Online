/**
 * Validator.js
 * Gère la logique de compatibilité des bords entre deux tuiles.
 */

// Table de correspondance pour les rotations (NL -> ET -> SR -> WB)
const rotationMap = {
    "north": "east", "east": "south", "south": "west", "west": "north",
    "north-left": "east-top", "east-top": "south-right", "south-right": "west-bottom", "west-bottom": "north-left",
    "north-right": "east-bottom", "east-bottom": "south-left", "south-left": "west-top", "west-top": "north-right"
};

// Table des segments opposés qui se touchent physiquement
const opposites = {
    "north": "south", "south": "north", "east": "west", "west": "east",
    "north-left": "south-left", "south-left": "north-left",
    "north-right": "south-right", "south-right": "north-right",
    "east-top": "west-top", "west-top": "east-top",
    "east-bottom": "west-bottom", "west-bottom": "east-bottom"
};

/**
 * Traduit un segment JSON selon la rotation de la tuile.
 * @param {string} originalKey - La clé dans le JSON (ex: "north-left")
 * @param {number} rotation - Degrés (0, 90, 180, 270)
 * @returns {string} - La clé physique après rotation
 */
function getPhysicalKey(originalKey, rotation) {
    let key = originalKey;
    let steps = (rotation / 90) % 4;
    for (let i = 0; i < steps; i++) {
        key = rotationMap[key];
    }
    return key;
}

/**
 * Compare deux tuiles sur un bord donné.
 * @param {Tile} tileA - La tuile qu'on veut poser
 * @param {number} rotA - Sa rotation
 * @param {Tile} tileB - La tuile déjà posée
 * @param {number} rotB - Sa rotation
 * @param {string} side - Le côté de tileA qui touche tileB ("north", "south", etc.)
 */
export function areEdgesCompatible(tileA, rotA, tileB, rotB, side) {
    // Déterminer les segments de tileA sur le côté 'side'
    // On doit trouver quelles clés JSON de tileA arrivent sur ce 'side' physique
    const segmentsToTest = [];
    
    // On parcourt toutes les clés possibles du JSON
    const allKeys = Object.keys(opposites);
    
    for (const jsonKey of allKeys) {
        if (getPhysicalKey(jsonKey, rotA) === side || getPhysicalKey(jsonKey, rotA).startsWith(side + '-')) {
            segmentsToTest.push(jsonKey);
        }
    }

    for (const keyA of segmentsToTest) {
        const physicalKeyA = getPhysicalKey(keyA, rotA);
        const physicalKeyB = opposites[physicalKeyA];
        
        // On doit trouver quelle clé JSON de tileB correspond au physicalKeyB
        let keyB = null;
        for (const k of allKeys) {
            if (getPhysicalKey(k, rotB) === physicalKeyB) {
                keyB = k;
                break;
            }
        }

        if (keyB) {
            const zoneIdA = tileA.edges[keyA];
            const zoneIdB = tileB.edges[keyB];

            if (zoneIdA && zoneIdB) {
                const typeA = tileA.zones[zoneIdA].type;
                const typeB = tileB.zones[zoneIdB].type;
                if (typeA !== typeB) return false;
            }
        }
    }
    return true;
}