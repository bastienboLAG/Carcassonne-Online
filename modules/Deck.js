export class Deck {
    constructor() {
        this.tiles = [];       // Pioche complète (avec doublons selon quantity)
        this.currentIndex = 0; // Index de la prochaine tuile à piocher
        this.totalTiles = 0;   // ✅ NOUVEAU : Nombre total de tuiles dans le jeu
    }

    /**
     * Charge toutes les tuiles depuis les JSON et crée la pioche
     */
    async loadAllTiles() {
        const tileIds = Array.from({ length: 24 }, (_, i) => String(i + 1).padStart(2, '0'));
        const allTileData = [];

        // Charger tous les JSON
        for (const id of tileIds) {
            try {
                const response = await fetch(`./data/Base/${id}.json`);
                const data = await response.json();
                allTileData.push(data);
            } catch (error) {
                console.error(`Erreur lors du chargement de la tuile ${id}:`, error);
            }
        }

        // Calculer le total de tuiles AVANT de créer la pioche
        this.totalTiles = allTileData.reduce((sum, data) => sum + data.quantity, 0);

        // Créer la pioche avec les bonnes quantités (sauf tuile 04 qui est la tuile de départ)
        for (const data of allTileData) {
            const quantity = data.id === "04" ? data.quantity - 1 : data.quantity;
            
            for (let i = 0; i < quantity; i++) {
                this.tiles.push({
                    id: data.id,
                    zones: data.zones
                });
            }
        }

        // Mélanger la pioche
        this.shuffle();
    }

    /**
     * Mélange la pioche (algorithme de Fisher-Yates)
     */
    shuffle() {
        for (let i = this.tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
        }
    }

    /**
     * Pioche une tuile
     * @returns {Object|null} Les données de la tuile ou null si la pioche est vide
     */
    draw() {
        if (this.currentIndex >= this.tiles.length) {
            return null; // Pioche vide
        }
        return this.tiles[this.currentIndex++];
    }

    /**
     * Retourne le nombre de tuiles restantes dans la pioche
     * @returns {number}
     */
    remaining() {
        return this.tiles.length - this.currentIndex;
    }

    /**
     * Retourne le nombre total de tuiles dans le jeu
     * @returns {number}
     */
    total() {
        return this.totalTiles; // ✅ CORRECTION : Retourne le vrai total (72)
    }
}
