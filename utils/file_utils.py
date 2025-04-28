def load_words_from_file(file_path):
    """
    Load words from a file.
    
    Args:
        file_path (str): The path to the file.
        
    Returns:
        list: A list of dictionaries containing word information.
    """
    words = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            # 跳过第一行（表头）
            next(f)
            
            for line in f:
                line = line.strip()
                if not line:  # 跳过空行
                    continue
                
                # 尝试不同的分隔符
                for sep in [',', '\t', ';', '|']:
                    parts = line.split(sep)
                    if len(parts) >= 2:  # 至少需要日文和中文
                        japanese = parts[0].strip()
                        chinese = parts[1].strip()
                        
                        # 检查是否为全假名单词
                        is_kana = all(0x3040 <= ord(c) <= 0x309F or 0x30A0 <= ord(c) <= 0x30FF for c in japanese)
                        
                        # 如果有第三列，则认为是假名
                        kana = parts[2].strip() if len(parts) >= 3 else japanese
                        
                        words.append({
                            'japanese': japanese,
                            'kana': kana,
                            'chinese': chinese,
                            'is_kana': is_kana
                        })
                        break
    except Exception as e:
        print(f"Error reading file {file_path}: {str(e)}")
    return words
