export class Deck {
    constructor() {
        this.tiles = [];
        this.currentIndex = 0;
        this.totalTiles = 0;
    }

    async loadAllTiles() {
        const tileIds = Array.from({ length: 24 }, (_, i) => String(i + 1).padStart(2, '0'));
        const allTileData = [];

        for (const id of tileIds) {
            try {
                const response = await fetch(`./data/Base/${id}.json`);
                const data = await response.json();
                allTileData.push(data);
            } catch (error) {
                console.error(`Erreur lors du chargement de la tuile ${id}:`, error);
            }
        }

        this.totalTiles = allTileData.reduce((sum, data) => sum + data.quantity, 0);

        // ✅ MODIFICATION : Ne plus exclure la tuile 04, on l'ajoute normalement
        for (const data of allTileData) {
            const quantity = data.quantity; // Toutes les tuiles, y compris 04
            
            for (let i = 0; i < quantity; i++) {
                this.tiles.push({
                    id: data.id,
                    zones: data.zones
                });
            }
        }

        // Mélanger la pioche
        this.shuffle();
        
        // ✅ NOUVEAU : Forcer la tuile 04 en première position
        const index04 = this.tiles.findIndex(t => t.id === "04");
        if (index04 > 0) {
            const tile04 = this.tiles.splice(index04, 1)[0];
            this.tiles.unshift(tile04); // Mettre en premier
        }
    }

    shuffle() {
        for (let i = this.tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
        }
    }

    draw() {
        if (this.currentIndex >= this.tiles.length) {
            return null;
        }
        return this.tiles[this.currentIndex++];
    }

    remaining() {
        return this.tiles.length - this.currentIndex;
    }

    total() {
        return this.totalTiles;
    }
}
