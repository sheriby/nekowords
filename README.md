# Neko🐱Words

[中文文档](README_CN.md)

## Introduction
Neko🐱Words is a web-based Japanese vocabulary learning application that implements the Spaced Repetition System (SRS) to help users effectively memorize Japanese words. It provides an intuitive interface and intelligent review scheduling to optimize your Japanese learning experience.


## Features

### Multiple Learning Modes
- **Japanese to Chinese**: Practice recognizing Japanese words and recalling their meanings
- **Chinese to Japanese**: Challenge yourself to write Japanese words from their meanings
- **Kana to Meaning**: Focus on reading and understanding Japanese kana
- **Flashcard Mode**: Review words in a traditional flashcard style
- **Mixed Mode**: Combine different modes for comprehensive learning

### Smart Review System (SRS)
- **Intelligent Scheduling**: Based on the proven spaced repetition algorithm
- **Dynamic Intervals**: Review intervals adjust based on your performance
- **Four Difficulty Levels**: 
  - Again (1 minute)
  - Hard (5 minutes to 3 days)
  - Good (10 minutes to 7 days)
  - Easy (4 hours to 30 days)
- **Progress Tracking**: Monitor your learning statistics and review history

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
  - SQLite3
- **Frontend**:
  - HTML5
  - CSS3
  - Vanilla JavaScript
- **Database Schema**:
  - Words table
  - SRS records table
  - User progress table

### File Structure
```
nekowords/
├── app.py              # Main application file
├── init_db.py         # Database initialization
├── requirements.txt   # Python dependencies
├── static/           # Static files
│   ├── css/         # Stylesheets
│   ├── js/          # JavaScript files
│   └── images/      # Image assets
├── templates/        # HTML templates
└── data/            # Data storage
```

## Best Practices
- Keep vocabulary lists under 500 words for optimal learning
- Regular review is more effective than long study sessions
- Export and backup your progress regularly
- Use UTF-8 encoding for all import files

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.