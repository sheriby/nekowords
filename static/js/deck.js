/**
 * Deck management functions
 */

import { loadDecks, importDecks, deleteDeck as apiDeleteDeck } from './api.js';
import { startFlashcardMode } from './flashcard.js';

/**
 * Render decks in the deck container
 * 
 * @param {Array} decks - Array of deck objects
 */
export function renderDecks(decks) {
    const decksContainer = document.getElementById('decks');
    decksContainer.innerHTML = '';

    if (decks.length === 0) {
        decksContainer.innerHTML = '<div class="empty-deck">暂无词单，请导入</div>';
        return;
    }

    decks.forEach(deck => {
        const deckElement = document.createElement('div');
        deckElement.className = 'deck-item';
        deckElement.innerHTML = `
            <div class="deck-info">
                <span class="deck-name">${deck.name}</span>
                <span class="deck-progress">${deck.memory_cnt}/${deck.total}</span>
            </div>
            <div class="deck-actions">
                <button class="start-deck-btn" data-deck-id="${deck.id}">开始记忆</button>
                <button class="delete-deck-btn delete-btn" data-deck-id="${deck.id}">删除</button>
            </div>
        `;
        decksContainer.appendChild(deckElement);
    });

    // Add event listeners to buttons
    document.querySelectorAll('.start-deck-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const deckId = parseInt(e.target.dataset.deckId);
            startDeck(deckId);
        });
    });

    document.querySelectorAll('.delete-deck-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const deckId = parseInt(e.target.dataset.deckId);
            deleteDeck(deckId);
        });
    });
}

/**
 * Load and render decks
 */
export async function loadAndRenderDecks() {
    try {
        const decks = await loadDecks();
        renderDecks(decks);
    } catch (error) {
        alert(error.message);
    }
}

/**
 * Start a deck
 * 
 * @param {number} deckId - Deck ID
 */
export async function startDeck(deckId) {
    try {
        await startFlashcardMode(deckId);
    } catch (error) {
        alert(error.message);
    }
}

/**
 * Delete a deck
 * 
 * @param {number} deckId - Deck ID
 */
export async function deleteDeck(deckId) {
    if (!confirm('确定要删除这个词单吗？')) {
        return;
    }

    try {
        const response = await apiDeleteDeck(deckId);
        if (response.error) {
            throw new Error(response.error);
        }
        alert('词单删除成功');
        await loadAndRenderDecks();
    } catch (error) {
        alert(error.message);
    }
}

/**
 * Handle file upload for importing decks
 * 
 * @param {Event} event - File input change event
 */
export async function handleFileUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
        const response = await importDecks(files);
        if (response.error) {
            throw new Error(response.error);
        }

        alert(`成功导入 ${response.success_count} 个词单，共 ${response.total_words} 个单词`);
        event.target.value = ''; // 清空文件选择
        await loadAndRenderDecks();
    } catch (error) {
        alert(error.message);
    }
}
