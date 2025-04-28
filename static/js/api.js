/**
 * API calls to the backend
 */

/**
 * Load decks from the server
 *
 * @returns {Promise<Array>} - Promise resolving to an array of deck objects
 */
export async function loadDecks() {
    try {
        const response = await fetch('/get_decks');
        return await response.json();
    } catch (error) {
        console.error('加载词单失败:', error);
        throw new Error('加载词单失败，请重试');
    }
}

/**
 * Load words for a deck from the server
 *
 * @param {number} deckId - Deck ID
 * @param {number} limit - Maximum number of questions to return
 * @returns {Promise<Array>} - Promise resolving to an array of questions
 */
export async function loadDeckWords(deckId, limit = 10) {
    try {
        const response = await fetch('/get_deck_words', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                deck_id: deckId,
                limit: limit
            })
        });
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        return data;
    } catch (error) {
        console.error('加载词单单词失败:', error);
        throw new Error('加载词单单词失败，请重试');
    }
}

/**
 * Update FSRS data on the server
 *
 * @param {number} recordId - FSRS record ID
 * @param {string} difficulty - Difficulty level ('重来', '困难', '良好', or '简单')
 * @param {number} deckId - Deck ID
 * @returns {Promise<Object>} - Promise resolving to a response object
 */
export async function updateFSRSData(recordId, difficulty, deckId) {
    try {
        console.log(`Updating FSRS data: record_id=${recordId}, difficulty=${difficulty}, deck_id=${deckId}`);

        const response = await fetch('/update_fsrs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                record_id: recordId,
                difficulty: difficulty,
                deck_id: deckId
            })
        });

        const result = await response.json();
        console.log('FSRS update response:', result);

        return result;
    } catch (error) {
        console.error('更新FSRS数据失败:', error);
        throw new Error('更新FSRS数据失败，请重试');
    }
}

/**
 * Delete a deck on the server
 *
 * @param {number} deckId - Deck ID
 * @returns {Promise<Object>} - Promise resolving to a response object
 */
export async function deleteDeck(deckId) {
    try {
        const response = await fetch('/delete_deck', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ deck_id: deckId })
        });
        return await response.json();
    } catch (error) {
        console.error('删除词单失败:', error);
        throw new Error('删除词单失败，请重试');
    }
}

/**
 * Import decks from files
 *
 * @param {FileList} files - Files to import
 * @returns {Promise<Object>} - Promise resolving to a response object
 */
export async function importDecks(files) {
    try {
        const formData = new FormData();
        for (const file of files) {
            formData.append('files', file);
        }

        const response = await fetch('/import_decks', {
            method: 'POST',
            body: formData
        });
        return await response.json();
    } catch (error) {
        console.error('导入词单失败:', error);
        throw new Error('导入词单失败，请重试');
    }
}

/**
 * Export wrong answers to a CSV file
 *
 * @param {Array} wrongAnswers - Array of wrong answer objects
 * @returns {Promise<void>} - Promise resolving when the file is downloaded
 */
export async function exportWrongAnswers(wrongAnswers) {
    try {
        const response = await fetch('/export_wrong_answers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ wrong_answers: wrongAnswers })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'wrong_answers.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } else {
            const data = await response.json();
            throw new Error(data.error || '导出失败');
        }
    } catch (error) {
        console.error('导出错题失败:', error);
        throw new Error('导出错题失败，请重试');
    }
}
