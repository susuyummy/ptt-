import requests
from bs4 import BeautifulSoup
import sqlite3
import time
import random
import json
from datetime import datetime, timedelta
import argparse
from utils.word_counter import analyze_articles

class PTTDcardCrawler:
    def __init__(self):
        """初始化爬蟲"""
        # 設定 User-Agent
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
        }
        
        # 初始化資料庫
        self.conn = sqlite3.connect('articles.db', check_same_thread=False)
        self.cursor = self.conn.cursor()
        
        # 建立資料表
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                publish_time TEXT,
                source TEXT NOT NULL,
                author TEXT,
                content TEXT,
                word_freq TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 建立索引
        self.cursor.execute('CREATE INDEX IF NOT EXISTS idx_title ON articles(title)')
        self.cursor.execute('CREATE INDEX IF NOT EXISTS idx_source ON articles(source)')
        self.cursor.execute('CREATE INDEX IF NOT EXISTS idx_publish_time ON articles(publish_time)')
        
        self.conn.commit()
    
    def fetch_articles(self, source='ptt', board='Gossiping', pages=1):
        """抓取指定來源和看板的文章
        
        Args:
            source (str): 來源網站 ('ptt' 或 'dcard')
            board (str): 看板名稱
            pages (int): 要抓取的頁數
            
        Returns:
            list: 文章列表
        """
        try:
            if source.lower() == 'ptt':
                return self.get_ptt_articles(board, pages)
            elif source.lower() == 'dcard':
                return self.get_dcard_articles(board, pages)
            else:
                raise ValueError(f"不支援的來源: {source}")
        except Exception as e:
            print(f"抓取文章時發生錯誤: {str(e)}")
            return []

    def get_ptt_articles(self, board='Gossiping', pages=1):
        """抓取 PTT 文章
        
        Args:
            board (str): 看板名稱
            pages (int): 要抓取的頁數
            
        Returns:
            list: 文章列表
        """
        try:
            articles = []
            current_page = 0
            max_retries = 3
            session = requests.Session()
            session.headers.update(self.headers)
            
            # 先訪問看板首頁以獲取 cookie
            index_url = f'https://www.ptt.cc/bbs/{board}/index.html'
            response = session.get(index_url)
            
            # 檢查是否需要年齡驗證
            if 'over18' in response.url:
                # 提交年齡驗證表單
                data = {
                    'from': f'/bbs/{board}/index.html',
                    'yes': 'yes'
                }
                session.post('https://www.ptt.cc/ask/over18', data=data)
            
            while current_page < pages:
                # 訪問 PTT 看板
                url = f'https://www.ptt.cc/bbs/{board}/index{current_page + 1}.html'
                print(f"正在抓取第 {current_page + 1} 頁: {url}")
                
                for retry in range(max_retries):
                    try:
                        response = session.get(url, timeout=15)
                        
                        if response.status_code == 200:
                            soup = BeautifulSoup(response.text, 'html.parser')
                            article_links = soup.select('div.title > a')
                            
                            if not article_links:
                                print('DEBUG: soup.prettify() 前 500 字如下:')
                                print(soup.prettify()[:500])
                            if not article_links:
                                print("沒有更多文章")
                                break
                            
                            for link in article_links:
                                try:
                                    article_url = f"https://www.ptt.cc{link['href']}"
                                    article_response = session.get(article_url, timeout=15)
                                    
                                    if article_response.status_code == 200:
                                        article_soup = BeautifulSoup(article_response.text, 'html.parser')
                                        
                                        # 提取文章資訊
                                        title = link.text.strip()
                                        meta_values = article_soup.select('span.article-meta-value')
                                        if len(meta_values) >= 4:
                                            author = meta_values[0].text.strip()
                                            publish_time = meta_values[3].text.strip()
                                        else:
                                            author = "未知"
                                            publish_time = "未知"
                                            
                                        content_div = article_soup.select_one('div#main-content')
                                        if content_div:
                                            content = content_div.text.strip()
                                            # 清理內容
                                            content = content.split('--')[0]  # 移除簽名檔
                                            content = '\n'.join(line for line in content.split('\n') 
                                                              if not line.startswith('※ 發信站:'))
                                        else:
                                            content = ""
                                        
                                        article_data = {
                                            'title': title,
                                            'url': article_url,
                                            'publish_time': publish_time,
                                            'source': f'PTT-{board}',
                                            'author': author,
                                            'content': content
                                        }
                                        
                                        articles.append(article_data)
                                        print(f"找到文章: {title}")
                                        
                                        # 隨機延遲 1-2 秒
                                        time.sleep(random.uniform(1, 2))
                                except Exception as e:
                                    print(f"處理文章時發生錯誤: {str(e)}")
                                    continue
                            
                            current_page += 1
                            # 隨機延遲 2-3 秒
                            time.sleep(random.uniform(2, 3))
                            break
                        else:
                            print(f"訪問失敗 (嘗試 {retry + 1}/{max_retries}): {response.status_code}")
                            if retry < max_retries - 1:
                                time.sleep(random.uniform(3, 5))
                    except requests.exceptions.Timeout:
                        print(f"訪問超時 (嘗試 {retry + 1}/{max_retries})")
                        if retry < max_retries - 1:
                            time.sleep(random.uniform(3, 5))
                    except Exception as e:
                        print(f"訪問時發生錯誤 (嘗試 {retry + 1}/{max_retries}): {str(e)}")
                        if retry < max_retries - 1:
                            time.sleep(random.uniform(3, 5))
            
            print(f"成功抓取 PTT 文章，共 {len(articles)} 篇")
            return articles
            
        except Exception as e:
            print(f"抓取 PTT 文章時發生錯誤: {str(e)}")
            return []

    def get_dcard_articles(self, board='funny', pages=1):
        """抓取 Dcard 文章
        
        Args:
            board (str): 看板名稱
            pages (int): 要抓取的頁數
            
        Returns:
            list: 文章列表
        """
        try:
            articles = []
            current_page = 0
            max_retries = 3
            
            while current_page < pages:
                # 訪問 Dcard API
                url = f'https://www.dcard.tw/_api/forums/{board}/posts?popular=false&limit=30&before={current_page * 30}'
                print(f"正在抓取第 {current_page + 1} 頁: {url}")
                
                for retry in range(max_retries):
                    try:
                        response = requests.get(
                            url, 
                            headers=self.headers,
                            timeout=15
                        )
                        
                        if response.status_code == 200:
                            data = response.json()
                            
                            if not data:
                                print("沒有更多文章")
                                break
                            
                            for post in data:
                                try:
                                    article_url = f"https://www.dcard.tw/f/{board}/p/{post['id']}"
                                    article_response = requests.get(
                                        f"https://www.dcard.tw/_api/posts/{post['id']}",
                                        headers=self.headers,
                                        timeout=15
                                    )
                                    
                                    if article_response.status_code == 200:
                                        article_data = article_response.json()
                                        
                                        # 提取文章資訊
                                        title = article_data['title']
                                        author = article_data['school'] or '匿名'
                                        publish_time = article_data['createdAt']
                                        content = article_data['content']
                                        
                                        article_data = {
                                            'title': title,
                                            'url': article_url,
                                            'publish_time': publish_time,
                                            'source': f'Dcard-{board}',
                                            'author': author,
                                            'content': content
                                        }
                                        
                                        articles.append(article_data)
                                        print(f"找到文章: {title}")
                                        
                                        # 隨機延遲 1-2 秒
                                        time.sleep(random.uniform(1, 2))
                                except Exception as e:
                                    print(f"處理文章時發生錯誤: {str(e)}")
                                    continue
                            
                            current_page += 1
                            # 隨機延遲 2-3 秒
                            time.sleep(random.uniform(2, 3))
                            break
                        else:
                            print(f"訪問失敗 (嘗試 {retry + 1}/{max_retries}): {response.status_code}")
                            if retry < max_retries - 1:
                                time.sleep(random.uniform(3, 5))
                    except requests.exceptions.Timeout:
                        print(f"訪問超時 (嘗試 {retry + 1}/{max_retries})")
                        if retry < max_retries - 1:
                            time.sleep(random.uniform(3, 5))
                    except Exception as e:
                        print(f"訪問時發生錯誤 (嘗試 {retry + 1}/{max_retries}): {str(e)}")
                        if retry < max_retries - 1:
                            time.sleep(random.uniform(3, 5))
            
            print(f"成功抓取 Dcard 文章，共 {len(articles)} 篇")
            return articles
            
        except Exception as e:
            print(f"抓取 Dcard 文章時發生錯誤: {str(e)}")
            return []
    
    def save_articles(self, articles):
        """保存文章到資料庫
        
        Args:
            articles (list): 文章列表
        """
        try:
            new_count = 0
            duplicate_count = 0
            error_count = 0
            
            # 分析詞頻
            word_freq = analyze_articles(articles)
            word_freq_json = json.dumps(dict(word_freq), ensure_ascii=False)
            
            for article in articles:
                try:
                    # 檢查文章是否已存在
                    self.cursor.execute('''
                        SELECT id FROM articles 
                        WHERE title = ? AND url = ? AND source = ?
                    ''', (article['title'], article['url'], article['source']))
                    
                    if not self.cursor.fetchone():
                        # 插入新文章
                        self.cursor.execute('''
                            INSERT INTO articles (title, url, publish_time, source, author, content, word_freq)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            article['title'],
                            article['url'],
                            article['publish_time'],
                            article['source'],
                            article['author'],
                            article['content'],
                            word_freq_json
                        ))
                        new_count += 1
                    else:
                        duplicate_count += 1
                except Exception as e:
                    print(f"保存文章時發生錯誤: {str(e)}")
                    error_count += 1
                    continue
            
            self.conn.commit()
            print(f"成功保存 {new_count} 篇新文章")
            print(f"跳過 {duplicate_count} 篇重複文章")
            if error_count > 0:
                print(f"保存失敗 {error_count} 篇文章")
            return new_count
        except Exception as e:
            print(f"保存文章時發生錯誤: {str(e)}")
            return 0
    
    def get_all_articles(self):
        """獲取所有文章
        
        Returns:
            list: 文章列表
        """
        try:
            self.cursor.execute('''
                SELECT title, url, publish_time, source, author, content
                FROM articles
                ORDER BY publish_time DESC
            ''')
            return self.cursor.fetchall()
        except Exception as e:
            print(f"獲取文章時發生錯誤: {str(e)}")
            return []
    
    def get_statistics(self):
        """獲取統計資訊
        
        Returns:
            dict: 包含統計資訊的字典
        """
        try:
            stats = {}
            
            # 獲取總文章數
            self.cursor.execute('SELECT COUNT(*) FROM articles')
            stats['total_articles'] = self.cursor.fetchone()[0]
            
            # 獲取各來源文章數
            self.cursor.execute('''
                SELECT source, COUNT(*) as count 
                FROM articles 
                GROUP BY source
            ''')
            stats['source_count'] = dict(self.cursor.fetchall())
            
            # 獲取最近24小時文章數
            self.cursor.execute('''
                SELECT COUNT(*) 
                FROM articles 
                WHERE created_at >= datetime('now', '-1 day')
            ''')
            stats['last_24h'] = self.cursor.fetchone()[0]
            
            return stats
        except Exception as e:
            print(f"獲取統計資訊時發生錯誤: {str(e)}")
            return {
                'total_articles': 0,
                'source_count': {},
                'last_24h': 0
            }
    
    def close(self):
        """關閉資料庫連接"""
        self.conn.close()

    def get_word_frequency(self, source=None, days=None, top_n=10):
        """獲取指定條件的詞頻統計
        
        Args:
            source (str): 文章來源
            days (int): 最近幾天
            top_n (int): 返回前N個最常出現的詞
            
        Returns:
            list: 包含 (詞, 頻率) 元組的列表
        """
        try:
            query = "SELECT content FROM articles WHERE 1=1"
            params = []
            
            if source:
                query += " AND source = ?"
                params.append(source)
            
            if days:
                end_date = datetime.now()
                start_date = end_date - timedelta(days=days)
                query += " AND datetime(publish_time) >= datetime(?)"
                params.append(start_date.strftime('%Y-%m-%d'))
            
            self.cursor.execute(query, params)
            articles = [{'content': row[0]} for row in self.cursor.fetchall()]
            
            return analyze_articles(articles, top_n)
        except Exception as e:
            print(f"獲取詞頻統計時發生錯誤: {str(e)}")
            return []

def print_articles(articles):
    """格式化輸出文章列表"""
    if not articles:
        print("沒有找到符合條件的文章")
        return
    
    for article in articles:
        print(f"\n標題: {article[0]}")
        print(f"URL: {article[1]}")
        print(f"發布時間: {article[2]}")
        print(f"來源: {article[3]}")
        print(f"作者: {article[4]}")
        print(f"內容: {article[5][:200]}...")  # 只顯示前200個字符
        print("-" * 50)

def main():
    parser = argparse.ArgumentParser(description='巴哈姆特文章爬蟲')
    parser.add_argument('--crawl', action='store_true', help='執行爬蟲')
    parser.add_argument('--keyword', help='搜尋關鍵字')
    parser.add_argument('--source', help='搜尋來源')
    parser.add_argument('--days', type=int, help='搜尋最近幾天的文章')
    parser.add_argument('--stats', action='store_true', help='顯示統計資訊')
    parser.add_argument('--pages', type=int, default=5, help='要抓取的頁數（預設為5頁）')
    
    args = parser.parse_args()
    
    crawler = PTTDcardCrawler()
    
    try:
        if args.crawl:
            # 抓取巴哈姆特文章
            print("正在抓取巴哈姆特文章...")
            articles = crawler.fetch_articles(args.source, args.source, args.pages)
            crawler.save_articles(articles)
        
        if args.keyword:
            print(f"\n搜尋關鍵字 '{args.keyword}' 的文章：")
            articles = crawler.search_by_keyword(args.keyword)
            print_articles(articles)
        
        if args.source:
            print(f"\n搜尋來源 '{args.source}' 的文章：")
            articles = crawler.search_by_source(args.source)
            print_articles(articles)
        
        if args.days:
            start_date = (datetime.now() - timedelta(days=args.days)).strftime('%Y-%m-%d %H:%M:%S')
            end_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            print(f"\n搜尋最近 {args.days} 天的文章：")
            articles = crawler.search_by_time_range(start_date, end_date)
            print_articles(articles)
        
        if args.stats:
            print("\n統計資訊：")
            stats = crawler.get_statistics()
            print(f"總文章數: {stats.get('total_articles', 0)}")
            print("\n各來源文章數:")
            for source, count in stats.get('source_count', {}).items():
                print(f"{source}: {count}")
            print(f"\n最近24小時文章數: {stats.get('last_24h', 0)}")
        
        if not any([args.crawl, args.keyword, args.source, args.days, args.stats]):
            parser.print_help()
    
    except Exception as e:
        print(f"程式執行時發生錯誤: {str(e)}")
    
    finally:
        crawler.close()

if __name__ == "__main__":
    main() 