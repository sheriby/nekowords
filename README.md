# Neko🐱Words

[中文文档](README_CN.md)

## Introduction
Neko🐱Words is a web-based Japanese vocabulary learning application that implements the Free Spaced Repetition Scheduler (FSRS) algorithm to help users effectively memorize Japanese words. FSRS is a cutting-edge, scientifically-optimized spaced repetition algorithm that significantly improves learning efficiency compared to traditional SRS systems. The application provides an intuitive interface and intelligent review scheduling to optimize your Japanese learning experience.


## Features

### Multiple Learning Modes
- **Japanese to Chinese**: Practice recognizing Japanese words and recalling their meanings
- **Chinese to Japanese**: Challenge yourself to write Japanese words from their meanings
- **Kana to Meaning**: Focus on reading and understanding Japanese kana
- **Flashcard Mode**: Review words in a traditional flashcard style
- **Mixed Mode**: Combine different modes for comprehensive learning

### Free Spaced Repetition Scheduler (FSRS)
- **Advanced Algorithm**: Implements the cutting-edge FSRS algorithm developed by Jarrett Ye (L.M. Ye)
- **Scientific Memory Model**: Based on a sophisticated memory model that accurately predicts forgetting curves
- **Machine Learning Optimized**: Parameters derived from extensive analysis of real-world learning data
- **Four Difficulty Ratings**:
  - Again: For completely forgotten items (resets stability)
  - Hard: For difficult recalls (small stability increase)
  - Good: For successful recalls with some effort (moderate stability increase)
  - Easy: For effortless recalls (large stability increase)
- **Adaptive Scheduling**: Dynamically adjusts intervals based on:
  - Item difficulty
  - Memory stability
  - Retrievability
  - Review history
- **Optimal Retention**: Targets 90% retention rate while minimizing review frequency
- **Progress Tracking**: Comprehensive statistics on learning progress and memory strength

### Import/Export Functionality
- **Flexible File Import**:
  - Support CSV files with multiple delimiters (comma, tab, semicolon)
  - Batch import multiple files
  - Auto-detection of file encoding
- **Smart Word Processing**:
  - Automatic kana detection
  - Duplicate word checking
  - Invalid format warning
- **Export Features**:
  - Export wrong answers for focused review
  - Export learning progress
  - Support for multiple export formats

### User Interface
- **Clean Design**: Minimalist interface focused on learning
- **Progress Indicators**:
  - Real-time correct/incorrect statistics
  - Review progress visualization
  - SRS level indicators
- **Keyboard Shortcuts**: Efficient input and navigation
- **Mobile Responsive**: Learn on any device

## Installation

### Prerequisites
- Python 3.7 or higher
- pip package manager
- Modern web browser

### Setup Steps
1. **Clone the Repository**
   ```bash
   git clone https://github.com/sheriby/nekowords.git
   cd nekowords
   ```

2. **Create Virtual Environment (Recommended)**
   ```bash
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Initialize Database**
   ```bash
   python init_db.py
   ```

## Usage

### Starting the Application
1. **Using Start Script**
   ```bash
   # Windows
   start.bat

   # Linux/Mac
   ./start.sh
   ```

2. **Manual Start**
   ```bash
   python app.py
   ```

3. Open your browser and navigate to `http://localhost:5000`

### Importing Vocabulary
1. Prepare your CSV file in the following format:
   ```csv
   Japanese,Chinese,Kana(Optional)
   日本語,中文,にほんご
   ```

2. Click "Import" button on the main interface
3. Select your CSV file(s)
4. Confirm the import settings

### Learning Process
1. **Select Learning Mode**
   - Choose from available learning modes
   - Configure review settings if needed

2. **Study Session**
   - Type answers in the input field
   - Use keyboard shortcuts for efficiency:
     - Enter: Submit answer
     - Tab: Skip current word
     - Esc: Return to menu

3. **Review**
   - Rate your recall difficulty
   - Review wrong answers
   - Export progress if needed

## Technical Details

### Technology Stack
- **Backend**:
  - Python 3.7+
  - Flask 2.0.1
  - SQLite3 (with WAL mode for improved concurrency)
- **Frontend**:
  - HTML5
  - CSS3
  - Vanilla JavaScript (ES6+)
  - Modular architecture
- **Database Schema**:
  - Words table: Stores vocabulary items
  - FSRS records table: Tracks memory state for each item
  - User progress table: Maintains learning statistics

### FSRS Implementation Details
- **Memory Model Parameters**:
  - Stability: Measures how well an item is retained in memory
  - Difficulty: Represents the inherent complexity of an item (1-5 scale)
  - Retrievability: Probability of successful recall at a given time
- **State Transitions**:
  - NEW → LEARNING/REVIEW: Initial learning phase
  - REVIEW → REVIEW: Successful reviews strengthen stability
  - REVIEW → RELEARNING: Failed reviews trigger relearning
  - RELEARNING → REVIEW: Relearned items return to review cycle
- **Scheduling Algorithm**:
  - Uses 17 optimized parameters for precise interval calculations
  - Adjusts intervals based on item difficulty and response quality
  - Implements exponential backoff for forgotten items
  - Applies power-law forgetting curve model
- **Performance Optimizations**:
  - Batch processing for database operations
  - Connection pooling to reduce database locks
  - Efficient memory usage with targeted queries
  - Asynchronous data updates

### File Structure
```
nekowords/
├── app.py                # Main application file
├── init_db.py            # Database initialization
├── requirements.txt      # Python dependencies
├── db/                   # Database related modules
│   ├── __init__.py       # Database connection management
│   └── schema.py         # Database schema definitions
├── models/               # Data models
│   ├── deck.py           # Deck management
│   ├── fsrs.py           # FSRS algorithm implementation
│   └── word.py           # Word management
├── routes/               # API routes
│   ├── deck_routes.py    # Deck related endpoints
│   ├── fsrs_routes.py    # FSRS related endpoints
│   └── word_routes.py    # Word related endpoints
├── static/               # Static files
│   ├── css/              # Stylesheets
│   ├── js/               # JavaScript files
│   │   ├── api.js        # API client
│   │   ├── app.js        # Application initialization
│   │   ├── config.js     # Configuration
│   │   ├── flashcard.js  # Flashcard mode
│   │   ├── fsrs.js       # FSRS client-side implementation
│   │   ├── main.js       # Main entry point
│   │   └── ui.js         # UI components
│   └── images/           # Image assets
├── templates/            # HTML templates
│   └── index.html        # Main application template
├── utils/                # Utility functions
│   └── file_utils.py     # File handling utilities
└── temp/                 # Temporary file storage
```

## Best Practices

### Learning Efficiency
- Keep vocabulary lists under 500 words for optimal learning
- Regular review is more effective than long study sessions
- Trust the FSRS algorithm's scheduling - avoid cramming
- Review items when they're scheduled, not before or long after

### FSRS Usage Tips
- Be honest with your difficulty ratings for optimal scheduling
- Use "Again" only when you completely forgot the item
- Use "Hard" when you remembered with significant effort
- Use "Good" for successful recalls with some effort (most common)
- Use "Easy" only when recall was effortless and automatic

### Technical Tips
- Export and backup your progress regularly
- Use UTF-8 encoding for all import files
- For large imports (1000+ words), expect some initial processing time
- Database operations use batch processing to prevent locks

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.