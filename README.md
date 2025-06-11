# PTT/Dcard Crawler with Word Frequency Analysis

一個用於爬取 PTT 和 Dcard 文章的 Python 爬蟲程式，具有詞頻分析功能。這個程式可以自動處理 over18 驗證，並將爬取的文章內容進行詞頻統計和視覺化。

## 功能特點

- 🔐 自動處理 over18 驗證
- 📄 支援自定義爬取頁數
- 🌐 使用真實瀏覽器 User-Agent
- 🧹 清理文章內容，移除推文和簽名檔
- 💾 將結果儲存為 Excel 檔案和 SQLite 資料庫
- 📝 完整的錯誤處理和日誌記錄
- 📊 詞頻分析功能
  - 使用 jieba 進行中文分詞
  - 統計熱門關鍵詞
  - 視覺化詞頻分布
- 🖥️ 圖形化介面
  - 直觀的操作介面
  - 即時顯示分析結果
  - 支援圖表視覺化

## 系統需求

- Python 3.6 或更高版本
- 以下 Python 套件：
  - requests
  - beautifulsoup4
  - jieba
  - matplotlib
  - tkinter (Python 標準庫)

## 安裝步驟

1. 克隆專案：
```bash
git clone https://github.com/susuyummy/ptt-dcard-crawler.git
cd ptt-dcard-crawler
```

2. 安裝所需套件：
```bash
pip install -r requirements.txt
```

## 使用方法

### 1. 使用圖形化介面

執行 GUI 程式：
```bash
python word_freq_gui.py
```

在圖形化介面中：
1. 選擇資料來源（PTT 或 Dcard）
2. 輸入看板名稱
3. 設定爬取頁數
4. 點擊「分析」按鈕
5. 查看分析結果和圖表

### 2. 使用 Python API

```python
from ptt_dcard_crawler import PTTDcardCrawler
from utils.word_counter import get_word_frequency_stats

# 建立爬蟲實例
crawler = PTTDcardCrawler()

# 爬取文章
articles = crawler.fetch_articles(source='ptt', board='Gossiping', pages=1)

# 分析詞頻
all_text = " ".join(article['content'] for article in articles)
stats = get_word_frequency_stats(all_text)

# 顯示結果
print(f"總字數: {stats['total_words']}")
print(f"不重複詞數: {stats['unique_words']}")
print("\n熱門關鍵詞:")
for word, freq in stats['top_keywords']:
    print(f"{word}: {freq}")
```

## 輸出格式

### 1. 資料庫結構 (articles.db)
- articles 表格：
  - id (主鍵)
  - title (標題)
  - author (作者)
  - date (日期)
  - url (連結)
  - content (內容)
  - word_freq (詞頻統計 JSON)
  - created_at (建立時間)

### 2. 詞頻分析結果
- 總字數統計
- 不重複詞數統計
- 熱門關鍵詞列表
- 詞頻分布圖表

## 注意事項

- 請遵守 PTT 和 Dcard 的使用規範
- 建議在爬取時加入適當的延遲，避免對伺服器造成負擔
- 爬取的內容僅供個人研究使用
- 請勿用於商業用途

## 常見問題

1. Q: 為什麼需要 over18 驗證？
   A: PTT 八卦板需要確認使用者已滿 18 歲才能訪問。

2. Q: 如何修改爬取頁數？
   A: 在 GUI 中調整頁數，或在使用 API 時修改 `pages` 參數。

3. Q: 如何處理爬取失敗的情況？
   A: 程式會自動記錄錯誤到日誌檔案，並繼續爬取下一篇文章。

4. Q: 詞頻分析支援哪些語言？
   A: 目前主要支援中文，使用 jieba 進行分詞。

## 貢獻指南

歡迎提交 Pull Request 或開 Issue 來改進這個專案！

1. Fork 這個專案
2. 創建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟一個 Pull Request

## 授權

MIT License

## 作者

susuyummy

## 致謝

- PTT 和 Dcard 提供平台
- Python 社群提供的優秀套件
- 所有貢獻者的支持
